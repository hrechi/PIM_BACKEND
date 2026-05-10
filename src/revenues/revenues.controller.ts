/**
 * ============================================================
 * REVENUES CONTROLLER — Endpoints REST pour les revenus manuels
 * ============================================================
 *
 * Expose les opérations CRUD sur les revenus manuels de l'agriculteur.
 * Tous les endpoints sont protégés par JWT (JwtAuthGuard).
 * L'identité de l'utilisateur est extraite du token JWT via @Req().
 *
 * Routes :
 *   POST   /revenues          → Créer un revenu (montant, catégorie, date)
 *   GET    /revenues          → Lister les revenus d'un champ (avec filtres)
 *   PATCH  /revenues/:id      → Modifier un revenu existant
 *   DELETE /revenues/:id      → Supprimer un revenu
 *
 * Sécurité :
 *   • JwtAuthGuard → vérifie le token Bearer dans le header Authorization
 *   • ValidationPipe → valide le DTO (types, formats, contraintes)
 *   • Ownership check dans le service → un agriculteur ne peut modifier
 *     que ses propres revenus (protection IDOR)
 * ============================================================
 */
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RevenuesService } from './revenues.service';
import { CreateRevenueDto, UpdateRevenueDto } from './revenues.dto';

@ApiTags('revenues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('revenues')
export class RevenuesController {
  constructor(private readonly revenuesService: RevenuesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a manual revenue entry' })
  create(@Req() req, @Body(new ValidationPipe()) dto: CreateRevenueDto) {
    return this.revenuesService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List manual revenues for a field' })
  findAll(
    @Req() req,
    @Query('fieldId') fieldId: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.revenuesService.findAll(req.user.id, {
      fieldId,
      category,
      startDate,
      endDate,
      limit,
      offset,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a revenue entry' })
  update(
    @Req() req,
    @Param('id') id: string,
    @Body(new ValidationPipe()) dto: UpdateRevenueDto,
  ) {
    return this.revenuesService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a revenue entry' })
  delete(@Req() req, @Param('id') id: string) {
    return this.revenuesService.delete(id, req.user.id);
  }
}
