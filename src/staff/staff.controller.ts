import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileValidator,
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
import { StaffService } from './staff.service';
import { AddStaffDto } from './dto/add-staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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

@ApiTags('Staff Whitelist')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('staff')
export class StaffController {
  constructor(private staffService: StaffService) {}

  @Post()
  @ApiOperation({ summary: 'Add a staff member to the whitelist' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'image'],
      properties: {
        name: { type: 'string', description: 'Staff member name' },
        image: { type: 'string', format: 'binary', description: 'Face photo (jpg, png, webp — max 5 MB)' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Staff member added to whitelist' })
  @ApiResponse({ status: 422, description: 'Invalid file type or size' })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/whitelist',
        filename: (_req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `staff-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async addStaff(
    @Req() req: any,
    @Body() dto: AddStaffDto,
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
    const imagePath = `/uploads/whitelist/${file.filename}`;
    return this.staffService.addStaff(req.user.id, dto.name, imagePath);
  }

  @Get()
  @ApiOperation({ summary: 'Get all whitelisted staff for current user' })
  @ApiResponse({ status: 200, description: 'Returns the staff whitelist' })
  async getAllStaff(@Req() req: any) {
    return this.staffService.getAllStaff(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a staff member from the whitelist' })
  @ApiResponse({ status: 200, description: 'Staff member removed' })
  @ApiResponse({ status: 404, description: 'Staff member not found' })
  async deleteStaff(@Req() req: any, @Param('id') staffId: string) {
    return this.staffService.deleteStaff(req.user.id, staffId);
  }
}
