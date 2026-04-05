import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import * as process from 'process';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { EmailModule } from './email/email.module';
import { FieldModule } from './field/field.module';
import { MissionModule } from './mission/mission.module';
import { ChatModule } from './chat/chat.module';
import { ConversationModule } from './conversation/conversation.module';
import { SoilModule } from './soil/soil.module';
import { SoilMeasurement } from './soil/soil.entity';
import { StaffModule } from './staff/staff.module';
import { SecurityModule } from './security/security.module';
import { IncidentModule } from './incident/incident.module';
import { NotificationModule } from './notification/notification.module';
import { AnimalsModule } from './animals/animals.module';
import { ParcelsModule } from './parcels/parcels.module';
import { SirenModule } from './siren/siren.module';
import { MilkProductionModule } from './milk-production/milk-production.module';
import { WeatherModule } from './weather/weather.module';
import { IrrigationModule } from './irrigation/irrigation.module';
import { NewsModule } from './news/news.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CalendarModule } from './calendar/calendar.module';
import { HealthScoreModule } from './health-score/health-score.module';
import { GeoModule } from './geo/geo.module';
import { VaccinesModule } from './vaccines/vaccines.module';
import { ReportsModule } from './reports/reports.module';
import { ShortsModule } from './shorts/shorts.module';
import { HarvestOptimizationModule } from './harvest-optimization/harvest-optimization.module';
import { QuizModule } from './quiz/quiz.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      // process.cwd() always points to the project root regardless of __dirname
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }), 
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [SoilMeasurement],
        synchronize: true, // Be careful with this in production
      }),
    }),
    PrismaModule,
    EmailModule,
    AuthModule,
    UserModule,
    FieldModule,
    MissionModule,
    ChatModule,
    ConversationModule,
    SoilModule,
    StaffModule,
    SecurityModule,
    IncidentModule,
    NotificationModule,
    AnimalsModule,
    ParcelsModule,
    SirenModule,
    MilkProductionModule,
    WeatherModule,
    IrrigationModule,
    NewsModule,
    AnalyticsModule,
    CalendarModule,
    HealthScoreModule,
    GeoModule,
    VaccinesModule,
    ReportsModule,
    ShortsModule,
    HarvestOptimizationModule,
    QuizModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
