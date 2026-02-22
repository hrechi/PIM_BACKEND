import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationService {
  constructor(private readonly prismaService: PrismaService) {}

  async createConversation(
    userId: string,
    title: string = 'New Conversation',
  ) {
    return this.prismaService.conversation.create({
      data: {
        userId,
        title,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async getConversations(userId: string) {
    return this.prismaService.conversation.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getConversationById(conversationId: string, userId: string) {
    return this.prismaService.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async updateConversationTitle(
    conversationId: string,
    userId: string,
    title: string,
  ) {
    return this.prismaService.conversation.updateMany({
      where: {
        id: conversationId,
        userId,
      },
      data: {
        title,
      },
    });
  }

  async deleteConversation(conversationId: string, userId: string) {
    return this.prismaService.conversation.deleteMany({
      where: {
        id: conversationId,
        userId,
      },
    });
  }

  async addMessageToConversation(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
  ) {
    return this.prismaService.chatMessage.create({
      data: {
        conversationId,
        role,
        content,
      },
    });
  }

  async getConversationMessages(conversationId: string, userId: string) {
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return conversation?.messages || [];
  }
}
