import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export interface AnimalValuePayload {
  animalType: string;
  breed?: string;
  sex: string;
  age: number;
  weight?: number;
  healthStatus: string;
  vitalityScore?: number;
  vaccination?: boolean;
  isFattening?: boolean;
  dailyMilkAvgL?: number;
  lactationNumber?: number;
  birthCount?: number;
  meatGrade?: string;
  raceCategory?: string;
  trainingLevel?: string;
  regionCode?: string;
  countryCode?: string;
  totalAnimalCost?: number;
  totalFieldCost?: number;
}

@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: process.env.GROQ_URL ?? 'https://api.groq.com/openai/v1',
    });
  }

  async estimateAnimalValue(
    animal: AnimalValuePayload,
  ): Promise<{ value: number; reason: string }> {
    const today = new Date();
    const dateStr = today.toLocaleDateString('fr-TN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const region = animal.regionCode
      ? `région ${animal.regionCode}`
      : animal.countryCode === 'TN'
      ? 'Tunisie (région non précisée)'
      : animal.countryCode
      ? `pays: ${animal.countryCode}`
      : 'Tunisie';

    // Species-specific base price hint to anchor the model
    const speciesHints: Record<string, string> = {
      cow:   'Une vache coûte typiquement entre 1500 et 8000 TND selon race et production.',
      sheep: 'Un mouton coûte typiquement entre 200 et 1500 TND (x2-3 avant Aïd).',
      horse: 'Un cheval coûte typiquement entre 3000 et 30000 TND selon race et niveau.',
      dog:   'Un chien coûte typiquement entre 100 et 800 TND selon race et rôle.',
    };
    const speciesHint = speciesHints[animal.animalType?.toLowerCase()] ?? '';

    const prompt = `
Tu es un expert du marché du bétail en Tunisie et en Afrique du Nord.
Date d'aujourd'hui: ${dateStr}
${speciesHint}

Estime la valeur marchande réaliste de CET ANIMAL SPÉCIFIQUE en dinars tunisiens (TND).
L'espèce est: ${animal.animalType.toUpperCase()} — adapte OBLIGATOIREMENT ton estimation à cette espèce.

DONNÉES DE L'ANIMAL:
- Espèce: ${animal.animalType} (IMPORTANT: base ton prix sur cette espèce uniquement)
- Race: ${animal.breed ?? 'race locale'}
- Sexe: ${animal.sex}
- Âge: ${animal.age} mois
- Poids: ${animal.weight ? animal.weight + ' kg' : 'non renseigné'}
- Santé: ${animal.healthStatus}
- Vitalité: ${animal.vitalityScore ?? 100}/100
- Vacciné: ${animal.vaccination ? 'oui' : 'non'}
- En engraissement: ${animal.isFattening ? 'oui' : 'non'}
- Localisation: ${region}
${animal.dailyMilkAvgL ? `- Production laitière: ${animal.dailyMilkAvgL} L/jour` : ''}
${animal.lactationNumber ? `- Numéro lactation: ${animal.lactationNumber}` : ''}
${animal.birthCount ? `- Nombre naissances: ${animal.birthCount}` : ''}
${animal.meatGrade ? `- Grade viande: ${animal.meatGrade}` : ''}
${animal.raceCategory ? `- Catégorie course: ${animal.raceCategory}` : ''}
${animal.trainingLevel ? `- Niveau entraînement: ${animal.trainingLevel}` : ''}
${animal.totalAnimalCost && animal.totalAnimalCost > 0
  ? `- Coût total investi sur cet animal: ${animal.totalAnimalCost} TND`
  : ''}
${animal.totalFieldCost && animal.totalFieldCost > 0
  ? `- Coût d'exploitation du field cette année: ${animal.totalFieldCost} TND`
  : ''}

RÈGLES:
1. Proximité Aïd Al-Adha — si dans les 6 semaines, prix ovins x2 à x3.
2. Race améliorée vaut 30 à 100% de plus qu'une race locale.
3. Poids vif — facteur principal pour animaux de boucherie.
4. Santé CRITICAL: -35%, WARNING: -15%.
5. La valeur ne doit jamais être inférieure au coût total investi.

IMPORTANT: Réponds UNIQUEMENT avec du JSON valide, rien d'autre.
Format exact: {"value": 1200, "reason": "justification courte max 15 mots"}
    `.trim();

    try {
      const completion = await this.client.chat.completions.create({
        model: process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant',
        max_tokens: 100,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content:
              'Tu es un expert bétail Tunisie. Réponds UNIQUEMENT avec du JSON valide: {"value": number, "reason": string}. Aucun texte avant ou après.',
          },
          { role: 'user', content: prompt },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? '';
      this.logger.debug(`[Groq] Raw response: ${text}`);

      // Extract JSON even if model adds extra text
      const jsonMatch = text.match(/\{[^}]+\}/);
      if (!jsonMatch) throw new Error(`No JSON found in response: ${text}`);

      const parsed = JSON.parse(jsonMatch[0]);

      if (typeof parsed.value !== 'number' || parsed.value <= 0) {
        throw new Error(`Invalid value: ${parsed.value}`);
      }

      // Round to nearest 10
      parsed.value = Math.round(parsed.value / 10) * 10;

      this.logger.log(
        `[Groq] ${animal.animalType} (${animal.breed ?? 'local'}, ${animal.age}mo) → ${parsed.value} TND | ${parsed.reason}`,
      );

      return parsed;
    } catch (error) {
      this.logger.warn(
        `[Groq] Estimation failed: ${error.message} — using fallback`,
      );
      const fallback = this.fallbackEstimate(animal);
      this.logger.log(`[Groq] Fallback value for ${animal.animalType}: ${fallback} TND`);
      return {
        value: fallback,
        reason: 'Estimation locale (Groq indisponible)',
      };
    }
  }

  // Fallback if Groq is down — never returns null
  private fallbackEstimate(animal: AnimalValuePayload): number {
    const basePrices: Record<string, number> = {
      cow: 2000,
      horse: 5000,
      sheep: 400,
      dog: 300,
    };
    const type = (animal.animalType ?? '').toLowerCase();
    const pricePerKg: Record<string, number> = {
      cow: 4,
      horse: 3,
      sheep: 6,
      dog: 0,
    };

    let value =
      animal.weight && animal.weight > 0
        ? animal.weight * (pricePerKg[type] ?? 3)
        : basePrices[type] ?? 500;

    if (animal.healthStatus === 'WARNING') value *= 0.85;
    if (animal.healthStatus === 'CRITICAL') value *= 0.65;
    if (animal.isFattening) value *= 1.08;
    if (animal.vaccination) value *= 1.05;

    // Never go below total invested cost
    if (animal.totalAnimalCost && animal.totalAnimalCost > value) {
      value = animal.totalAnimalCost * 1.1;
    }

    return Math.round(value / 10) * 10;
  }
}
