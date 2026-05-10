import {
  Controller,
  Get,
  Delete,
  Param,
  NotFoundException,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';

const ADMIN_TOKEN = Buffer.from('admin@fidly.com:admin123').toString('base64');

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** GET /api/admin/ratings — Get all ratings (admin only) */
  @Get('ratings')
  @ApiOperation({ summary: 'Get all app ratings (admin only)' })
  async getAllRatings(@Headers('authorization') auth: string) {
    this.checkToken(auth);
    return this.adminService.getAllRatings();
  }

  /** DELETE /api/admin/ratings/:id — Delete a rating by ID (admin only) */
  @Delete('ratings/:id')
  @ApiOperation({ summary: 'Delete a rating by ID (admin only)' })
  async deleteRating(@Headers('authorization') auth: string, @Param('id') id: string) {
    this.checkToken(auth);
    const deleted = await this.adminService.deleteRating(id);
    if (!deleted) {
      throw new NotFoundException('Rating not found');
    }
    return { message: 'Rating deleted successfully', id };
  }

  private checkToken(auth: string) {
    const token = auth?.replace(/^Bearer\s+/i, '');
    if (token !== ADMIN_TOKEN) {
      throw new UnauthorizedException('Invalid admin token');
    }
  }
}
