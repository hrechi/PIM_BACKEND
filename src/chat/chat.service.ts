import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface ClaudeResponse {
  content?: Array<{ type?: string; text?: string }>;
}

interface ClaudeErrorResponse {
  error?: {
    type?: string;
    message?: string;
  };
}

interface AssistantFieldRecord {
  id: string;
  name: string;
  areaSize: number | null;
  countryCode: string | null;
  regionCode: string | null;
  createdAt: Date;
  country: {
    code: string;
    nameEn: string;
  } | null;
  region: {
    code: string;
    name: string;
  } | null;
}

interface VoiceLanguageDecision {
  code: 'ar-TN' | 'ar-SA' | 'fr-FR' | 'en-US';
  label: string;
  instruction: string;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly geoService: GeoService,
  ) {} // ConversationService will be injected through ChatModule

  private readonly supportedVoiceLanguages: Array<VoiceLanguageDecision['code']> = [
    'ar-TN',
    'ar-SA',
    'fr-FR',
    'en-US',
  ];

  private normalizeLanguageCode(input?: string): VoiceLanguageDecision['code'] | undefined {
    const raw = input?.trim();
    if (!raw) {
      return undefined;
    }

    const normalized = raw.toLowerCase().replace('_', '-');

    if (normalized === 'ar-tn') return 'ar-TN';
    if (normalized === 'ar-sa') return 'ar-SA';
    if (normalized === 'fr-fr') return 'fr-FR';
    if (normalized === 'en-us') return 'en-US';

    if (normalized.startsWith('ar')) return 'ar-TN';
    if (normalized.startsWith('fr')) return 'fr-FR';
    if (normalized.startsWith('en')) return 'en-US';

    return undefined;
  }

  private detectLanguageFromMessage(message: string): VoiceLanguageDecision['code'] {
    const trimmed = message.trim();
    if (!trimmed) {
      return 'en-US';
    }

    const hasArabicChars = /[\u0600-\u06FF]/.test(trimmed);
    if (hasArabicChars) {
      return 'ar-TN';
    }

    const arabiziHints =
      /\b(chnowa|chnoua|chnowa|chnoua|barsha|barcha|mouch|msh|ya3ni|inshallah|inchallah|salam|marhba|labes|behi|3lech|3la|3lik|3andi|3andek|allah)\b/i;
    const hasArabiziToken = /\b[a-z]{2,}[2356789][a-z0-9]*\b/i;

    if (arabiziHints.test(trimmed) || hasArabiziToken.test(trimmed)) {
      return 'ar-TN';
    }

    const frenchHints = /[éèêëàâîïôùûüçœ]|\b(merci|bonjour|salut|aujourd'hui|demain|champ|ferme|mission|irrigation)\b/i;
    if (frenchHints.test(trimmed)) {
      return 'fr-FR';
    }

    return 'en-US';
  }

  private resolveVoiceLanguage(
    message: string,
    preferredLanguageCode?: string,
  ): VoiceLanguageDecision {
    const preferred = this.normalizeLanguageCode(preferredLanguageCode);
    const code = preferred ?? this.detectLanguageFromMessage(message);

    if (!this.supportedVoiceLanguages.includes(code)) {
      return {
        code: 'en-US',
        label: 'English (US)',
        instruction:
          'Respond in English only, unless the user explicitly asks you to switch language.',
      };
    }

    if (code === 'ar-TN') {
      return {
        code,
        label: 'Tunisian Arabic',
        instruction:
          'Respond in Tunisian Arabic (Darija) using Arabic script. Do not use Latin transliteration unless the user explicitly asks for it. Keep a practical, farmer-friendly tone.',
      };
    }

    if (code === 'ar-SA') {
      return {
        code,
        label: 'Arabic',
        instruction:
          'Respond in Arabic script and keep wording simple and practical for farm operations. Do not transliterate to Latin letters unless requested.',
      };
    }

    if (code === 'fr-FR') {
      return {
        code,
        label: 'French',
        instruction:
          'Respond in French only, with concise and practical explanations for farm management.',
      };
    }

    return {
      code,
      label: 'English (US)',
      instruction:
        'Respond in English only, unless the user explicitly asks you to switch language.',
    };
  }

  /**
   * Parse date references from user message
   * Handles: today, tomorrow, this week, next week, specific dates, day names, etc.
   */
  private parseDateFromMessage(message: string): Date | null {
    const lowerMessage = message.toLowerCase();
    const today = new Date();
    const currentDayOfWeek = today.getDay();

    // Today reference
    if (lowerMessage.includes('today') || lowerMessage.includes("today's")) {
      return new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }

    // Tomorrow reference
    if (lowerMessage.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
      );
    }

    // Day of week reference (Monday, Tuesday, etc.)
    const daysOfWeek = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    for (let i = 0; i < daysOfWeek.length; i++) {
      if (lowerMessage.includes(daysOfWeek[i])) {
        const targetDate = new Date(today);
        let daysAhead = i - currentDayOfWeek;
        if (daysAhead <= 0) {
          daysAhead += 7; // Next occurrence if it's today or past
        }
        targetDate.setDate(targetDate.getDate() + daysAhead);
        return new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
        );
      }
    }

    // Next week reference
    if (lowerMessage.includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return new Date(
        nextWeek.getFullYear(),
        nextWeek.getMonth(),
        nextWeek.getDate(),
      );
    }

    // This week reference
    if (lowerMessage.includes('this week')) {
      return new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }

    // Specific date format: YYYY-MM-DD, DD/MM/YYYY, Feb 17, etc.
    const datePatterns = [
      /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY or MM/DD/YYYY
      /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?/i, // DD Month YYYY or DD Month
    ];

    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        try {
          if (pattern.source.includes('january')) {
            // Month name format
            const monthNames = [
              'january',
              'february',
              'march',
              'april',
              'may',
              'june',
              'july',
              'august',
              'september',
              'october',
              'november',
              'december',
            ];
            const day = parseInt(match[1]);
            const month = monthNames.indexOf(match[2].toLowerCase()) + 1;
            const year = match[3] ? parseInt(match[3]) : today.getFullYear();
            return new Date(year, month - 1, day);
          } else if (match[1].length === 4) {
            // YYYY-MM-DD format
            return new Date(
              parseInt(match[1]),
              parseInt(match[2]) - 1,
              parseInt(match[3]),
            );
          } else {
            // DD/MM/YYYY or MM/DD/YYYY format - assume DD/MM/YYYY
            const parts = [
              parseInt(match[1]),
              parseInt(match[2]),
              parseInt(match[3]),
            ];
            return new Date(parts[2], parts[1] - 1, parts[0]);
          }
        } catch (e) {
          console.error('Date parsing error:', e);
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Get missions for a specific date
   */
  private getMissionsForDate(missions: any[], targetDate: Date): any[] {
    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59,
      999,
    );

    return missions.filter((mission) => {
      if (!mission.dueDate) return false;
      const due = new Date(mission.dueDate);
      return due >= startOfDay && due <= endOfDay;
    });
  }

  /**
   * Format date for display
   */
  private formatDateForDisplay(date: Date): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      return 'today';
    }
    if (
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear()
    ) {
      return 'tomorrow';
    }

    const daysOfWeek = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    return `${daysOfWeek[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  }

  private getAssistantSystemPrompt(): string {
    return (
      'You are Fieldly, an assistant for farm management. ' +
      'Answer clearly and briefly about the app and agricultural concepts. ' +
      'Use the provided data to answer field and mission questions. ' +
      'When asked about missions for a specific date, use the requestedDate.missions array. ' +
      'When asked about missions for today, use todayMissions. ' +
      'Display mission details including title, due date, status, priority, and progress. ' +
      'If asked about a date with no missions, say so clearly. ' +
      'If data is empty, say so and suggest creating a field or mission. ' +
      'Never output raw coordinate arrays or latitude/longitude values. ' +
      'For field location answers, use this format exactly: <Field Name> - <State>, <Country>.'
    );
  }

  private toFieldSummary(field: AssistantFieldRecord) {
    const state = field.region?.name?.trim() || field.regionCode?.trim() || 'Unknown State';
    const country =
      field.country?.nameEn?.trim() ||
      field.countryCode?.trim() ||
      'Unknown Country';

    return {
      id: field.id,
      name: field.name,
      areaSize: field.areaSize,
      state,
      country,
      location: `${field.name} - ${state}, ${country}`,
      createdAt: field.createdAt,
    };
  }

  private async loadFieldsForAssistant(userId: string) {
    let fields = await this.prismaService.field.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        areaSize: true,
        countryCode: true,
        regionCode: true,
        createdAt: true,
        country: {
          select: {
            code: true,
            nameEn: true,
          },
        },
        region: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const fieldsMissingLocation = fields.filter(
      (field) => !field.countryCode || (!field.regionCode && !field.region?.name),
    );

    if (fieldsMissingLocation.length) {
      for (const field of fieldsMissingLocation) {
        await this.geoService.resolveAndCacheFieldLocation(field.id);
      }

      fields = await this.prismaService.field.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          areaSize: true,
          countryCode: true,
          regionCode: true,
          createdAt: true,
          country: {
            select: {
              code: true,
              nameEn: true,
            },
          },
          region: {
            select: {
              code: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return (fields as AssistantFieldRecord[]).map((field) => this.toFieldSummary(field));
  }

  async chat(
    userId: string,
    message: string,
    conversationId?: string,
  ): Promise<{ reply: string; conversationId: string }> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    const apiUrl =
      this.configService.get<string>('GROQ_URL') ??
      'https://api.groq.com/openai/v1/chat/completions';
    const model =
      this.configService.get<string>('GROQ_MODEL') ?? 'llama-3.1-8b-instant';

    if (!apiKey) {
      return {
        reply: 'Chat assistant is not configured. Please set GROQ_API_KEY.',
        conversationId: conversationId || '',
      };
    }

    const [fields, missions] = await Promise.all([
      this.loadFieldsForAssistant(userId),
      this.prismaService.mission.findMany({
        where: { userId },
        select: {
          id: true,
          fieldId: true,
          title: true,
          description: true,
          missionType: true,
          status: true,
          priority: true,
          dueDate: true,
          progress: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    );

    const todayMissions = missions.filter((mission) => {
      if (!mission.dueDate) return false;
      const due = new Date(mission.dueDate);
      return due >= startOfDay && due <= endOfDay;
    });

    // Parse date from user message
    const requestedDate = this.parseDateFromMessage(message);
    let requestedDateMissions: any[] = [];
    let requestedDateString = '';

    if (requestedDate) {
      requestedDateMissions = this.getMissionsForDate(missions, requestedDate);
      requestedDateString = this.formatDateForDisplay(requestedDate);
    }

    const context = {
      today: today.toISOString().split('T')[0],
      todayMissions,
      fields,
      missions,
      requestedDate: requestedDateString
        ? {
            date: requestedDateString,
            missions: requestedDateMissions,
          }
        : null,
    };

    const systemPrompt = this.getAssistantSystemPrompt();

    try {
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), 30000); // 30 second timeout

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'system',
              content: `Context JSON: ${JSON.stringify(context)}`,
            },
            { role: 'user', content: message },
          ],
          temperature: 0.2,
        }),
        signal: abortController.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          reply: 'Chat service error. Please try again.',
          conversationId: conversationId || '',
        };
      }

      const data = (await response.json()) as GroqResponse;
      const content = data.choices?.[0]?.message?.content;
      const reply = content?.trim() ?? 'No response from assistant.';
      return {
        reply,
        conversationId: conversationId || '',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Network timeout or connection error
      if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ENETUNREACH')
      ) {
        return {
          reply:
            'Chat service is temporarily unavailable. Please check your internet connection and try again.',
          conversationId: conversationId || '',
        };
      }

      // API key or authentication error
      if (
        errorMessage.includes('401') ||
        errorMessage.includes('Unauthorized')
      ) {
        return {
          reply:
            'Chat assistant authentication failed. Please contact support.',
          conversationId: conversationId || '',
        };
      }

      // Generic error
      return {
        reply: `Chat service error: ${errorMessage}. Please try again later.`,
        conversationId: conversationId || '',
      };
    }
  }

  async voiceChat(
    userId: string,
    message: string,
    conversationId?: string,
    preferredLanguageCode?: string,
  ): Promise<{ reply: string; conversationId: string; languageCode: string }> {
    const resolvedLanguage = this.resolveVoiceLanguage(
      message,
      preferredLanguageCode,
    );

    const apiKey = this.configService.get<string>('CLAUDE_API_KEY');
    const configuredModel =
      this.configService.get<string>('CLAUDE_MODEL')?.trim() ?? '';
    const primaryModel = configuredModel || 'claude-3-5-haiku-latest';
    const modelCandidates = Array.from(
      new Set([
        primaryModel,
        'claude-3-5-haiku-latest',
        'claude-3-haiku-20240307',
      ]),
    );

    if (!apiKey) {
      return {
        reply:
          'Voice assistant is not configured. Please set CLAUDE_API_KEY.',
        conversationId: conversationId || '',
        languageCode: resolvedLanguage.code,
      };
    }

    const [fields, missions] = await Promise.all([
      this.loadFieldsForAssistant(userId),
      this.prismaService.mission.findMany({
        where: { userId },
        select: {
          id: true,
          fieldId: true,
          title: true,
          description: true,
          missionType: true,
          status: true,
          priority: true,
          dueDate: true,
          progress: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    );

    const todayMissions = missions.filter((mission) => {
      if (!mission.dueDate) return false;
      const due = new Date(mission.dueDate);
      return due >= startOfDay && due <= endOfDay;
    });

    const requestedDate = this.parseDateFromMessage(message);
    let requestedDateMissions: any[] = [];
    let requestedDateString = '';

    if (requestedDate) {
      requestedDateMissions = this.getMissionsForDate(
        missions,
        requestedDate,
      );
      requestedDateString = this.formatDateForDisplay(requestedDate);
    }

    // Keep voice context compact to reduce latency and prevent prompt-size issues.
    const context = {
      today: today.toISOString().split('T')[0],
      todayMissions,
      fields: fields.slice(0, 20),
      missions: missions.slice(0, 80),
      requestedDate: requestedDateString
        ? {
            date: requestedDateString,
            missions: requestedDateMissions,
          }
        : null,
    };

    const systemPrompt =
      `${this.getAssistantSystemPrompt()} ` +
      `The user's target language is ${resolvedLanguage.label} (${resolvedLanguage.code}). ` +
      `${resolvedLanguage.instruction} ` +
      'Always reply in the same language as the user request. If the input is mixed-language, prefer the target language above.';

    let hadModelError = false;
    let lastReplyMessage = 'Voice chat service error. Please try again.';

    try {
      for (const model of modelCandidates) {
        const abortController = new AbortController();
        const timeout = setTimeout(() => abortController.abort(), 30000);

        let response: Response;
        try {
          response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model,
              max_tokens: 400,
              temperature: 0.2,
              system: `${systemPrompt}\nContext JSON: ${JSON.stringify(context)}`,
              messages: [
                {
                  role: 'user',
                  content: [{ type: 'text', text: message }],
                },
              ],
            }),
            signal: abortController.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        if (response.ok) {
          const data = (await response.json()) as ClaudeResponse;
          const content = data.content?.find((block) => block.type === 'text')?.text;
          const reply = content?.trim() ?? 'No response from assistant.';

          return {
            reply,
            conversationId: conversationId || '',
            languageCode: resolvedLanguage.code,
          };
        }

        const rawError = await response.text();
        let parsedMessage = rawError;

        try {
          const parsed = JSON.parse(rawError) as ClaudeErrorResponse;
          parsedMessage =
            parsed.error?.message || parsed.error?.type || rawError;
        } catch {
          // Keep raw error body when it's not JSON.
        }

        const normalizedError = parsedMessage.toLowerCase();
        const isModelError =
          response.status === 404 ||
          ((normalizedError.includes('model') ||
            normalizedError.includes('claude')) &&
            (normalizedError.includes('not found') ||
              normalizedError.includes('does not exist') ||
              normalizedError.includes('invalid') ||
              normalizedError.includes('unavailable')));

        if (response.status === 401 || response.status === 403) {
          console.error(
            `[ChatService.voiceChat] Claude auth failed (${response.status}) with model ${model}: ${parsedMessage}. ` +
              `Key prefix=${apiKey.slice(0, 12)}… len=${apiKey.length}. ` +
              `Likely revoked/expired — rotate at console.anthropic.com and update CLAUDE_API_KEY in .env, then restart the backend.`,
          );
          return {
            reply:
              'Voice assistant authentication failed. Please verify CLAUDE_API_KEY.',
            conversationId: conversationId || '',
            languageCode: resolvedLanguage.code,
          };
        }

        if (response.status === 429) {
          console.warn(
            `[ChatService.voiceChat] Claude rate-limited (429) with model ${model}: ${parsedMessage}`,
          );
          return {
            reply:
              'Voice assistant is rate-limited right now. Please try again in a few seconds.',
            conversationId: conversationId || '',
            languageCode: resolvedLanguage.code,
          };
        }

        if (isModelError) {
          hadModelError = true;
          lastReplyMessage =
            'Voice model unavailable for this key. Retrying with another compatible model...';
          continue;
        }

        console.error(
          `[ChatService.voiceChat] Claude API error (${response.status}) with model ${model}: ${parsedMessage}`,
        );
        lastReplyMessage =
          'Voice assistant is temporarily unavailable. Please try again.';
        break;
      }

      if (hadModelError) {
        return {
          reply:
            'Claude model is not available for your account. Set CLAUDE_MODEL to claude-3-5-haiku-latest and try again.',
          conversationId: conversationId || '',
          languageCode: resolvedLanguage.code,
        };
      }

      return {
        reply: lastReplyMessage,
        conversationId: conversationId || '',
        languageCode: resolvedLanguage.code,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ENETUNREACH')
      ) {
        return {
          reply:
            'Voice assistant is temporarily unavailable. Please check your internet connection and try again.',
          conversationId: conversationId || '',
          languageCode: resolvedLanguage.code,
        };
      }

      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        return {
          reply:
            'Voice assistant authentication failed. Please contact support.',
          conversationId: conversationId || '',
          languageCode: resolvedLanguage.code,
        };
      }

      return {
        reply: `Voice chat service error: ${errorMessage}. Please try again later.`,
        conversationId: conversationId || '',
        languageCode: resolvedLanguage.code,
      };
    }
  }
}
