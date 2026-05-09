import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicalEventDto } from './dto/create-medical-event.dto';

@Injectable()
export class MedicalEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(animalId: string, farmerId: string, dto: CreateMedicalEventDto) {
    // Verify ownership
    const animal = await this.prisma.animal.findFirst({
      where: { id: animalId, farmerId },
    });
    if (!animal) throw new NotFoundException('Animal not found or access denied');

    const event = await this.prisma.medicalEvent.create({
      data: {
        animalId,
        eventType: dto.eventType as any,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : new Date(),
        diagnosis: dto.diagnosis,
        treatment: dto.treatment,
        vetName:   dto.vetName,
        cost:      dto.cost,
        notes:     dto.notes,
      },
    });

    // Incrémenter diseaseHistoryCount pour les événements significatifs
    if (['disease', 'surgery', 'treatment'].includes(dto.eventType)) {
      await this.prisma.animal.update({
        where: { id: animalId },
        data: { diseaseHistoryCount: { increment: 1 } },
      });
    }

    return event;
  }

  async findAll(animalId: string, farmerId: string, type?: string) {
    // Verify ownership
    const animal = await this.prisma.animal.findFirst({
      where: { id: animalId, farmerId },
    });
    if (!animal) throw new NotFoundException('Animal not found or access denied');

    return this.prisma.medicalEvent.findMany({
      where: {
        animalId,
        ...(type ? { eventType: type as any } : {}),
      },
      orderBy: { eventDate: 'desc' },
    });
  }

  async update(id: string, farmerId: string, dto: Partial<CreateMedicalEventDto>) {
    // Verify ownership via animal relation
    const event = await this.prisma.medicalEvent.findFirst({
      where: { id },
      include: { animal: { select: { farmerId: true } } },
    });
    if (!event || event.animal.farmerId !== farmerId) {
      throw new NotFoundException('Event not found or access denied');
    }

    return this.prisma.medicalEvent.update({
      where: { id },
      data: {
        ...(dto.eventType  ? { eventType:  dto.eventType as any }          : {}),
        ...(dto.eventDate  ? { eventDate:  new Date(dto.eventDate) }        : {}),
        ...(dto.diagnosis  !== undefined ? { diagnosis:  dto.diagnosis }    : {}),
        ...(dto.treatment  !== undefined ? { treatment:  dto.treatment }    : {}),
        ...(dto.vetName    !== undefined ? { vetName:    dto.vetName }      : {}),
        ...(dto.cost       !== undefined ? { cost:       dto.cost }         : {}),
        ...(dto.notes      !== undefined ? { notes:      dto.notes }        : {}),
      },
    });
  }

  async delete(id: string, farmerId: string) {
    // Verify ownership via animal relation
    const event = await this.prisma.medicalEvent.findFirst({
      where: { id },
      include: { animal: { select: { farmerId: true, id: true } } },
    });
    if (!event || event.animal.farmerId !== farmerId) {
      throw new NotFoundException('Event not found or access denied');
    }

    // Décrémenter diseaseHistoryCount si nécessaire
    if (['disease', 'surgery', 'treatment'].includes(event.eventType)) {
      await this.prisma.animal.update({
        where: { id: event.animalId },
        data: {
          diseaseHistoryCount: {
            decrement: 1,
          },
        },
      });
    }

    return this.prisma.medicalEvent.delete({ where: { id } });
  }
}
