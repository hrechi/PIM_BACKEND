import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
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
import { SoilModule } from './modules/soil/soil.module';
import { SoilMeasurement } from './modules/soil/soil.entity';
import { StaffModule } from './staff/staff.module';
import { SecurityModule } from './security/security.module';
import { IncidentModule } from './incident/incident.module';
import { AnimalsModule } from './animals/animals.module';
import { ParcelsModule } from './parcels/parcels.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'fieldly',
      entities: [SoilMeasurement],
      synchronize: true,
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
    AnimalsModule,
    ParcelsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
