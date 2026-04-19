import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto } from './expenses.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateExpenseDto) {
    const { fieldId, animalId, amount, category, date, notes, receiptUrl } =
      dto;

    return this.prisma.expense.create({
      data: {
        amount,
        category,
        date: new Date(date),
        description: notes,
        receiptUrl,
        farmer: { connect: { id: userId } },
        field: { connect: { id: fieldId } },
        animal: animalId ? { connect: { id: animalId } } : undefined,
      },
      include: {
        animal: {
          select: { id: true, name: true, nodeId: true, tagNumber: true },
        },
      },
    });
  }

  async findAll(
    userId: string,
    query: {
      fieldId: string;
      category?: string;
      startDate?: string;
      endDate?: string;
      animalId?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const {
      fieldId,
      category,
      startDate,
      endDate,
      animalId,
      limit = 50,
      offset = 0,
    } = query;

    const where: any = {
      farmId: userId,
      fieldId,
    };

    if (category) where.category = category;
    if (animalId) where.animalId = animalId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    return this.prisma.expense.findMany({
      where,
      include: {
        animal: {
          select: { id: true, name: true, nodeId: true, tagNumber: true },
        },
      },
      orderBy: { date: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });
  }

  async update(id: string, userId: string, dto: UpdateExpenseDto) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, farmId: userId },
    });

    if (!expense) throw new NotFoundException('Expense not found');

    const { date, amount, category, notes, receiptUrl, animalId } = dto;

    return this.prisma.expense.update({
      where: { id },
      data: {
        amount,
        category,
        description: notes,
        receiptUrl,
        date: date ? new Date(date) : undefined,
        animal: animalId
          ? { connect: { id: animalId } }
          : animalId === null
            ? { disconnect: true }
            : undefined,
      },
    });
  }

  async delete(id: string, userId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, farmId: userId },
    });

    if (!expense) throw new NotFoundException('Expense not found');

    return this.prisma.expense.delete({ where: { id } });
  }

  async getAnimalSummary(animalId: string, userId: string) {
    const animal = await this.prisma.animal.findFirst({
      where: { id: animalId, farmerId: userId },
      include: {
        medicalEvents: true,
        expenses: true,
        childrenFromMother: true,
      },
    });

    if (!animal) throw new NotFoundException('Animal not found');

    let totalCost = 0;
    const entryCost =
      animal.origin === 'born'
        ? Number(animal.birthCost) || 0
        : Number(animal.purchasePrice) || 0;
    totalCost += entryCost;

    const breakdown = {
      feed: 0,
      vet: 0,
      meds: 0,
      equip: 0,
      labor: 0,
      other: 0,
    };
    const monthlyMap = new Map<string, number>();

    // Process standard expenses
    animal.expenses.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      totalCost += amt;

      const cat = exp.category.toLowerCase();
      if (cat.includes('aliment')) breakdown.feed += amt;
      else if (cat.includes('equip')) breakdown.equip += amt;
      else if (cat.includes('main')) breakdown.labor += amt;
      else if (cat.includes('vet') || cat.includes('med'))
        breakdown.meds += amt;
      else breakdown.other += amt;

      const monthKey = `${exp.date.getFullYear()}-${String(exp.date.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + amt);
    });

    // Process medical events
    animal.medicalEvents.forEach((me) => {
      const amt = Number(me.cost) || 0;
      if (amt > 0) {
        totalCost += amt;
        breakdown.vet += amt;

        const monthKey = `${me.eventDate.getFullYear()}-${String(me.eventDate.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + amt);
      }
    });

    const monthlyTrend = Array.from(monthlyMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const salePrice = Number(animal.salePrice) || 0;
    const margin = animal.status === 'sold' ? salePrice - totalCost : 0;
    const marginPercent =
      totalCost > 0 && animal.status === 'sold'
        ? (margin / totalCost) * 100
        : 0;

    const startD =
      animal.origin === 'born'
        ? animal.lastBirthDate || animal.createdAt
        : animal.purchaseDate || animal.createdAt;
    const endD =
      animal.status === 'sold' && animal.saleDate
        ? animal.saleDate
        : new Date();
    const durationDays = Math.max(
      1,
      Math.floor((endD.getTime() - startD.getTime()) / (1000 * 3600 * 24)),
    );
    const costPerDay = totalCost / durationDays;

    // Descendants (if female)
    const descendantsSummary: any[] = [];
    if (animal.sex === 'female' && animal.childrenFromMother) {
      animal.childrenFromMother.forEach((child) => {
        const childId = child.id;
        // We just return basic info here to avoid deep calculation nestedly
        descendantsSummary.push({
          id: childId,
          name: child.name,
          nodeId: child.nodeId,
          status: child.status,
        });
      });
    }

    return {
      origin: animal.origin,
      purchasePrice: Number(animal.purchasePrice) || null,
      birthCost: Number(animal.birthCost) || null,
      totalCost,
      breakdown,
      salePrice: animal.status === 'sold' ? salePrice : null,
      margin,
      marginPercent,
      durationDays,
      costPerDay,
      monthlyTrend,
      descendantsSummary,
    };
  }
}
