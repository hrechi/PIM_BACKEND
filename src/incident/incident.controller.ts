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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IncidentService } from './incident.service';
import { CreateIncidentDto } from './dto/create-incident.dto';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Validate file extension (case-insensitive, includes iOS HEIC)
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(`Invalid file type "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
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

  @Get(':id')
  async getIncidentById(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.incidentService.getIncidentById(id, userId);
  }

  @Delete(':id')
  async deleteIncident(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.incidentService.deleteIncident(id, userId);
  }
}
