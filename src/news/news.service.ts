import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly apiKey = '6fb751d29d4445cb85a0efb2d5fe3233'; // Replace with your real API key
  private readonly apiUrl = 'https://newsapi.org/v2/everything';

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  private readonly categoryKeywords: Record<string, string> = {
    all: 'agriculture OR farming OR "crop disease" OR agronomy',
    pests: 'pest OR pesticide OR insect OR aphid OR blight OR fungus OR weed OR "crop protection"',
    market: '"crop price" OR "grain market" OR "farm market" OR "agricultural commodity" OR "food price"',
    technology: 'agtech OR "precision farming" OR "smart farming" OR "agricultural technology" OR drone OR sensor',
  };

  async getNews(farmerId?: string, category?: string) {
    try {
      const cat = category && category !== 'all' ? category : 'all';
      let baseQuery = this.categoryKeywords[cat] ?? this.categoryKeywords['all'];

      // Smart Crop Filtering: append crop names as additional context
      if (farmerId) {
        const parcels = await this.prisma.parcel.findMany({
          where: { farmerId },
          include: { crops: true },
        });

        const cropNames = new Set<string>();
        parcels.forEach((p) =>
          p.crops.forEach((c) => cropNames.add(c.cropName)),
        );

        if (cropNames.size > 0) {
          const cropsQuery = Array.from(cropNames).join(' OR ');
          baseQuery = `(${cropsQuery}) OR (${baseQuery})`;
        }
      }

      this.logger.log(`Fetching news [${cat}] with query: ${baseQuery}`);

      const response = await firstValueFrom(
        this.httpService.get(this.apiUrl, {
          params: {
            q: baseQuery,
            apiKey: this.apiKey,
            language: 'en',
            sortBy: 'relevancy',
            pageSize: 20,
          },
        }),
      );

      return response.data.articles.map((article: any) => ({
        title: article.title,
        description: article.description,
        imageUrl: article.urlToImage || '',
        source: article.source?.name || 'Unknown Source',
        url: article.url,
      }));
    } catch (error) {
      this.logger.error('Error fetching news:', error.message);
      return [];
    }
  }
}
