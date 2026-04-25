import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MechanicChatService } from './mechanic-chat.service';
import { MechanicChatRequestDto } from './dto/mechanic-chat-request.dto';
import { ConversationService } from '../conversation/conversation.service';

@ApiTags('Mechanic Chat')
@Controller('mechanic-chat')
export class MechanicChatController {
  constructor(
    private readonly mechanicChatService: MechanicChatService,
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
      `Mechanic Chat ${new Date().toLocaleString()}`,
    );

    return conversation.id;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Chat with mechanic assistant about farm machinery' })
  @ApiResponse({ status: 200, description: 'Mechanic chat response with conversation ID' })
  async sendMessage(@Req() req: any, @Body() dto: MechanicChatRequestDto) {
    const conversationId = await this.ensureConversation(
      req.user.id,
      dto.conversationId,
    );

    // Get mechanic chat response
    const { reply } = await this.mechanicChatService.sendMessage(
      req.user.id,
      dto.message,
      dto.asset,
      conversationId,
    );

    // Save user message and mechanic reply to conversation
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
