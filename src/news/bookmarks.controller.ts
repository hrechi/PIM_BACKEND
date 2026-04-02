import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';

@Controller('bookmarks')
export class BookmarksController {
    constructor(private readonly bookmarksService: BookmarksService) { }

    @Post()
    async saveArticle(@Body() data: {
        title: string;
        description?: string;
        url: string;
        imageUrl?: string;
        source: string;
        farmerId: string;
    }) {
        return this.bookmarksService.saveArticle(data);
    }

    @Get(':farmerId')
    async getBookmarks(@Param('farmerId') farmerId: string) {
        return this.bookmarksService.getBookmarks(farmerId);
    }

    @Delete(':id')
    async removeBookmark(@Param('id') id: string) {
        return this.bookmarksService.removeBookmark(id);
    }
}
