import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';

@Injectable()
export class IncidentService {
  constructor(private prisma: PrismaService) {}

  async createIncident(
    userId: string,
    createIncidentDto: CreateIncidentDto,
    imagePath: string,
  ) {
    return this.prisma.securityIncident.create({
      data: {
        type: createIncidentDto.type,
        imagePath,
        userId,
      },
    });
  }

  async getAllIncidents(userId: string) {
    return this.prisma.securityIncident.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async deleteIncident(id: string, userId: string) {
    return this.prisma.securityIncident.deleteMany({
      where: { id, userId },
    });
  }
}
