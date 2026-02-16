import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {} // ConversationService will be injected through ChatModule

  /**
   * Parse date references from user message
   * Handles: today, tomorrow, this week, next week, specific dates, day names, etc.
   */
  private parseDateFromMessage(message: string): Date | null {
    const lowerMessage = message.toLowerCase();
    const today = new Date();
    const currentDayOfWeek = today.getDay();

    // Today reference
    if (
      lowerMessage.includes('today') ||
      lowerMessage.includes("today's")
    ) {
      return new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
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
      return new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
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
            const month =
              monthNames.indexOf(match[2].toLowerCase()) + 1;
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
  private getMissionsForDate(
    missions: any[],
    targetDate: Date,
  ): any[] {
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
      this.prismaService.field.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          areaSize: true,
          areaCoordinates: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
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
      requestedDateMissions = this.getMissionsForDate(
        missions,
        requestedDate,
      );
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

    const systemPrompt =
      'You are Fieldly, an assistant for farm management. ' +
      'Answer clearly and briefly about the app and agricultural concepts. ' +
      'Use the provided data to answer field and mission questions. ' +
      'When asked about missions for a specific date, use the requestedDate.missions array. ' +
      'When asked about missions for today, use todayMissions. ' +
      'Display mission details including title, due date, status, priority, and progress. ' +
      'If asked about a date with no missions, say so clearly. ' +
      'If data is empty, say so and suggest creating a field or mission.';

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
      const errorMessage = error instanceof Error ? error.message : String(error);

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
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
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
}
