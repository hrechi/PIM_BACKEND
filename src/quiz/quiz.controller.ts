import { Controller, Post, Get, Body, UseGuards, Request, Param } from '@nestjs/common';
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

  @Get('skills/paths')
  @ApiOperation({ summary: 'Get all skill certification paths with user progress' })
  async getSkillPaths(@Request() req) {
    return this.quizService.getSkillPaths(req.user.id);
  }

  @Get('skills/paths/:pathId')
  @ApiOperation({ summary: 'Get one skill path with lesson-level progress' })
  async getSkillPathDetails(@Request() req, @Param('pathId') pathId: string) {
    return this.quizService.getSkillPathDetails(req.user.id, pathId);
  }

  @Post('skills/lessons/:lessonId/generate')
  @ApiOperation({ summary: 'Generate multilingual competency quiz for a lesson' })
  async generateSkillLessonQuiz(
    @Request() req,
    @Param('lessonId') lessonId: string,
    @Body('languageCode') languageCode?: string,
    @Body('questionCount') questionCount?: number,
  ) {
    return this.quizService.generateSkillLessonQuiz(
      req.user.id,
      lessonId,
      languageCode,
      questionCount,
    );
  }

  @Post('skills/lessons/:lessonId/submit')
  @ApiOperation({ summary: 'Submit lesson quiz answers and update competency progress' })
  async submitSkillLessonQuiz(
    @Request() req,
    @Param('lessonId') lessonId: string,
    @Body('languageCode') languageCode: string | undefined,
    @Body('questions') questions: any[],
    @Body('answers') answers: string[],
  ) {
    return this.quizService.submitSkillLessonQuiz(req.user.id, lessonId, {
      languageCode,
      questions,
      answers,
    });
  }

  @Get('skills/progress')
  @ApiOperation({ summary: 'Get overall skill certification progress' })
  async getSkillProgress(@Request() req) {
    return this.quizService.getSkillProgressOverview(req.user.id);
  }
}
