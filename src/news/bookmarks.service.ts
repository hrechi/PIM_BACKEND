import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookmarksService {
    constructor(private readonly prisma: PrismaService) { }

    async saveArticle(data: {
        title: string;
        description?: string;
        url: string;
        imageUrl?: string;
        source: string;
        farmerId: string;
    }) {
        return this.prisma.savedArticle.create({
            data,
        });
    }

    async getBookmarks(farmerId: string) {
        return this.prisma.savedArticle.findMany({
            where: { farmerId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async removeBookmark(id: string) {
        return this.prisma.savedArticle.delete({
            where: { id },
        });
    }
}
