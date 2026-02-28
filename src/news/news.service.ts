import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NewsService {
    private readonly logger = new Logger(NewsService.name);
    private readonly apiKey = '6fb751d29d4445cb85a0efb2d5fe3233'; // Replace with your real API key
    private readonly apiUrl = 'https://newsapi.org/v2/everything'; // Example using NewsAPI.org

    constructor(private readonly httpService: HttpService) { }

    async getNews() {
        try {
            const query = 'agriculture OR farming OR "plant disease"';
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

            // Map the raw NewsAPI response to the standardized format
            // Note: Adjust mapping based on the chosen provider (NewsAPI, GNews, NewsData)
            return response.data.articles.map((article: any) => ({
                title: article.title,
                description: article.description,
                imageUrl: article.urlToImage || '',
                source: article.source?.name || 'Unknown Source',
                url: article.url,
            }));
        } catch (error) {
            this.logger.error('Error fetching news:', error.message);
            if (error.response) {
                this.logger.error('API Response Error:', error.response.data);
            }
            return [];
        }
    }
}
