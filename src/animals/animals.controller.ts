import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AnimalsService } from './animals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SellAnimalDto, SetFatteningDto } from './animals.dto';
import { RolesGuard } from '../auth/guards/roles.guard';

// Ensure upload directory exists at module load time
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'animals');
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log(`[Animals] Created upload directory: ${UPLOAD_DIR}`);
}

@Controller('animals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnimalsController {
  constructor(private readonly animalsService: AnimalsService) {}

  @Post(':nodeId/upload-photo')
  @UseInterceptors(FileInterceptor('photo', {
    storage: diskStorage({
      destination: UPLOAD_DIR, // absolute path — no ambiguity
      filename: (req, file, cb) => {
        const ext = extname(file.originalname) || '.jpg'; // fallback to .jpg
        const filename = `${uuidv4()}${ext}`;
        console.log(`[Animals] Saving photo: ${filename}, mimetype: ${file.mimetype}`);
        cb(null, filename);
      },
    }),
    fileFilter: (req, file, cb) => {
      console.log(`[Animals] fileFilter mimetype: ${file.mimetype}`);
      // Accept any image or octet-stream (Flutter may not set MIME correctly)
      const ok = file.mimetype.startsWith('image/') ||
                 file.mimetype === 'application/octet-stream';
      if (!ok) {
        return cb(new BadRequestException(`Images only (received: ${file.mimetype})`), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadPhoto(
    @Param('nodeId') nodeId: string,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log(`[Animals] uploadPhoto called — nodeId: ${nodeId}, file: ${file?.filename}`);
    if (!file) throw new BadRequestException('No file uploaded');
    return this.animalsService.updateProfileImage(
      nodeId,
      req.user.id,
      `/uploads/animals/${file.filename}`,
    );
  }

  @Post()
  create(@Body() data: any, @Req() req: any) {
    return this.animalsService.create(data, req.user.id);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('animalType') animalType?: string,
    @Query('fieldId') fieldId?: string,
    @Query('isFattening') isFattening?: string,
  ) {
    const fatteningFilter =
      isFattening === 'true' ? true : isFattening === 'false' ? false : undefined;
    return this.animalsService.findAllByFarmer(
      req.user.id,
      animalType,
      fieldId,
      fatteningFilter,
    );
  }

  @Get('for-sale')
  getForSaleAnimals(@Req() req: any, @Query('fieldId') fieldId?: string) {
    return this.animalsService.findForSaleByFarmer(req.user.id, fieldId);
  }

  @Get('sold')
  getSoldAnimals(@Req() req: any, @Query('fieldId') fieldId?: string) {
    return this.animalsService.getSoldAnimals(req.user.id, fieldId);
  }

  @Get('id/:id')
  findById(@Req() req: any, @Param('id') id: string) {
    return this.animalsService.findById(id, req.user.id);
  }

  @Get('stats')
  getStats(@Req() req: any, @Query('fieldId') fieldId?: string) {
    return this.animalsService.getStatistics(req.user.id, fieldId);
  }

  @Patch(':nodeId')
  update(@Param('nodeId') nodeId: string, @Body() data: any, @Req() req: any) {
    return this.animalsService.update(nodeId, data, req.user.id);
  }

  @Patch(':nodeId/set-fattening')
  setFattening(
    @Param('nodeId') nodeId: string,
    @Body() data: SetFatteningDto,
    @Req() req: any,
  ) {
    return this.animalsService.setFattening(nodeId, data, req.user.id);
  }

  @Patch(':nodeId/sell')
  sell(
    @Param('nodeId') nodeId: string,
    @Body() data: SellAnimalDto,
    @Req() req: any,
  ) {
    return this.animalsService.sell(nodeId, data, req.user.id);
  }

  @Patch(':nodeId/cancel-sale')
  cancelSale(@Param('nodeId') nodeId: string, @Req() req: any) {
    return this.animalsService.cancelSale(nodeId, req.user.id);
  }

  @Delete(':nodeId')
  remove(@Param('nodeId') nodeId: string, @Req() req: any) {
    return this.animalsService.remove(nodeId, req.user.id);
  }
}
