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
    ) { }

    async getNews(farmerId?: string, category?: string) {
        try {
            let query = 'agriculture OR farming OR "plant disease"';

            // 1. Smart Crop Filtering
            if (farmerId) {
                const parcels = await this.prisma.parcel.findMany({
                    where: { farmerId },
                    include: { crops: true },
                });

                const cropNames = new Set<string>();
                parcels.forEach(p => p.crops.forEach(c => cropNames.add(c.cropName)));

                if (cropNames.size > 0) {
                    const cropsQuery = Array.from(cropNames).join(' OR ');
                    query = `(${cropsQuery}) AND (${query})`;
                }
            }

            // 2. Category Filtering
            if (category && category !== 'all') {
                query = `(${category}) AND (${query})`;
            }

            this.logger.log(`Fetching news with query: ${query}`);

            const response = await firstValueFrom(
                this.httpService.get(this.apiUrl, {
                    params: {
                        qInTitle: query,
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
