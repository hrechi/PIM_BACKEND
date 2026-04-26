import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssetInsightsService } from '../asset/asset-insights.service';
import { PrismaService } from '../prisma/prisma.service';

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

@Injectable()
export class MechanicChatService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly assetInsightsService: AssetInsightsService,
  ) {}

  private getMechanicSystemPrompt(assetContext?: {
    brand?: string;
    model?: string;
    category?: string;
    assetId?: string;
  }): string {
    let prompt =
      'You are an expert agricultural mechanic and machinery specialist. ' +
      'You ONLY answer questions related to: ' +
      '- farm machines (tractors, harvesters, drones, equipment) ' +
      '- mechanical issues and failures ' +
      '- maintenance and repair ' +
      '- diagnostics and troubleshooting ' +
      '\n' +
      'Your role: ' +
      '- Diagnose problems based on descriptions ' +
      '- Suggest practical fixes ' +
      '- Recommend maintenance schedules ' +
      '- Explain mechanical issues clearly and simply ' +
      '\n' +
      'Rules: ' +
      '- Be practical and realistic ' +
      '- Do not hallucinate unknown machines or parts ' +
      '- You also receive real machine data and history. Use it to improve your diagnosis. Prioritize real data over assumptions. ' +
      '- If unsure about diagnosis, say it clearly ' +
      '- Keep answers concise but useful ' +
      '- For safety-critical issues, always recommend professional inspection ' +
      '\n' +
      'If the question is not related to machinery: ' +
      '→ politely refuse and redirect the user back to machinery topics ' +
      '\n' +
      'When providing answers: ' +
      '- Use clear bullet points for step-by-step guidance ' +
      '- Mention estimated costs/time when relevant ' +
      '- Suggest when to seek professional help ';

    if (assetContext && (assetContext.brand || assetContext.model || assetContext.category)) {
      const assetInfo = [
        assetContext.brand && `Brand: ${assetContext.brand}`,
        assetContext.model && `Model: ${assetContext.model}`,
        assetContext.category && `Type: ${assetContext.category}`,
      ]
        .filter(Boolean)
        .join(', ');

      prompt += `\n\nMachine Under Discussion: ${assetInfo}. Use this context to give more accurate and specific answers.`;
    }

    return prompt;
  }

  async sendMessage(
    userId: string,
    message: string,
    conversationId?: string,
    assetId?: string,
    assetContext?: {
      brand?: string;
      model?: string;
      category?: string;
    },
  ): Promise<{ reply: string; conversationId: string }> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    const apiUrl =
      this.configService.get<string>('GROQ_URL') ??
      'https://api.groq.com/openai/v1/chat/completions';
    const model =
      this.configService.get<string>('GROQ_MODEL') ?? 'llama-3.1-8b-instant';

    if (!apiKey) {
      return {
        reply: 'Mechanic assistant is not configured. Please set GROQ_API_KEY.',
        conversationId: conversationId || '',
      };
    }

    const machineContext = await this.buildMachineContext(assetId, assetContext);
    const systemPrompt = this.getMechanicSystemPrompt({
      ...assetContext,
      ...(assetId ? { assetId } : {}),
    });

    try {
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), 30000); // 30 second timeout

      const messages: Array<{ role: 'system' | 'user'; content: string }> = [
        { role: 'system', content: systemPrompt },
      ];

      if (machineContext) {
        messages.push({
          role: 'system',
          content: `Machine context JSON:\n${JSON.stringify(machineContext, null, 2)}`,
        });
      }

      messages.push({ role: 'user', content: message });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3, // Slightly higher than chat for more versatile responses
        }),
        signal: abortController.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          reply: 'Mechanic assistant service error. Please try again.',
          conversationId: conversationId || '',
        };
      }

      const data = (await response.json()) as GroqResponse;
      const content = data.choices?.[0]?.message?.content;
      const reply = content?.trim() ?? 'No response from mechanic assistant.';

      return {
        reply,
        conversationId: conversationId || '',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Network timeout or connection error
      if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ENETUNREACH')
      ) {
        return {
          reply:
            'Mechanic assistant is temporarily unavailable. Please check your internet connection and try again.',
          conversationId: conversationId || '',
        };
      }

      // API key or authentication error
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        return {
          reply:
            'Mechanic assistant authentication failed. Please contact support.',
          conversationId: conversationId || '',
        };
      }

      // Generic error
      return {
        reply: `Mechanic assistant error: ${errorMessage}. Please try again later.`,
        conversationId: conversationId || '',
      };
    }
  }

  private async buildMachineContext(
    assetId?: string,
    legacyAssetContext?: {
      brand?: string;
      model?: string;
      category?: string;
    },
  ): Promise<Record<string, unknown> | null> {
    if (!assetId) {
      if (!legacyAssetContext || (!legacyAssetContext.brand && !legacyAssetContext.model && !legacyAssetContext.category)) {
        return null;
      }

      return {
        asset: {
          brand: legacyAssetContext.brand ?? null,
          model: legacyAssetContext.model ?? null,
          category: legacyAssetContext.category ?? null,
        },
        recentIssues: [],
        conditions: [],
        insights: null,
      };
    }

    const [asset, recentLogs, insights] = await Promise.all([
      this.prismaService.asset.findUnique({
        where: { id: assetId },
        select: {
          id: true,
          brand: true,
          model: true,
          category: true,
          operatingHours: true,
          mileage: true,
        },
      }),
      this.prismaService.usageLog.findMany({
        where: { assetId },
        orderBy: { endTime: 'desc' },
        take: 10,
        select: {
          issues: true,
          maintenanceNote: true,
          condition: true,
          duration: true,
          startTime: true,
          endTime: true,
        },
      }),
      this.assetInsightsService.getAssetInsights(assetId),
    ]);

    if (!asset) {
      return legacyAssetContext
        ? {
            asset: {
              brand: legacyAssetContext.brand ?? null,
              model: legacyAssetContext.model ?? null,
              category: legacyAssetContext.category ?? null,
            },
            recentIssues: [],
            conditions: [],
            insights: null,
          }
        : null;
    }

    const recentIssues = recentLogs
      .flatMap((log) => [log.issues, log.maintenanceNote])
      .map((value) => (value ?? '').trim())
      .filter((value) => value.length > 0)
      .slice(0, 10);

    const conditions: string[] = [];
    for (const log of recentLogs) {
      if (log.condition) {
        conditions.push(String(log.condition));
      }
    }

    return {
      asset: {
        brand: asset.brand,
        model: asset.model,
        category: asset.category,
        operatingHours: asset.operatingHours,
        mileage: asset.mileage,
      },
      recentIssues,
      conditions,
      insights,
    };
  }
}
