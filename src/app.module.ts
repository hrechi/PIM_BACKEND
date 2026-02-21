import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { EmailModule } from './email/email.module';
import { StaffModule } from './staff/staff.module';
import { SecurityModule } from './security/security.module';
import { IncidentModule } from './incident/incident.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    EmailModule,
    AuthModule,
    UserModule,
    StaffModule,
    SecurityModule,
    IncidentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
