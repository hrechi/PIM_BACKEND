import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuizService } from './quiz.service';

@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generateQuiz(@Body() body: { parcelId?: string }, @Request() req) {
    return this.quizService.generateQuiz(body.parcelId, req.user.userId);
  }
}
