import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Req,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('User')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns the user profile' })
  async getProfile(@Req() req: any) {
    return this.userService.getProfile(req.user.id, req.user);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile fields' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 409, description: 'Email or phone already in use' })
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(req.user.id, dto, req.user);
  }

  @Post('profile/picture')
  @ApiOperation({ summary: 'Upload a profile picture' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (jpg, png, webp — max 5 MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Profile picture uploaded' })
  @ApiResponse({ status: 422, description: 'Invalid file type or size' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          // Fall back to .jpg if the client didn't send an extension.
          const ext = (extname(file.originalname) || '.jpg').toLowerCase();
          cb(null, `profile-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        // Validate by extension because Flutter's MultipartFile.fromPath
        // sends `application/octet-stream` for many image types.
        const allowed = [
          '.jpg',
          '.jpeg',
          '.png',
          '.webp',
          '.gif',
          '.bmp',
          '.heic',
          '.heif',
          '.tiff',
          '.tif',
          '.avif',
        ];
        const ext = extname(file.originalname).toLowerCase();
        const mimeOk = (file.mimetype || '').toLowerCase().startsWith('image/');
        if (allowed.includes(ext) || mimeOk) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Unsupported image type. Allowed: ${allowed.join(', ')}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadProfilePicture(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const filePath = `/uploads/${file.filename}`;
    return this.userService.updateProfilePicture(req.user.id, filePath, req.user);
  }

  @Post('fcm-token')
  @ApiOperation({ summary: 'Save device FCM token for push notifications' })
  @ApiResponse({ status: 201, description: 'FCM token saved' })
  async saveFcmToken(@Req() req: any, @Body() body: { token: string }) {
    return this.userService.saveFcmToken(req.user.id, body.token, req.user);
  }

  @Delete('profile')
  @ApiOperation({ summary: 'Delete user account permanently' })
  @ApiResponse({ status: 200, description: 'Account deleted' })
  async deleteAccount(@Req() req: any) {
    return this.userService.deleteAccount(req.user.id);
  }
}
