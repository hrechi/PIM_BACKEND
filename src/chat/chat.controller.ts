import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Chat with Fieldly assistant' })
  @ApiResponse({ status: 200, description: 'Chat response with conversation ID' })
  async chat(@Req() req: any, @Body() dto: ChatRequestDto) {
    let conversationId: string = dto.conversationId || '';

    // Create new conversation if not provided
    if (!conversationId) {
      const conversation = await this.conversationService.createConversation(
        req.user.id,
        `Chat ${new Date().toLocaleString()}`,
      );
      conversationId = conversation.id;
    }

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
}


