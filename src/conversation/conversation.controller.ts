import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationService } from './conversation.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ConversationController {
  constructor(private conversationService: ConversationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  async createConversation(
    @Req() req: any,
    @Body() body: { title?: string },
  ) {
    return this.conversationService.createConversation(
      req.user.id,
      body.title,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all conversations for user' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async getConversations(@Req() req: any) {
    return this.conversationService.getConversations(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific conversation with messages' })
  @ApiResponse({ status: 200, description: 'Conversation with messages' })
  async getConversation(
    @Param('id') conversationId: string,
    @Req() req: any,
  ) {
    return this.conversationService.getConversationById(conversationId, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update conversation title' })
  @ApiResponse({ status: 200, description: 'Conversation updated' })
  async updateConversation(
    @Param('id') conversationId: string,
    @Req() req: any,
    @Body() body: { title: string },
  ) {
    return this.conversationService.updateConversationTitle(
      conversationId,
      req.user.id,
      body.title,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete conversation' })
  @ApiResponse({ status: 200, description: 'Conversation deleted' })
  async deleteConversation(
    @Param('id') conversationId: string,
    @Req() req: any,
  ) {
    await this.conversationService.deleteConversation(conversationId, req.user.id);
    return { message: 'Conversation deleted successfully' };
  }
}
