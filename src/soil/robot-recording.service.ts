import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import AdmZip = require('adm-zip');
import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
}
const FFMPEG_BINARY_PATH: string | null =
  (ffmpegStatic as unknown as string | null) ?? null;

/**
 * Result of converting a Flutter-uploaded robot recording (.zip of JPEG
 * frames + manifest.json) into an MP4 + a representative still frame.
 */
export interface AssembledRecording {
  /** Absolute path to the produced MP4 on disk. */
  mp4FilePath: string;
  /** Absolute path to the JPEG frame chosen for AI classification. */
  posterFramePath: string;
  /** Number of frames in the recording. */
  frameCount: number;
  /** Wall-clock duration of the recording, in milliseconds. */
  durationMs: number;
  /** Effective frame rate used to assemble the MP4. */
  fps: number;
}

interface RecordingManifest {
  robotId?: string;
  frameCount?: number;
  durationMs?: number;
  timestampsMs?: number[];
}

/**
 * Turns a `.zip` recording produced by the Flutter robot capture screen
 * into a real MP4 file using the bundled `ffmpeg-static` binary, and
 * picks a middle frame as the still that the AI classifier will run on.
 *
 * The zip is expected to contain `frame_00000.jpg`, `frame_00001.jpg`,
 * ... and an optional `manifest.json` with per-frame timestamps.
 */
@Injectable()
export class RobotRecordingService {
  private readonly logger = new Logger(RobotRecordingService.name);

  /**
   * @param zipFilePath Absolute path to the uploaded `.zip` (will be left in place).
   * @param targetMp4Path Absolute path where the resulting MP4 should be written.
   * @param defaultFps  Fallback FPS when the manifest lacks timing data.
   */
  async assembleFromZip(
    zipFilePath: string,
    targetMp4Path: string,
    defaultFps = 10,
  ): Promise<AssembledRecording> {
    const workDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'soil-rec-'),
    );

    try {
      // 1) Unzip frames to a private temp dir.
      const zip = new AdmZip(zipFilePath);
      zip.extractAllTo(workDir, /* overwrite */ true);

      // 2) Discover frames + read manifest if present.
      const allEntries = await fs.promises.readdir(workDir);
      const frameRegex = /^frame_\d+\.(jpg|jpeg|png)$/i;
      const frameNames = allEntries.filter((n) => frameRegex.test(n)).sort();
      if (frameNames.length === 0) {
        throw new Error(
          'Robot recording zip contained no frame_*.{jpg,png} entries',
        );
      }
      const frameExt = path
        .extname(frameNames[0])
        .toLowerCase()
        .replace(/^\./, ''); // 'jpg' | 'jpeg' | 'png'
      const ffmpegExt = frameExt === 'jpeg' ? 'jpg' : frameExt;

      let durationMs = 0;
      const manifestPath = path.join(workDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const raw = await fs.promises.readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(raw) as RecordingManifest;
          if (typeof manifest.durationMs === 'number') {
            durationMs = manifest.durationMs;
          }
        } catch (e) {
          this.logger.warn(`Manifest unreadable, ignoring: ${String(e)}`);
        }
      }

      const fps =
        durationMs > 0
          ? Math.max(1, Math.round((frameNames.length * 1000) / durationMs))
          : defaultFps;

      // 3) Pick a middle frame as the AI input (representative still).
      const middleIndex = Math.floor(frameNames.length / 2);
      const posterFramePath = path.join(workDir, frameNames[middleIndex]);
      // Copy poster outside workDir so the caller can use it after we
      // clean up. Keep the original extension so the AI service can
      // identify the format.
      const posterFinal = targetMp4Path.replace(
        /\.mp4$/i,
        `.${frameExt}`,
      );
      await fs.promises.copyFile(posterFramePath, posterFinal);

      // 4) Encode MP4 with ffmpeg via image-sequence input.
      const inputPattern = path.join(workDir, `frame_%05d.${ffmpegExt}`);
      this.logger.log(
        `Assembling MP4: frames=${frameNames.length} ext=${frameExt} fps=${fps} ` +
          `pattern=${inputPattern} ffmpeg=${FFMPEG_BINARY_PATH ?? '(system)'}`,
      );
      let ffmpegStderr = '';
      let ffmpegCmd = '';
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(inputPattern)
          .inputOptions([`-framerate ${fps}`, '-start_number 0'])
          .videoCodec('libx264')
          .outputOptions([
            '-pix_fmt yuv420p',
            '-movflags +faststart',
            // Make sure even widths/heights for h264.
            '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2',
          ])
          .on('start', (cmd: string) => {
            ffmpegCmd = cmd;
            this.logger.debug(`ffmpeg cmd: ${cmd}`);
          })
          .on('stderr', (line: string) => {
            ffmpegStderr += `${line}\n`;
          })
          .on('error', (err: Error) => {
            this.logger.error(
              `ffmpeg failed: ${err.message}\n` +
                `cmd: ${ffmpegCmd}\n` +
                `stderr (last 1KB): ${ffmpegStderr.slice(-1024)}`,
            );
            reject(
              new Error(
                `${err.message} | ${ffmpegStderr.slice(-512).trim() || 'no stderr'}`,
              ),
            );
          })
          .on('end', () => resolve())
          .save(targetMp4Path);
      });

      const fileSize = (await fs.promises.stat(targetMp4Path)).size;
      this.logger.log(
        `Assembled MP4 from ${frameNames.length} frames @ ${fps} fps ` +
          `(${(fileSize / 1024).toFixed(1)} KB) -> ${targetMp4Path}`,
      );

      return {
        mp4FilePath: targetMp4Path,
        posterFramePath: posterFinal,
        frameCount: frameNames.length,
        durationMs:
          durationMs > 0
            ? durationMs
            : Math.round((frameNames.length / fps) * 1000),
        fps,
      };
    } finally {
      // Best-effort cleanup of the temp extraction directory.
      try {
        await fs.promises.rm(workDir, { recursive: true, force: true });
      } catch (e) {
        this.logger.warn(`Failed to clean ${workDir}: ${String(e)}`);
      }
    }
  }
}
