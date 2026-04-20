import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  aiExplanation: string;
  parcelAdvice?: string;
  topic: string;
}

@Injectable()
export class QuizService {
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
