import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Quiz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new AI farm quiz' })
  async generate(
    @Request() req,
    @Body('parcelId') parcelId?: string,
    @Body('questionCount') questionCount?: number,
    @Body('difficulty') difficulty?: string,
  ) {
    return this.quizService.generateQuiz(req.user.id, parcelId, questionCount, difficulty);
  }

  @Post('save')
  @ApiOperation({ summary: 'Save quiz results and check for badges' })
  async save(
    @Request() req,
    @Body('score') score: number,
    @Body('totalQuestions') totalQuestions: number,
    @Body('topic') topic: string,
    @Body('parcelId') parcelId?: string,
  ) {
    return this.quizService.saveResult(req.user.id, score, totalQuestions, topic, parcelId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user quiz statistics and badges' })
  async getStats(@Request() req) {
    return this.quizService.getStats(req.user.id);
  }
}
