import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConversationModule } from '../conversation/conversation.module';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [ConfigModule, PrismaModule, ConversationModule, GeoModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
