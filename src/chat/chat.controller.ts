import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ConversationService } from '../conversation/conversation.service';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly conversationService: ConversationService,
  ) {}

  private async ensureConversation(
    userId: string,
    conversationId?: string,
  ): Promise<string> {
    if (conversationId) {
      return conversationId;
    }

    const conversation = await this.conversationService.createConversation(
      userId,
      `Chat ${new Date().toLocaleString()}`,
    );

    return conversation.id;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Chat with Fieldly assistant' })
  @ApiResponse({
    status: 200,
    description: 'Chat response with conversation ID',
  })
  async chat(@Req() req: any, @Body() dto: ChatRequestDto) {
    const conversationId = await this.ensureConversation(
      req.user.id,
      dto.conversationId,
    );

    // Get chat response
    const { reply } = await this.chatService.chat(
      req.user.id,
      dto.message,
      conversationId,
    );

    // Save user message and assistant reply to conversation
    await Promise.all([
      this.conversationService.addMessageToConversation(
        conversationId,
        'user',
        dto.message,
      ),
      this.conversationService.addMessageToConversation(
        conversationId,
        'assistant',
        reply,
      ),
    ]);

    return { reply, conversationId };
  }

  @UseGuards(JwtAuthGuard)
  @Post('voice')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Voice chat with Fieldly assistant (Claude)' })
  @ApiResponse({ status: 200, description: 'Voice chat response with conversation ID' })
  async voiceChat(@Req() req: any, @Body() dto: ChatRequestDto) {
    const conversationId = await this.ensureConversation(
      req.user.id,
      dto.conversationId,
    );

    const { reply, languageCode } = await this.chatService.voiceChat(
      req.user.id,
      dto.message,
      conversationId,
      dto.languageCode,
    );

    await Promise.all([
      this.conversationService.addMessageToConversation(
        conversationId,
        'user',
        dto.message,
      ),
      this.conversationService.addMessageToConversation(
        conversationId,
        'assistant',
        reply,
      ),
    ]);

    return { reply, conversationId, languageCode };
  }
}
