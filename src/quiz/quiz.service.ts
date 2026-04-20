import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface AnthropicResponse {
  content?: Array<{ type?: string; text?: string }>;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  aiExplanation: string;
  parcelAdvice?: string;
  topic: string;
}

interface SkillLessonSeed {
  code: string;
  title: string;
  summary: string;
  microContent: string;
  skillTag: string;
  estimatedMinutes: number;
  sortOrder: number;
}

interface SkillPathSeed {
  code: string;
  title: string;
  description: string;
  icon: string;
  gradientStart: string;
  gradientEnd: string;
  difficulty: string;
  estimatedMinutes: number;
  sortOrder: number;
  lessons: SkillLessonSeed[];
}

@Injectable()
export class QuizService {
  private readonly skillCatalogSeed: SkillPathSeed[] = [
    {
      code: 'PRUNING_FOUNDATIONS',
      title: 'Pruning Mastery Path',
      description:
        'Learn timing, cuts, and canopy strategy to improve plant vigor and fruit quality.',
      icon: 'content_cut',
      gradientStart: '#0B7A52',
      gradientEnd: '#38A169',
      difficulty: 'INTERMEDIATE',
      estimatedMinutes: 40,
      sortOrder: 1,
      lessons: [
        {
          code: 'PRUNE_TYPES_AND_GOALS',
          title: 'Pruning Goals & Cut Types',
          summary: 'Understand structural, maintenance, and renewal pruning.',
          microContent:
            'Identify deadwood first, then thin dense sections to improve airflow. Use clean angled cuts slightly above outward buds. Avoid excessive pruning in hot periods to limit stress.',
          skillTag: 'pruning',
          estimatedMinutes: 12,
          sortOrder: 1,
        },
        {
          code: 'PRUNE_TIMING_SEASON',
          title: 'Seasonal Timing for Pruning',
          summary: 'Pick the right pruning windows by crop and growth stage.',
          microContent:
            'Dormant-season pruning supports structure, while light summer pruning controls vigor. Delay heavy cuts before heatwaves or disease spikes. Document each pass to compare yield outcomes.',
          skillTag: 'pruning',
          estimatedMinutes: 14,
          sortOrder: 2,
        },
        {
          code: 'PRUNE_SAFETY_AND_SANITATION',
          title: 'Tool Safety & Sanitation',
          summary: 'Prevent injuries and disease spread during pruning.',
          microContent:
            'Disinfect blades between diseased plants, wear eye protection, and keep tools sharp for clean cuts. Use stable footing on slopes and never overreach from ladders.',
          skillTag: 'safety',
          estimatedMinutes: 10,
          sortOrder: 3,
        },
      ],
    },
    {
      code: 'SAFE_SPRAYING_PATH',
      title: 'Safe Spraying Certification',
      description:
        'Master pre-spray checks, PPE, calibration, and environmental safety.',
      icon: 'health_and_safety',
      gradientStart: '#0F766E',
      gradientEnd: '#06B6D4',
      difficulty: 'ADVANCED',
      estimatedMinutes: 50,
      sortOrder: 2,
      lessons: [
        {
          code: 'SPRAY_PPE_AND_LABELS',
          title: 'PPE and Product Label Reading',
          summary: 'Select proper protection and decode label constraints.',
          microContent:
            'Always match gloves, respirator filters, and coveralls to product label requirements. Labels specify mixing ratios, re-entry intervals, and drift warnings that must be followed precisely.',
          skillTag: 'safe_spraying',
          estimatedMinutes: 15,
          sortOrder: 1,
        },
        {
          code: 'SPRAY_CALIBRATION',
          title: 'Sprayer Calibration Basics',
          summary: 'Calibrate nozzles and speed to avoid over/under-application.',
          microContent:
            'Check nozzle wear, pressure consistency, and travel speed. Recalibrate after changing nozzles or tank mix viscosity. Uneven application wastes product and can damage crops.',
          skillTag: 'safe_spraying',
          estimatedMinutes: 15,
          sortOrder: 2,
        },
        {
          code: 'SPRAY_DRIFT_MANAGEMENT',
          title: 'Drift & Environmental Protection',
          summary: 'Reduce drift risk and protect water and pollinators.',
          microContent:
            'Avoid spraying under strong winds or temperature inversions. Maintain buffers near waterways and beehives. Stop operations when weather shifts beyond label limits.',
          skillTag: 'safe_spraying',
          estimatedMinutes: 12,
          sortOrder: 3,
        },
      ],
    },
    {
      code: 'MILKING_HYGIENE_PATH',
      title: 'Milking Hygiene Path',
      description:
        'Improve milk quality by standardizing hygiene, sequence, and post-milking controls.',
      icon: 'science',
      gradientStart: '#1E3A8A',
      gradientEnd: '#0EA5E9',
      difficulty: 'FOUNDATIONAL',
      estimatedMinutes: 35,
      sortOrder: 3,
      lessons: [
        {
          code: 'MILK_PREP_WORKFLOW',
          title: 'Udder Prep Workflow',
          summary: 'Apply a consistent pre-milking cleaning protocol.',
          microContent:
            'Use pre-dip, wipe with clean single-use towels, and inspect first streams to detect anomalies. Consistent prep lowers contamination and supports animal comfort.',
          skillTag: 'milking_hygiene',
          estimatedMinutes: 10,
          sortOrder: 1,
        },
        {
          code: 'MILK_MACHINE_HYGIENE',
          title: 'Machine & Cluster Hygiene',
          summary: 'Sanitize clusters and pipelines to maintain quality.',
          microContent:
            'Rinse and sanitize according to manufacturer cycle temperatures. Replace worn liners and check vacuum stability daily. Residues increase bacterial loads and spoilage risk.',
          skillTag: 'milking_hygiene',
          estimatedMinutes: 12,
          sortOrder: 2,
        },
        {
          code: 'MILK_POST_DIP_AND_RECORDS',
          title: 'Post-Milking Care & Recording',
          summary: 'Close with post-dip and log quality indicators.',
          microContent:
            'Apply post-dip immediately, monitor somatic indicators, and log deviations by animal group. Good records help identify process faults early.',
          skillTag: 'milking_hygiene',
          estimatedMinutes: 10,
          sortOrder: 3,
        },
      ],
    },
  ];

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async generateQuiz(
    farmerId: string,
    parcelId?: string,
    questionCount = 5,
    difficulty = 'medium',
  ): Promise<QuizQuestion[]> {
    let parcelContext = '';
    if (parcelId) {
      const parcel = await this.prisma.parcel.findFirst({
        where: { id: parcelId, farmerId },
        include: {
          crops: { orderBy: { plantingDate: 'desc' }, take: 1 },
          fertilizations: { orderBy: { applicationDate: 'desc' }, take: 1 },
          pests: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });

      if (parcel) {
        parcelContext = `
PARCEL DATA:
- Location: ${parcel.location}
- Soil: ${parcel.soilType}
- Ph: ${parcel.soilPh ?? 'Unknown'}
- Crops: ${parcel.crops.map((c) => `${c.cropName} (${c.variety})`).join(', ') || 'None'}
- Latest Pest: ${parcel.pests[0]?.issueType || 'None'}
- Latest Fertilizer: ${parcel.fertilizations[0]?.fertilizerType || 'None'}
        `.trim();
      }
    }

    const apiKey = this.config.get<string>('GROQ_API_KEY');
    const apiUrl = this.config.get<string>('GROQ_URL') ?? 'https://api.groq.com/openai/v1/chat/completions';
    const model = this.config.get<string>('GROQ_MODEL') ?? 'llama-3.1-8b-instant';

    if (!apiKey) {
      return this.getFallbackQuestions(parcelId);
    }

    const prompt = `
You are an expert agronomist. Generate exactly ${questionCount} multiple-choice questions for a farm quiz.
Difficulty: ${difficulty}
Topics to choose from: soil health, irrigation, pests, fertilization, crop rotation, economics.

Return ONLY a JSON array of objects with this schema:
[
  {
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "correctAnswer": "...",
    "aiExplanation": "...",
    "parcelAdvice": "...",
    "topic": "..."
  }
]

${parcelContext ? `CONTEXTUAL DATA FOR PARCEL ADVICE:\n${parcelContext}\nGive specific parcelAdvice only related to this parcel. If the question isn't directly related, provide general improvement tips for this specific parcel configuration.` : 'Provide general parcelAdvice (tips).'}

Ensure the correctAnswer is exactly one of the options. Keep it educational and engaging.
    `.trim();

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) throw new Error('API Error');

      const data = (await response.json()) as GroqResponse;
      const content = data.choices?.[0]?.message?.content?.trim() || '';
      
      // Clean potential markdown or extra text
      const jsonStart = content.indexOf('[');
      const jsonEnd = content.lastIndexOf(']') + 1;
      const cleanedJson = content.substring(jsonStart, jsonEnd);

      return JSON.parse(cleanedJson) as QuizQuestion[];
    } catch (e) {
      console.error('Quiz generation error:', e);
      return this.getFallbackQuestions(parcelId);
    }
  }

  async saveResult(
    farmerId: string,
    score: number,
    totalQuestions: number,
    topic: string,
    parcelId?: string,
  ) {
    // 1. Get current streak
    const lastResult = await this.prisma.quizResult.findFirst({
      where: { userId: farmerId },
      orderBy: { createdAt: 'desc' },
    });

    let newStreak = 1;
    if (lastResult && lastResult.score === lastResult.totalQuestions) {
      newStreak = lastResult.streak + 1;
    } else if (score < totalQuestions) {
      newStreak = 0;
    }

    // 2. Save result
    const result = await this.prisma.quizResult.create({
      data: {
        userId: farmerId,
        score,
        totalQuestions,
        topic,
        parcelId,
        streak: newStreak,
      },
    });

    // 3. Badge check logic
    const unlockedBadges: string[] = [];

    // Simple Thresholds
    if (newStreak >= 5) {
      await this.unlockBadge(farmerId, 'Crop Planner', 'CROP_PLANNER_5_STREAK', unlockedBadges);
    }

    const totalQuizzes = await this.prisma.quizResult.count({ where: { userId: farmerId } });
    if (totalQuizzes >= 3) {
      await this.unlockBadge(farmerId, 'Farm Learner', 'FARM_LEARNER_3_QUIZ', unlockedBadges);
    }

    // Complex Criteria
    if (score / totalQuestions >= 0.8 && topic === 'irrigation') {
       // Potentially more complex logic here (e.g. check history)
       await this.unlockBadge(farmerId, 'Irrigation Expert', 'IRRIGATION_EXPERT_80', unlockedBadges);
    }

    return { result, unlockedBadges };
  }

  async getStats(farmerId: string) {
    const results = await this.prisma.quizResult.findMany({
      where: { userId: farmerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const badges = await this.prisma.badge.findMany({
      where: { userId: farmerId },
    });

    const streak = results[0]?.streak || 0;
    
    // Identify weak areas (topics with avg score < 70%)
    const topicStats: Record<string, { total: number; correct: number }> = {};
    results.forEach((r) => {
      if (!topicStats[r.topic]) topicStats[r.topic] = { total: 0, correct: 0 };
      topicStats[r.topic].total += r.totalQuestions;
      topicStats[r.topic].correct += r.score;
    });

    const weakAreas = Object.keys(topicStats)
      .filter((t) => topicStats[t].correct / topicStats[t].total < 0.7)
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1));

    return {
      streak,
      badges,
      weakAreas,
      totalQuizzes: results.length,
    };
  }

  async getSkillPaths(userId: string) {
    await this.ensureSkillCatalogSeeded();

    const paths = await this.prisma.skillPath.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        lessons: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, title: true },
        },
        completions: {
          where: { userId },
          take: 1,
          select: {
            completionPercent: true,
            completedLessons: true,
            totalLessons: true,
            status: true,
            certificateIssued: true,
          },
        },
      },
    });

    return paths.map((path) => {
      const completion = path.completions[0];
      const totalLessons = completion?.totalLessons ?? path.lessons.length;
      return {
        id: path.id,
        code: path.code,
        title: path.title,
        description: path.description,
        icon: path.icon,
        gradientStart: path.gradientStart,
        gradientEnd: path.gradientEnd,
        difficulty: path.difficulty,
        estimatedMinutes: path.estimatedMinutes,
        completionPercent: completion?.completionPercent ?? 0,
        completedLessons: completion?.completedLessons ?? 0,
        totalLessons,
        status: completion?.status ?? 'NOT_STARTED',
        certificateIssued: completion?.certificateIssued ?? false,
      };
    });
  }

  async getSkillPathDetails(userId: string, pathId: string) {
    await this.ensureSkillCatalogSeeded();

    const path = await this.prisma.skillPath.findFirst({
      where: { id: pathId, isActive: true },
      include: {
        lessons: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            progress: {
              where: { userId },
              take: 1,
            },
          },
        },
      },
    });

    if (!path) {
      throw new NotFoundException('Skill path not found');
    }

    const completion = await this.syncPathCompletion(userId, path.id);

    return {
      id: path.id,
      code: path.code,
      title: path.title,
      description: path.description,
      icon: path.icon,
      gradientStart: path.gradientStart,
      gradientEnd: path.gradientEnd,
      difficulty: path.difficulty,
      estimatedMinutes: path.estimatedMinutes,
      completionPercent: completion.completionPercent,
      completedLessons: completion.completedLessons,
      totalLessons: completion.totalLessons,
      status: completion.status,
      certificateIssued: completion.certificateIssued,
      lessons: path.lessons.map((lesson) => {
        const progress = lesson.progress[0];
        return {
          id: lesson.id,
          code: lesson.code,
          title: lesson.title,
          summary: lesson.summary,
          microContent: lesson.microContent,
          skillTag: lesson.skillTag,
          estimatedMinutes: lesson.estimatedMinutes,
          status: progress?.status ?? 'NOT_STARTED',
          completionPercent: progress?.completionPercent ?? 0,
          attempts: progress?.attempts ?? 0,
          lastScore: progress?.lastScore ?? null,
          bestScore: progress?.bestScore ?? null,
          languageCode: progress?.languageCode ?? null,
        };
      }),
    };
  }

  async generateSkillLessonQuiz(
    userId: string,
    lessonId: string,
    languageCode = 'en-US',
    questionCount = 6,
  ) {
    await this.ensureSkillCatalogSeeded();

    const lesson = await this.prisma.skillLesson.findFirst({
      where: { id: lessonId, isActive: true },
      include: {
        path: {
          select: {
            id: true,
            code: true,
            title: true,
            difficulty: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Skill lesson not found');
    }

    const questions = await this.generateSkillQuestionsWithClaude(
      lesson.title,
      lesson.summary,
      lesson.microContent,
      lesson.skillTag,
      lesson.path.title,
      languageCode,
      questionCount,
    );

    await this.prisma.skillLessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId: lesson.id,
        },
      },
      create: {
        userId,
        lessonId: lesson.id,
        status: 'IN_PROGRESS',
        completionPercent: 10,
        attempts: 0,
        languageCode,
      },
      update: {
        status: 'IN_PROGRESS',
        languageCode,
      },
    });

    return {
      lesson: {
        id: lesson.id,
        title: lesson.title,
        summary: lesson.summary,
        skillTag: lesson.skillTag,
      },
      path: lesson.path,
      languageCode,
      questions,
    };
  }

  async submitSkillLessonQuiz(
    userId: string,
    lessonId: string,
    payload: {
      languageCode?: string;
      questions: QuizQuestion[];
      answers: string[];
    },
  ) {
    await this.ensureSkillCatalogSeeded();

    const lesson = await this.prisma.skillLesson.findFirst({
      where: { id: lessonId, isActive: true },
      include: {
        path: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Skill lesson not found');
    }

    const questions = Array.isArray(payload.questions) ? payload.questions : [];
    const answers = Array.isArray(payload.answers) ? payload.answers : [];

    const totalQuestions = questions.length;
    const correctAnswers = questions.reduce((score, question, index) => {
      const selected = answers[index] ?? '';
      return selected === question.correctAnswer ? score + 1 : score;
    }, 0);

    const scorePercent =
      totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const passed = scorePercent >= 70;

    const previousProgress = await this.prisma.skillLessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    const bestScore = Math.max(previousProgress?.bestScore ?? 0, scorePercent);
    const completionPercent = passed
      ? 100
      : Math.max(previousProgress?.completionPercent ?? 0, Math.min(scorePercent, 90));
    const lastQuizPayload = JSON.parse(
      JSON.stringify({
        questions,
        answers,
        correctAnswers,
        totalQuestions,
      }),
    ) as Prisma.InputJsonValue;

    await this.prisma.skillLessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      create: {
        userId,
        lessonId,
        status: passed ? 'COMPLETED' : 'IN_PROGRESS',
        completionPercent,
        attempts: 1,
        lastScore: scorePercent,
        bestScore,
        languageCode: payload.languageCode || 'en-US',
        lastQuiz: lastQuizPayload,
        completedAt: passed ? new Date() : null,
      },
      update: {
        status: passed ? 'COMPLETED' : 'IN_PROGRESS',
        completionPercent,
        attempts: { increment: 1 },
        lastScore: scorePercent,
        bestScore,
        languageCode: payload.languageCode || 'en-US',
        lastQuiz: lastQuizPayload,
        completedAt: passed
          ? new Date()
          : previousProgress?.completedAt ?? null,
      },
    });

    const pathCompletion = await this.syncPathCompletion(userId, lesson.path.id);

    return {
      lessonId,
      lessonTitle: lesson.title,
      pathTitle: lesson.path.title,
      correctAnswers,
      totalQuestions,
      scorePercent,
      passed,
      certificateIssued: pathCompletion.certificateIssued,
      pathCompletion,
      feedback: passed
        ? 'Great work. Lesson competency validated.'
        : 'Keep practicing this lesson and retry for certification.',
    };
  }

  async getSkillProgressOverview(userId: string) {
    const paths = await this.getSkillPaths(userId);
    const completedPaths = paths.filter((path) => path.status === 'COMPLETED').length;
    const totalPaths = paths.length;

    const lessonProgress = await this.prisma.skillLessonProgress.findMany({
      where: { userId },
      select: {
        status: true,
      },
    });

    const completedLessons = lessonProgress.filter(
      (entry) => entry.status === 'COMPLETED',
    ).length;

    const inProgressLessons = lessonProgress.filter(
      (entry) => entry.status === 'IN_PROGRESS',
    ).length;

    const overallPercent =
      totalPaths > 0
        ? Math.round(
            paths.reduce((sum, path) => sum + path.completionPercent, 0) / totalPaths,
          )
        : 0;

    return {
      overallPercent,
      completedPaths,
      totalPaths,
      completedLessons,
      inProgressLessons,
      certificatesUnlocked: paths.filter((path) => path.certificateIssued).length,
    };
  }

  private async unlockBadge(userId: string, name: string, type: string, list: string[]) {
    const existing = await this.prisma.badge.findUnique({
      where: { userId_type: { userId, type } },
    });

    if (!existing) {
      await this.prisma.badge.create({
        data: { userId, name, type },
      });
      list.push(name);
    }
  }

  private async ensureSkillCatalogSeeded() {
    const existingCount = await this.prisma.skillPath.count();
    if (existingCount > 0) {
      return;
    }

    for (const path of this.skillCatalogSeed) {
      try {
        await this.prisma.skillPath.create({
          data: {
            code: path.code,
            title: path.title,
            description: path.description,
            icon: path.icon,
            gradientStart: path.gradientStart,
            gradientEnd: path.gradientEnd,
            difficulty: path.difficulty,
            estimatedMinutes: path.estimatedMinutes,
            sortOrder: path.sortOrder,
            lessons: {
              create: path.lessons.map((lesson) => ({
                code: lesson.code,
                title: lesson.title,
                summary: lesson.summary,
                microContent: lesson.microContent,
                skillTag: lesson.skillTag,
                estimatedMinutes: lesson.estimatedMinutes,
                sortOrder: lesson.sortOrder,
              })),
            },
          },
        });
      } catch (_) {
        // Ignore seed races when multiple users hit the endpoint simultaneously.
      }
    }
  }

  private async syncPathCompletion(userId: string, pathId: string) {
    const [totalLessons, completedLessons, perfectLessonCount] = await Promise.all([
      this.prisma.skillLesson.count({
        where: {
          pathId,
          isActive: true,
        },
      }),
      this.prisma.skillLessonProgress.count({
        where: {
          userId,
          status: 'COMPLETED',
          lesson: {
            pathId,
          },
        },
      }),
      this.prisma.skillLessonProgress.count({
        where: {
          userId,
          bestScore: 100,
          lesson: {
            pathId,
          },
        },
      }),
    ]);

    const naturalCompletionPercent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const unlockedByPerfectLesson = perfectLessonCount > 0;
    const completionPercent = unlockedByPerfectLesson
      ? 100
      : naturalCompletionPercent;
    const normalizedCompletedLessons = unlockedByPerfectLesson
      ? totalLessons
      : completedLessons;
    const status = completionPercent >= 100 ? 'COMPLETED' : 'IN_PROGRESS';
    const certificateIssued = status === 'COMPLETED';

    return this.prisma.skillPathCompletion.upsert({
      where: {
        userId_pathId: {
          userId,
          pathId,
        },
      },
      create: {
        userId,
        pathId,
        completionPercent,
        completedLessons: normalizedCompletedLessons,
        totalLessons,
        status,
        certificateIssued,
        completedAt: certificateIssued ? new Date() : null,
      },
      update: {
        completionPercent,
        completedLessons: normalizedCompletedLessons,
        totalLessons,
        status,
        certificateIssued,
        completedAt: certificateIssued ? new Date() : null,
      },
      select: {
        completionPercent: true,
        completedLessons: true,
        totalLessons: true,
        status: true,
        certificateIssued: true,
      },
    });
  }

  private async generateSkillQuestionsWithClaude(
    lessonTitle: string,
    lessonSummary: string,
    microContent: string,
    skillTag: string,
    pathTitle: string,
    languageCode: string,
    questionCount: number,
  ): Promise<QuizQuestion[]> {
    const apiKey = this.config.get<string>('CLAUDE_API_KEY');

    if (!apiKey) {
      return this.getSkillFallbackQuestions(
        lessonTitle,
        lessonSummary,
        skillTag,
        languageCode,
        questionCount,
      );
    }

    const configuredModel = this.config.get<string>('CLAUDE_MODEL')?.trim();
    const modelCandidates = [
      configuredModel,
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-haiku-20240307',
    ].filter((value, index, arr): value is string => !!value && arr.indexOf(value) === index);

    const languageName = this.resolveLanguageName(languageCode);
    const languageInstruction = this.getLanguageInstruction(languageCode);
    const prompt = `
You are a farm skill trainer.
Generate exactly ${questionCount} multiple-choice competency questions.

Path: ${pathTitle}
Lesson: ${lessonTitle}
Lesson Summary: ${lessonSummary}
Micro Content: ${microContent}
Skill Tag: ${skillTag}
Language: ${languageName}
Language Rule: ${languageInstruction}

Return only a JSON array. Each item must have:
{
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "correctAnswer": "...",
  "aiExplanation": "...",
  "topic": "${skillTag}"
}

Rules:
- Ensure correctAnswer is exactly one of the options.
- Use practical farm operations wording.
- Write question, options, correctAnswer, and aiExplanation in the selected language only.
- Keep options distinct and plausible.
- Do not include markdown, headings, or extra text.
    `.trim();

    for (const model of modelCandidates) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 1400,
            temperature: 0.3,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (!response.ok) {
          continue;
        }

        const data = (await response.json()) as AnthropicResponse;
        const text = (data.content || [])
          .filter((entry) => entry.type === 'text' && !!entry.text)
          .map((entry) => entry.text || '')
          .join('\n')
          .trim();

        const parsed = this.parseQuizQuestionsFromText(text, questionCount);
        if (parsed.length > 0) {
          return parsed;
        }
      } catch (_) {
        // Try next model candidate.
      }
    }

    return this.getSkillFallbackQuestions(
      lessonTitle,
      lessonSummary,
      skillTag,
      languageCode,
      questionCount,
    );
  }

  private parseQuizQuestionsFromText(text: string, questionCount: number): QuizQuestion[] {
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']') + 1;

    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      return [];
    }

    const content = text.slice(jsonStart, jsonEnd);
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (_) {
      return [];
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item): QuizQuestion | null => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const candidate = item as Record<string, unknown>;
        const question = String(candidate.question || '').trim();
        const options = Array.isArray(candidate.options)
          ? candidate.options.map((value) => String(value || '').trim()).filter(Boolean)
          : [];

        if (!question || options.length < 2) {
          return null;
        }

        const rawCorrect = String(candidate.correctAnswer || '').trim();
        const correctAnswer = options.includes(rawCorrect) ? rawCorrect : options[0];

        return {
          question,
          options: options.slice(0, 4),
          correctAnswer,
          aiExplanation: String(candidate.aiExplanation || 'Review the lesson details.').trim(),
          topic: String(candidate.topic || 'skill').trim(),
          parcelAdvice: undefined,
        };
      })
      .filter((value): value is QuizQuestion => !!value)
      .slice(0, questionCount);
  }

  private resolveLanguageName(languageCode: string): string {
    const normalized = languageCode.toLowerCase();
    if (normalized.startsWith('fr')) return 'French';
    if (normalized.startsWith('ar')) return 'Arabic (Modern Standard)';
    return 'English';
  }

  private getLanguageInstruction(languageCode: string): string {
    const normalized = languageCode.toLowerCase();

    if (normalized.startsWith('fr')) {
      return 'Use French for all text fields.';
    }

    if (normalized.startsWith('ar')) {
      return 'Use Modern Standard Arabic (العربية الفصحى) for all text fields. Do not use Tunisian dialect words. Use Arabic script only.';
    }

    return 'Use English for all text fields.';
  }

  private getSkillFallbackQuestions(
    lessonTitle: string,
    lessonSummary: string,
    skillTag: string,
    languageCode: string,
    questionCount: number,
  ): QuizQuestion[] {
    if (languageCode.toLowerCase().startsWith('ar')) {
      const arabicQuestions: QuizQuestion[] = [
        {
          question: `في درس "${lessonTitle}"، ما أول خطوة يجب التحقق منها قبل بدء المهمة؟`,
          options: [
            'فحص الأدوات وإجراءات السلامة',
            'مراجعة أسعار السوق',
            'تسجيل نتائج الحصاد النهائية',
            'تغيير لون العلامات',
          ],
          correctAnswer: 'فحص الأدوات وإجراءات السلامة',
          aiExplanation:
            'التحقق من السلامة وجاهزية المعدات يقلل الأخطاء ويحمي العاملين والمحصول.',
          topic: skillTag,
        },
        {
          question: 'ما أفضل طريقة لتطبيق إجراءات العمل بشكل ثابت ودقيق؟',
          options: [
            'استخدام قائمة تحقق موحدة في كل مرة',
            'تغيير الخطوات يوميا دون توثيق',
            'تخطي التوثيق لتوفير الوقت',
            'تنفيذ التدريب مرة واحدة فقط',
          ],
          correctAnswer: 'استخدام قائمة تحقق موحدة في كل مرة',
          aiExplanation:
            'قائمة التحقق الموحدة ترفع جودة التنفيذ وتضمن ثبات الأداء بين أفراد الفريق.',
          topic: skillTag,
        },
        {
          question: `أي نتيجة تدل بشكل أوضح على اكتساب الكفاءة في: "${lessonSummary}"؟`,
          options: [
            'انخفاض الأخطاء وتحسن السلامة أثناء التنفيذ',
            'زيادة استهلاك الموارد بلا حاجة',
            'إهمال خطوات المراجعة الأساسية',
            'بطء الاستجابة للمشكلات',
          ],
          correctAnswer: 'انخفاض الأخطاء وتحسن السلامة أثناء التنفيذ',
          aiExplanation:
            'الكفاءة الحقيقية تظهر في جودة التنفيذ والالتزام بالسلامة وتقليل الأخطاء.',
          topic: skillTag,
        },
        {
          question: 'لماذا يجب تسجيل كل محاولة تدريب عملي؟',
          options: [
            'لمتابعة التقدم وتحديد نقاط الضعف',
            'لإلغاء الحاجة إلى الإشراف',
            'لتقليل فرص التدريب الميداني',
            'لاستبدال التطبيق العملي بالكامل',
          ],
          correctAnswer: 'لمتابعة التقدم وتحديد نقاط الضعف',
          aiExplanation:
            'التسجيل المنتظم يساعد على تحسين الأداء وتوجيه التدريب بشكل أدق.',
          topic: skillTag,
        },
        {
          question: 'متى تعتبر الوحدة التدريبية مكتملة بشكل صحيح؟',
          options: [
            'عند تحقيق الحد المطلوب في اختبار الكفاءة',
            'بعد فتح الدرس مرة واحدة فقط',
            'بعد قراءة المقدمة دون تطبيق',
            'بعد موافقة شفوية غير موثقة',
          ],
          correctAnswer: 'عند تحقيق الحد المطلوب في اختبار الكفاءة',
          aiExplanation:
            'الاكتمال يجب أن يعتمد على تحقق الكفاءة وليس على الحضور فقط.',
          topic: skillTag,
        },
        {
          question: 'ما الفائدة الأساسية من تقديم التدريب باللغة العربية الفصحى؟',
          options: [
            'زيادة الوضوح وتقليل الأخطاء التشغيلية',
            'تعقيد المصطلحات دون داع',
            'إلغاء التدريب العملي',
            'تقليل مسؤوليات الفريق',
          ],
          correctAnswer: 'زيادة الوضوح وتقليل الأخطاء التشغيلية',
          aiExplanation:
            'كلما كانت اللغة أوضح وأسلم، ارتفعت دقة الفهم وجودة التنفيذ في الميدان.',
          topic: skillTag,
        },
      ];

      return arabicQuestions.slice(0, Math.max(1, questionCount));
    }

    const language = this.resolveLanguageName(languageCode);
    const baseQuestions: QuizQuestion[] = [
      {
        question: `(${language}) In ${lessonTitle}, what should be checked first before starting the task?`,
        options: ['Tool condition and safety setup', 'Final harvest records', 'Market prices', 'Fence color'],
        correctAnswer: 'Tool condition and safety setup',
        aiExplanation:
          'Safety and equipment readiness reduce mistakes and prevent contamination or injury.',
        topic: skillTag,
      },
      {
        question: `What is the best way to apply ${skillTag.replace('_', ' ')} procedures consistently?`,
        options: [
          'Use a repeatable checklist for every cycle',
          'Change steps every day',
          'Skip documentation to save time',
          'Only train once per season',
        ],
        correctAnswer: 'Use a repeatable checklist for every cycle',
        aiExplanation:
          'Checklists standardize quality and make training easier across teams.',
        topic: skillTag,
      },
      {
        question: `Which outcome most clearly shows competency in "${lessonSummary}"?`,
        options: [
          'Fewer process errors and safer execution',
          'Higher fuel use per task',
          'More skipped verification steps',
          'Longer response time to issues',
        ],
        correctAnswer: 'Fewer process errors and safer execution',
        aiExplanation:
          'Competency should be reflected by quality, consistency, and safety indicators.',
        topic: skillTag,
      },
      {
        question: 'Why should teams log each competency practice attempt?',
        options: [
          'To track progress and identify weak spots',
          'To avoid any supervision',
          'To reduce skill development sessions',
          'To replace practical training completely',
        ],
        correctAnswer: 'To track progress and identify weak spots',
        aiExplanation:
          'Logging attempts supports targeted coaching and measurable improvement.',
        topic: skillTag,
      },
      {
        question: 'When should a lesson be considered fully completed?',
        options: [
          'When quiz competency threshold is achieved',
          'After opening the lesson once',
          'After watching only intro slides',
          'When a teammate confirms verbally',
        ],
        correctAnswer: 'When quiz competency threshold is achieved',
        aiExplanation:
          'Completion should be tied to verified competency, not just attendance.',
        topic: skillTag,
      },
      {
        question: 'What is the strongest reason to localize training language?',
        options: [
          'Improve understanding and reduce operational mistakes',
          'Increase jargon complexity',
          'Replace all practical demonstrations',
          'Eliminate role-based training',
        ],
        correctAnswer: 'Improve understanding and reduce operational mistakes',
        aiExplanation:
          'Clear language boosts retention and correct execution in the field.',
        topic: skillTag,
      },
    ];

    return baseQuestions.slice(0, Math.max(1, questionCount));
  }

  private getFallbackQuestions(parcelId?: string): QuizQuestion[] {
    return [
      {
        question: 'What is the primary benefit of crop rotation?',
        options: [
          'Reduced soil erosion',
          'Breaking pest and disease cycles',
          'Increased water usage',
          'Easier harvesting',
        ],
        correctAnswer: 'Breaking pest and disease cycles',
        aiExplanation:
          'Rotating crops prevents pests that specialize in one crop from establishing large populations in the soil.',
        parcelAdvice: parcelId ? 'Consider rotating your current crop in the next season to maintain soil health.' : 'Always rotate nitrogen-fixing crops with heavy feeders.',
        topic: 'crop rotation',
      },
      {
        question: 'Which nutrient is most essential for leafy green growth?',
        options: ['Phosphorus', 'Potassium', 'Nitrogen', 'Calcium'],
        correctAnswer: 'Nitrogen',
        aiExplanation: 'Nitrogen is a key component of chlorophyll and is vital for leaf and stem development.',
        parcelAdvice: 'Check your nitrogen levels if your plants look pale or yellow.',
        topic: 'fertilization',
      },
      // ... Add more fallbacks for variety
    ];
  }
}
