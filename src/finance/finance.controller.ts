import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinanceService } from './finance.service';

@ApiTags('Finance')
@Controller('finance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get financial dashboard for a field' })
  @ApiResponse({
    status: 200,
    description: 'Financial dashboard data',
    schema: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['month', 'quarter', 'year'] },
        currency: { type: 'string' },
        currencySymbol: { type: 'string' },
        totalRevenue: { type: 'number' },
        totalExpenses: { type: 'number' },
        netBalance: { type: 'number' },
        expensesByCategory: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              amount: { type: 'number' },
              percentage: { type: 'number' },
            },
          },
        },
        revenueByType: {
          type: 'object',
          properties: {
            animalSales: {
              type: 'object',
              properties: {
                count: { type: 'number' },
                totalAmount: { type: 'number' },
              },
            },
          },
        },
        topCostlyAnimals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              animalId: { type: 'string' },
              name: { type: 'string' },
              totalCost: { type: 'number' },
            },
          },
        },
        recentExpenses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              category: { type: 'string' },
              amount: { type: 'number' },
              date: { type: 'string' },
              animalName: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
  })
  async getDashboard(
    @Req() req,
    @Query('fieldId') fieldId: string,
    @Query('period') period: 'month' | 'quarter' | 'year' = 'month',
  ) {
    return this.financeService.getDashboard(fieldId, req.user.id, period);
  }

  @Get('revenues')
  @ApiOperation({ summary: 'Get revenues details for a field' })
  @ApiResponse({
    status: 200,
    description: 'Revenues data with pagination',
  })
  async getRevenuesDetails(
    @Req() req,
    @Query('fieldId') fieldId: string,
    @Query('period') period: 'month' | 'quarter' | 'year' = 'month',
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 20,
  ) {
    return this.financeService.getRevenuesDetails(
      fieldId,
      req.user.id,
      period,
      skip,
      take,
    );
  }

  @Get('expenses')
  @ApiOperation({ summary: 'Get expenses details for a field' })
  @ApiResponse({
    status: 200,
    description: 'Expenses data with pagination',
  })
  async getExpensesDetails(
    @Req() req,
    @Query('fieldId') fieldId: string,
    @Query('period') period: 'month' | 'quarter' | 'year' = 'month',
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 20,
  ) {
    return this.financeService.getExpensesDetails(
      fieldId,
      req.user.id,
      period,
      skip,
      take,
    );
  }
}
