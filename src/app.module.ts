/**
 * ============================================================
 * APP MODULE — Racine de l'application NestJS (PastureAI / Fieldly)
 * ============================================================
 *
 * Ce fichier est le point d'entrée de toute l'architecture backend.
 * Il orchestre deux ORM en parallèle :
 *   • Prisma  → ORM principal pour toutes les entités métier
 *   • TypeORM → utilisé uniquement pour SoilMeasurement (entité héritée)
 *
 * Architecture modulaire NestJS :
 *   Chaque domaine métier (animaux, finances, IA, capteurs…) est encapsulé
 *   dans son propre module, ce qui garantit la séparation des responsabilités
 *   et facilite les tests unitaires.
 *
 * Modules enregistrés (30+) :
 *   Auth, User, Field, Animals, AnimalHealth, Vaccines, MilkProduction,
 *   Soil, SoilIntelligence, Irrigation, Weather, Finance, Expenses,
 *   Revenues, Assets, AI, Robots, Sensors, Community, Catalogues…
 * ============================================================
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import * as process from 'process';
import { DataSource, DataSourceOptions } from 'typeorm';

// ── Contrôleur et service racine ──────────────────────────────────────────
import { AppController } from './app.controller';
import { AppService } from './app.service';

// ── ORM & Infrastructure ──────────────────────────────────────────────────
import { PrismaModule } from './prisma/prisma.module';
import { SoilMeasurement } from './soil/soil.entity'; // Entité TypeORM héritée

// ── Authentification & Utilisateurs ──────────────────────────────────────
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { EmailModule } from './email/email.module';
import { StaffModule } from './staff/staff.module';

// ── Gestion des champs & parcelles ───────────────────────────────────────
import { FieldModule } from './field/field.module';
import { MissionModule } from './mission/mission.module';
import { ParcelsModule } from './parcels/parcels.module';
import { GeoModule } from './geo/geo.module';

// ── Communication & IA conversationnelle ─────────────────────────────────
import { ChatModule } from './chat/chat.module';
import { MechanicChatModule } from './mechanic-chat/mechanic-chat.module';
import { ConversationModule } from './conversation/conversation.module';

// ── Sol & Intelligence agronomique ───────────────────────────────────────
import { SoilModule } from './soil/soil.module';
import { SoilIntelligenceModule } from './soil-intelligence/soil-intelligence.module';

// ── Sécurité & Incidents ──────────────────────────────────────────────────
import { SecurityModule } from './security/security.module';
import { IncidentModule } from './incident/incident.module';
import { SirenModule } from './siren/siren.module';

// ── Notifications ─────────────────────────────────────────────────────────
import { NotificationModule } from './notification/notification.module';

// ── Gestion des animaux & santé ───────────────────────────────────────────
import { AnimalsModule } from './animals/animals.module';
import { AnimalHealthModule } from './animal-health/animal-health.module'; // IA diagnostic
import { MedicalEventsModule } from './medical-events/medical-events.module';
import { VaccinesModule } from './vaccines/vaccines.module';
import { MilkProductionModule } from './milk-production/milk-production.module';

// ── Météo & Irrigation ────────────────────────────────────────────────────
import { WeatherModule } from './weather/weather.module';
import { IrrigationModule } from './irrigation/irrigation.module';

// ── Actualités & Contenu ──────────────────────────────────────────────────
import { NewsModule } from './news/news.module';
import { ShortsModule } from './shorts/shorts.module';
import { CommunityModule } from './community/community.module';

// ── Analytique & Calendrier ───────────────────────────────────────────────
import { AnalyticsModule } from './analytics/analytics.module';
import { CalendarModule } from './calendar/calendar.module';
import { HealthScoreModule } from './health-score/health-score.module';
import { ReportsModule } from './reports/reports.module';

// ── Finance (dépenses + revenus manuels) ─────────────────────────────────
import { ExpensesModule } from './expenses/expenses.module';
import { FinanceModule } from './finance/finance.module';
import { RevenuesModule } from './revenues/revenues.module'; // Ajouté : revenus non-animaux

// ── Optimisation agricole ─────────────────────────────────────────────────
import { HarvestOptimizationModule } from './harvest-optimization/harvest-optimization.module';
import { QuizModule } from './quiz/quiz.module';

// ── Équipements & Maintenance prédictive ─────────────────────────────────
import { AssetModule } from './asset/asset.module';

// ── IA & Modèles ML ───────────────────────────────────────────────────────
import { AiModule } from './ai/ai.module';
import { AeroTwinModule } from './aerotwin/aerotwin.module';

// ── Robotique & Télémétrie ────────────────────────────────────────────────
import { RobotsModule } from './robots/robots.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { SensorsModule } from './sensors/sensors.module';

// ── Catalogues de vente ───────────────────────────────────────────────────
import { CataloguesModule } from './catalogues/catalogues.module';

// ── Facturation & Évaluations ─────────────────────────────────────────────
import { RatingsModule } from './ratings/ratings.module';
import { BillingModule } from './billing/billing.module';
import { AdminModule } from './admin/admin.module';

 
@Module({
  imports: [
    // ── Configuration globale (variables d'environnement .env) ────────────
    // isGlobal: true → accessible dans tous les modules sans ré-import
    ConfigModule.forRoot({ isGlobal: true }),

    // ── Planificateur de tâches CRON ──────────────────────────────────────
    // Utilisé par HealthCronService pour les diagnostics IA automatiques
    ScheduleModule.forRoot(),

    // ── Serveur de fichiers statiques (photos animaux, reçus…) ───────────
    // Les uploads sont servis depuis /uploads sur l'URL publique
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // ── TypeORM (uniquement pour SoilMeasurement — entité héritée) ────────
    // Prisma gère tout le reste. TypeORM est maintenu en lecture seule
    // (synchronize: false) pour éviter les conflits de schéma.
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [SoilMeasurement],
        synchronize: false, // Prisma est maître du schéma
      }),
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('TypeORM options are required to initialize DataSource.');
        }

        const dataSource = new DataSource(options as DataSourceOptions);
        await dataSource.initialize();

        // ── Extensions PostgreSQL nécessaires au démarrage ────────────────
        // pgcrypto : génération d'UUID côté DB (gen_random_uuid())
        await dataSource.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

        // pgvector : index vectoriel pour la similarité des sols (cosine)
        // Si non disponible, le système fonctionne en mode dégradé (Python cosine)
        let hasVectorExtension = true;
        try {
          await dataSource.query('CREATE EXTENSION IF NOT EXISTS vector;');
        } catch {
          hasVectorExtension = false;
          console.warn(
            '[SoilIntelligence] pgvector non disponible — mode fallback (similarité Python).',
          );
        }

        // ── Colonnes additionnelles pour soil_measurements ────────────────
        // ADD COLUMN IF NOT EXISTS → idempotent, sans perte de données
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

        // ── Défaut DB pour soil_measurements.id ───────────────────────────
        // TypeORM omet l'id sur INSERT → sans défaut DB on obtient NOT NULL violation
        await dataSource.query(`
          ALTER TABLE soil_measurements
          ALTER COLUMN id SET DEFAULT gen_random_uuid();
        `);

        // ── Colonne vecteur (7 dimensions : pH, humidité, N, P, K, temp, conductivité) ──
        if (hasVectorExtension) {
          await dataSource.query(`
            ALTER TABLE soil_measurements
            ADD COLUMN IF NOT EXISTS vector vector(7);
          `);
        }

        // ── Table des alertes météo-sol ────────────────────────────────────
        // Créée ici car elle dépend de parcels et soil_measurements (FK cross-ORM)
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

        // ── Correction de drift de type (UUID → TEXT) ─────────────────────
        // Si la table existait avec soil_measurement_id en UUID (ancienne version),
        // on la convertit en TEXT pour correspondre au type actuel de soil_measurements.id
        await dataSource.query(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'soil_weather_alerts'
                AND column_name = 'soil_measurement_id'
                AND data_type = 'uuid'
            ) THEN
              ALTER TABLE soil_weather_alerts
                ALTER COLUMN soil_measurement_id TYPE TEXT USING soil_measurement_id::text;
            END IF;
          END$$;
        `);

        // ── Index vectoriel IVFFlat pour la recherche de similarité ──────
        // IVFFlat (Inverted File Flat) : index approximatif, très rapide sur grands datasets
        if (hasVectorExtension) {
          await dataSource.query(`
            CREATE INDEX IF NOT EXISTS idx_soil_measurements_vector
            ON soil_measurements USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);
          `);
        }

        // ── Index composite pour les alertes sol (requêtes fréquentes) ───
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
    RevenuesModule,
    CataloguesModule,
    SoilIntelligenceModule,
    AssetModule,
    AiModule,
    RobotsModule,
    TelemetryModule,
    SensorsModule,
    AnimalHealthModule,
    MedicalEventsModule,
    RatingsModule,
    BillingModule,
    AdminModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
