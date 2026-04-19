import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MechanicChatController } from './mechanic-chat.controller';
import { MechanicChatService } from './mechanic-chat.service';
import { ConversationModule } from '../conversation/conversation.module';

@Module({
  imports: [ConfigModule, ConversationModule],
  controllers: [MechanicChatController],
  providers: [MechanicChatService],
})
export class MechanicChatModule {}
