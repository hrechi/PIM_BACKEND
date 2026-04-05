import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

const TOPIC_POOL = [
  'soil health and pH management',
  'irrigation techniques and water efficiency',
  'pest and disease identification',
  'optimal harvest timing',
  'fertilization and NPK levels',
  'crop rotation strategies',
  'crop economics and market pricing',
  'seed selection and variety management',
  'climate adaptation for farms',
  'post-harvest storage and handling',
];

const FALLBACK_QUESTIONS = [
  {
    question: 'What does NPK stand for in fertilizer terminology?',
    options: ['Nitrogen, Phosphorus, Potassium', 'Nitrogen, Potassium, Phosphate', 'Natural Plant Kits', 'Nitrate, Phosphate, Kalium'],
    correctAnswer: 'Nitrogen, Phosphorus, Potassium',
    aiExplanation: 'NPK is the universal notation for the three primary macronutrients: Nitrogen (N) promotes leafy growth, Phosphorus (P) supports root and flower development, and Potassium (K) improves disease resistance and water regulation.',
    parcelAdvice: 'Always test your parcel NPK levels before planting to identify deficiencies early.',
  },
  {
    question: 'At what soil pH range do most crops absorb nutrients most efficiently?',
    options: ['4.0 – 5.0', '6.0 – 7.0', '7.5 – 8.5', '3.0 – 4.0'],
    correctAnswer: '6.0 – 7.0',
    aiExplanation: 'Most crops thrive at a slightly acidic to neutral pH of 6.0–7.0. Outside this range, key nutrients become chemically locked and unavailable to plants, leading to deficiency symptoms even in nutrient-rich soils.',
    parcelAdvice: 'If your parcel pH is outside this range, lime (to raise) or sulfur (to lower) can correct it.',
  },
  {
    question: 'Which irrigation method achieves the highest water efficiency?',
    options: ['Flood irrigation', 'Sprinkler irrigation', 'Drip irrigation', 'Furrow irrigation'],
    correctAnswer: 'Drip irrigation',
    aiExplanation: 'Drip irrigation delivers water slowly to the root zone, reducing evaporation and runoff drastically. It can achieve up to 90% water use efficiency compared to just 50-60% for flood or sprinkler systems.',
    parcelAdvice: 'Consider switching to drip irrigation for high-value crops on water-stressed parcels.',
  },
  {
    question: 'What is the primary purpose of crop rotation?',
    options: ['To maximize yield in a single season', 'To disrupt pest cycles and replenish soil nutrients', 'To eliminate the need for fertilizers', 'To reduce crop diversity'],
    correctAnswer: 'To disrupt pest cycles and replenish soil nutrients',
    aiExplanation: 'Rotating different crop families disrupts the life cycles of soil-borne pests and diseases that target specific plants. Legumes in the rotation also fix atmospheric nitrogen, naturally enriching soil for subsequent crops.',
    parcelAdvice: 'Review your parcel crop history and plan rotations that include at least one legume every 3-4 seasons.',
  },
  {
    question: 'What is the main risk of harvesting cereal crops significantly past their optimal window?',
    options: ['Crops become too wet to sell', 'Grain shattering, quality loss, and increased pest pressure', 'Yield doubles from extended growth', 'No risk – crops can wait indefinitely'],
    correctAnswer: 'Grain shattering, quality loss, and increased pest pressure',
    aiExplanation: 'Overripe cereals lose structural integrity and shed seeds naturally (shattering), leading to yield loss. Extended exposure also invites fungal infection and insect damage, reducing market value significantly.',
    parcelAdvice: 'Monitor your Harvest Optimization widget closely to catch the optimal harvest window before quality degradation begins.',
  },
];

@Injectable()
export class QuizService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  private pickRandomTopics(count = 5): string[] {
    const shuffled = [...TOPIC_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  async generateQuiz(parcelId?: string, userId?: string) {
    let parcelContext = '';
    let parcelData: any = null;

    if (parcelId) {
      parcelData = await this.prisma.parcel.findUnique({
        where: { id: parcelId },
        include: {
          crops: { orderBy: { plantingDate: 'desc' }, take: 1 },
          fertilizations: { orderBy: { applicationDate: 'desc' }, take: 1 },
        },
      });

      if (parcelData) {
        const latestCrop = parcelData.crops?.[0];
        const latestFertilizer = parcelData.fertilizations?.[0];
        parcelContext = `
Parcel Data (use this for personalized questions):
- Location: ${parcelData.location}
- Area: ${parcelData.areaSize} hectares
- Soil Type: ${parcelData.soilType}
- Soil pH: ${parcelData.soilPh ?? 'Not tested'}
- Nitrogen Level: ${parcelData.nitrogenLevel ?? 'Unknown'}
- Phosphorus Level: ${parcelData.phosphorusLevel ?? 'Unknown'}
- Potassium Level: ${parcelData.potassiumLevel ?? 'Unknown'}
- Water Source: ${parcelData.waterSource}
- Irrigation: ${parcelData.irrigationMethod} (${parcelData.irrigationFrequency})
- Current Crop: ${latestCrop?.cropName ?? 'None planted'}
- Planted On: ${latestCrop?.plantingDate ? new Date(latestCrop.plantingDate).toDateString() : 'N/A'}
- Last Fertilizer: ${latestFertilizer?.fertilizerType ?? 'None recorded'}
`;
      }
    }

    const topics = this.pickRandomTopics(5);
    const seed = Date.now();

    if (!this.genAI) {
      return { questions: FALLBACK_QUESTIONS, source: 'fallback' };
    }

    const prompt = `You are an expert agronomist AI for a gamified farm learning platform called Fieldly.
Seed: ${seed} (use this to ensure unique content not repeated from previous sessions)

Your task: Generate exactly 5 unique, educational multiple-choice quiz questions for farmers.

Topics to cover (one per question, in this order):
${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

${parcelContext ? `PARCEL CONTEXT:\n${parcelContext}\nFor at least 3 of the 5 questions, reference the specific parcel data above to make the questions personalized and actionable.` : 'Generate general educational farming questions suitable for any farmer.'}

Rules:
- Each question must be completely different from typical farming quiz questions
- Vary difficulty: 2 easy, 2 medium, 1 hard
- For each question provide exactly 4 answer options
- The questions should be educational and help farmers improve their skills
- Explanations must be detailed and teach the farmer WHY the answer is correct
- If parcel data is provided, parcelAdvice must reference specific numbers (e.g., "Your parcel pH of 5.8 means...")
- If no parcel data, parcelAdvice should be a general actionable tip

Return ONLY a valid JSON object matching this structure exactly:
{
  "questions": [
    {
      "question": "string",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "string (must exactly match one of the options)",
      "aiExplanation": "string (2-3 sentences explaining why correct + why others are wrong)",
      "parcelAdvice": "string (1 sentence actionable tip)"
    }
  ]
}`;

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Extract JSON safely
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      
      const parsed = JSON.parse(jsonMatch[0]);
      return { ...parsed, source: 'ai', parcelId: parcelId ?? null };
    } catch (err) {
      console.error('[QuizService] Gemini failed, using fallback:', err);
      return { questions: FALLBACK_QUESTIONS, source: 'fallback' };
    }
  }
}
