import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(fieldId: string, userId: string, period: 'month' | 'quarter' | 'year') {
    // Verify field ownership and get user currency
    const field = await this.prisma.field.findFirst({
      where: { id: fieldId, userId },
    });

    if (!field) {
      throw new NotFoundException('Field not found or access denied');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        currency: true,
        currencySymbol: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0, 23, 59, 59);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
    }

    // Get all expenses for the period
    const expenses = await this.prisma.expense.findMany({
      where: {
        fieldId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        animal: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    // Calculate expenses by category
    const expensesByCategory: { [key: string]: { amount: number; percentage: number } } = {};
    let totalExpenses = 0;

    expenses.forEach(expense => {
      const amount = expense.amount ? parseFloat(expense.amount.toString()) : 0;
      totalExpenses += amount;

      const category = this.normalizeCategory(expense.category);
      if (!expensesByCategory[category]) {
        expensesByCategory[category] = { amount: 0, percentage: 0 };
      }
      expensesByCategory[category].amount += amount;
    });

    // Calculate percentages
    Object.keys(expensesByCategory).forEach(category => {
      expensesByCategory[category].percentage = totalExpenses > 0
        ? Math.round((expensesByCategory[category].amount / totalExpenses) * 100)
        : 0;
    });

    // Sort by amount descending
    const sortedExpensesByCategory = Object.entries(expensesByCategory)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    // Get animal sales revenue
    console.log('🔍 DEBUG Finance Dashboard');
    console.log('📅 Period:', period);
    console.log('🕐 Start Date:', startDate.toISOString());
    console.log('🕐 End Date:', endDate.toISOString());
    console.log('🏞️ FieldId:', fieldId);

    // DEBUG: Get ALL sold animals for this USER (ignore fieldId)
    const allSoldAnimalsUser = await this.prisma.animal.findMany({
      where: {
        farmerId: userId,
        status: 'sold',
      },
      select: {
        id: true,
        name: true,
        salePrice: true,
        saleDate: true,
        status: true,
        fieldId: true,
        farmerId: true,
      },
    });
    console.log('🐄 ALL sold animals for this USER:', allSoldAnimalsUser.length);
    console.log('🐄 All user sold animals:', JSON.stringify(allSoldAnimalsUser, null, 2));

    // DEBUG: Get ALL sold animals for this field (ignore date filter)
    const allSoldAnimals = await this.prisma.animal.findMany({
      where: {
        fieldId,
        status: 'sold',
      },
      select: {
        id: true,
        name: true,
        salePrice: true,
        saleDate: true,
        status: true,
        fieldId: true,
      },
    });
    console.log('🐄 ALL sold animals for this field:', allSoldAnimals.length);
    console.log('🐄 All field sold animals data:', JSON.stringify(allSoldAnimals, null, 2));

    // Now filter by date
    const animalSales = await this.prisma.animal.findMany({
      where: {
        fieldId,
        status: 'sold',
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        name: true,
        salePrice: true,
        saleDate: true,
        status: true,
      },
    });

    console.log('🐄 Animals with status=sold in period:', animalSales.length);
    console.log('🐄 Animal Sales Data:', JSON.stringify(animalSales, null, 2));

    const totalRevenue = animalSales.reduce((sum, animal) => {
      const price = animal.salePrice ? parseFloat(animal.salePrice.toString()) : 0;
      console.log(`  - ${animal.name}: ${price} (status: ${animal.status})`);
      return sum + price;
    }, 0);
    const revenueByType = {
      animalSales: {
        count: animalSales.length,
        totalAmount: totalRevenue,
      },
    };

    // Get top 3 costly animals (only active animals)
    const animalCosts = await this.prisma.animal.findMany({
      where: { 
        fieldId,
        status: 'active'  // Exclude sold animals
      },
      include: {
        expenses: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        medicalEvents: {
          where: {
            eventDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });

    const topCostlyAnimals = animalCosts
      .map(animal => {
        let totalCost = 0;
        // Add expenses
        animal.expenses.forEach(exp => {
          const amount = exp.amount ? parseFloat(exp.amount.toString()) : 0;
          totalCost += amount;
        });
        // Add medical costs
        animal.medicalEvents.forEach(me => {
          const cost = me.cost ? parseFloat(me.cost.toString()) : 0;
          totalCost += cost;
        });
        // Add purchase/birth cost if within period
        if (animal.purchaseDate && animal.purchaseDate >= startDate && animal.purchaseDate <= endDate) {
          const purchasePrice = animal.purchasePrice ? parseFloat(animal.purchasePrice.toString()) : 0;
          totalCost += purchasePrice;
        }
        if (animal.lastBirthDate && animal.lastBirthDate >= startDate && animal.lastBirthDate <= endDate) {
          const birthCost = animal.birthCost ? parseFloat(animal.birthCost.toString()) : 0;
          totalCost += birthCost;
        }

        return {
          animalId: animal.id,
          name: animal.name,
          totalCost,
        };
      })
      .filter(animal => animal.totalCost > 0)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 3);

    // Get recent expenses (last 5)
    const recentExpenses = expenses.slice(0, 5).map(expense => ({
      id: expense.id,
      category: this.normalizeCategory(expense.category),
      amount: expense.amount ? parseFloat(expense.amount.toString()) : 0,
      date: expense.date.toISOString().split('T')[0], // YYYY-MM-DD format
      animalName: expense.animal?.name || null,
    }));

    const netBalance = totalRevenue - totalExpenses;

    return {
      period,
      currency: user.currency,
      currencySymbol: user.currencySymbol,
      totalRevenue,
      totalExpenses,
      netBalance,
      expensesByCategory: sortedExpensesByCategory,
      revenueByType,
      topCostlyAnimals,
      recentExpenses,
    };
  }

  async getRevenuesDetails(
    fieldId: string,
    userId: string,
    period: 'month' | 'quarter' | 'year',
    skip: number = 0,
    take: number = 20,
  ) {
    const field = await this.prisma.field.findFirst({
      where: { id: fieldId, userId },
    });

    if (!field) {
      throw new NotFoundException('Field not found');
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0, 23, 59, 59);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
    }

    // Get animal sales
    const revenues = await this.prisma.animal.findMany({
      where: {
        fieldId,
        status: 'sold',
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        name: true,
        salePrice: true,
        saleDate: true,
        buyerName: true,
        saleWeightKg: true,
        animalType: true,
      },
      orderBy: { saleDate: 'desc' },
      skip,
      take,
    });

    const total = await this.prisma.animal.count({
      where: {
        fieldId,
        status: 'sold',
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const mappedRevenues = revenues.map(animal => ({
      id: animal.id,
      animalName: animal.name,
      type: animal.animalType,
      salePrice: animal.salePrice ? parseFloat(animal.salePrice.toString()) : 0,
      saleDate: animal.saleDate,
      buyerName: animal.buyerName,
      saleWeightKg: animal.saleWeightKg,
    }));

    return {
      data: mappedRevenues,
      total,
      skip,
      take,
    };
  }

  async getExpensesDetails(
    fieldId: string,
    userId: string,
    period: 'month' | 'quarter' | 'year',
    skip: number = 0,
    take: number = 20,
  ) {
    const field = await this.prisma.field.findFirst({
      where: { id: fieldId, userId },
    });

    if (!field) {
      throw new NotFoundException('Field not found');
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0, 23, 59, 59);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
    }

    // Get expenses
    const expenses = await this.prisma.expense.findMany({
      where: {
        fieldId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        animal: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      skip,
      take,
    });

    const total = await this.prisma.expense.count({
      where: {
        fieldId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const mappedExpenses = expenses.map(expense => ({
      id: expense.id,
      animalName: expense.animal?.name || 'N/A',
      animalId: expense.animalId,
      category: this.normalizeCategory(expense.category),
      amount: expense.amount ? parseFloat(expense.amount.toString()) : 0,
      date: expense.date,
      description: expense.description,
    }));

    return {
      data: mappedExpenses,
      total,
      skip,
      take,
    };
  }

  private normalizeCategory(category: string): string {
    const cat = category.toLowerCase();
    if (cat.includes('aliment')) return 'feed';
    if (cat.includes('vet') || cat.includes('med')) return 'vet';
    if (cat.includes('medic')) return 'meds';
    if (cat.includes('equip')) return 'equip';
    if (cat.includes('main')) return 'labor';
    return 'other';
  }
}