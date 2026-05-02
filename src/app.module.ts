import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import * as process from 'process';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { EmailModule } from './email/email.module';
import { FieldModule } from './field/field.module';
import { MissionModule } from './mission/mission.module';
import { ChatModule } from './chat/chat.module';
import { MechanicChatModule } from './mechanic-chat/mechanic-chat.module';
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
import { CommunityModule } from './community/community.module';
import { ExpensesModule } from './expenses/expenses.module';
import { FinanceModule } from './finance/finance.module';
import { HarvestOptimizationModule } from './harvest-optimization/harvest-optimization.module';
import { QuizModule } from './quiz/quiz.module';
import { AeroTwinModule } from './aerotwin/aerotwin.module';
import { AssetModule } from './asset/asset.module';
import { AiModule } from './ai/ai.module';

import { SoilIntelligenceModule } from './soil-intelligence/soil-intelligence.module';
import { CataloguesModule } from './catalogues/catalogues.module';
import { RobotsModule } from './robots/robots.module';
import { TelemetryModule } from './telemetry/telemetry.module';

 
@Module({
  imports: [ 
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
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
        // Schema is owned by Prisma. Keep TypeORM read-only to avoid drift fights
        // (e.g. trying to coerce soil_measurements.id back to uuid).
        synchronize: false,
      }),
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('TypeORM options are required to initialize DataSource.');
        }

        const dataSource = new DataSource(options as DataSourceOptions);
        await dataSource.initialize();

        // Ensure extensions and schema additions for soil intelligence are available at startup.
        await dataSource.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
        let hasVectorExtension = true;
        try {
          await dataSource.query('CREATE EXTENSION IF NOT EXISTS vector;');
        } catch {
          hasVectorExtension = false;
          // Keep app startup resilient even when pgvector is not installed.
          // Fingerprint endpoint falls back to Python cosine similarity until pgvector is available.
          console.warn(
            '[SoilIntelligence] pgvector extension is not available. Running in fallback mode (no DB vector index).',
          );
        }

        await dataSource.query(`
          ALTER TABLE soil_measurements
          ADD COLUMN IF NOT EXISTS parcel_id TEXT,
          ADD COLUMN IF NOT EXISTS legacy_code VARCHAR(20),
          ADD COLUMN IF NOT EXISTS vector_data JSONB,
          ADD COLUMN IF NOT EXISTS parcel_location VARCHAR(100),
          ADD COLUMN IF NOT EXISTS region VARCHAR(100) DEFAULT 'Tunisia',
          ADD COLUMN IF NOT EXISTS recovery_action TEXT,
          ADD COLUMN IF NOT EXISTS recovery_duration_weeks INTEGER,
          ADD COLUMN IF NOT EXISTS outcome VARCHAR(50);
        `);

        // Ensure DB-side default for soil_measurements.id (TypeORM omits id on
        // INSERT for @PrimaryGeneratedColumn('uuid'), and Prisma's @default(uuid())
        // is application-side only; without a DB default we get NOT NULL violations.
        await dataSource.query(`
          ALTER TABLE soil_measurements
          ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
        `);

        if (hasVectorExtension) {
          await dataSource.query(`
            ALTER TABLE soil_measurements
            ADD COLUMN IF NOT EXISTS vector vector(7);
          `);
        }

        await dataSource.query(`
          CREATE TABLE IF NOT EXISTS soil_weather_alerts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            parcel_id TEXT REFERENCES parcels(id),
            soil_measurement_id TEXT REFERENCES soil_measurements(id),
            alert_type VARCHAR(50),
            severity VARCHAR(20),
            message TEXT,
            action TEXT,
            weather_data JSONB,
            soil_data JSONB,
            triggered_at TIMESTAMP DEFAULT NOW(),
            is_read BOOLEAN DEFAULT FALSE
          );
        `);

        if (hasVectorExtension) {
          await dataSource.query(`
            CREATE INDEX IF NOT EXISTS idx_soil_measurements_vector
            ON soil_measurements USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);
          `);
        }

        await dataSource.query(`
          CREATE INDEX IF NOT EXISTS idx_soil_weather_alerts_parcel_read
          ON soil_weather_alerts (parcel_id, is_read, triggered_at DESC);
        `);

        return dataSource;
      },
    }),
    PrismaModule,
    EmailModule,
    AuthModule,
    UserModule,
    FieldModule,
    MissionModule,
    ChatModule,
    MechanicChatModule,
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
    AeroTwinModule,
    CommunityModule,
     ExpensesModule,
    FinanceModule,
    CataloguesModule,
    SoilIntelligenceModule,
    AssetModule,
    AiModule,
    RobotsModule,
    TelemetryModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
