import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';

@Module({
    imports: [HttpModule, PrismaModule],
    controllers: [NewsController, BookmarksController],
    providers: [NewsService, BookmarksService],
})
export class NewsModule { }
