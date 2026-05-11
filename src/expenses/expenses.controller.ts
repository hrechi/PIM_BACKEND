import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './expenses.dto';

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new expense' })
  create(@Req() req, @Body(new ValidationPipe()) dto: CreateExpenseDto) {
    return this.expensesService.create(req.user.id, dto);
  }

  @Post('upload-receipt')
  @ApiOperation({ summary: 'Upload a receipt image for an expense' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'receipts'),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `receipt-${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|webp|pdf)$/i;
        if (!allowed.test(file.originalname)) {
          return cb(new BadRequestException('Only images and PDF are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  uploadReceipt(@Req() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = `/uploads/receipts/${file.filename}`;
    return { receiptUrl: url };
  }

  @Get()
  @ApiOperation({ summary: 'List expenses for a field' })
  findAll(
    @Req() req,
    @Query('fieldId') fieldId: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('animalId') animalId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.expensesService.findAll(req.user.id, {
      fieldId,
      category,
      startDate,
      endDate,
      animalId,
      limit,
      offset,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an expense' })
  update(
    @Req() req,
    @Param('id') id: string,
    @Body(new ValidationPipe()) dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an expense' })
  delete(@Req() req, @Param('id') id: string) {
    return this.expensesService.delete(id, req.user.id);
  }

  @Get('animal-summary/:animalId')
  @ApiOperation({ summary: 'Get financial summary for an animal' })
  getAnimalSummary(@Req() req, @Param('animalId') animalId: string) {
    return this.expensesService.getAnimalSummary(animalId, req.user.id);
  }
}
