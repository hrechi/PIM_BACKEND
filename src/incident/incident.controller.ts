import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FileValidator } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IncidentService } from './incident.service';
import { CreateIncidentDto } from './dto/create-incident.dto';

// Custom file extension validator (more reliable than MIME type on mobile)
class ImageFileValidator extends FileValidator {
  private allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  isValid(file: Express.Multer.File): boolean {
    const ext = extname(file.originalname).toLowerCase();
    return this.allowedExtensions.includes(ext);
  }

  buildErrorMessage(): string {
    return 'Only image files (jpg, jpeg, png, webp) are allowed';
  }
}

@Controller('security/incidents')
@UseGuards(JwtAuthGuard)
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/incidents',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `incident-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async createIncident(
    @Req() req: any,
    @Body() createIncidentDto: CreateIncidentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 MB
          new ImageFileValidator({}),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const userId = req.user.id;
    const imagePath = `/uploads/incidents/${file.filename}`;

    return this.incidentService.createIncident(
      userId,
      createIncidentDto,
      imagePath,
    );
  }

  @Get()
  async getAllIncidents(@Req() req: any) {
    const userId = req.user.id;
    return this.incidentService.getAllIncidents(userId);
  }

  @Delete(':id')
  async deleteIncident(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.incidentService.deleteIncident(id, userId);
  }
}
