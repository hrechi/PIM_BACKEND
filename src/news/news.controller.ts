import { Controller, Get, Query } from '@nestjs/common';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
    constructor(private readonly newsService: NewsService) { }

    @Get()
    async getNews(
        @Query('farmerId') farmerId?: string,
        @Query('category') category?: string,
    ) {
        return this.newsService.getNews(farmerId, category);
    }
}
