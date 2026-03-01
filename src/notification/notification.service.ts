import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private initialized = false;

  onModuleInit() {
    try {
      const serviceAccountPath = path.join(
        process.cwd(),
        'firebase-service-account.json',
      );

      if (!fs.existsSync(serviceAccountPath)) {
        this.logger.warn(
          '⚠ firebase-service-account.json not found — push notifications disabled',
        );
        return;
      }

      if (admin.apps.length === 0) {
        const serviceAccount = JSON.parse(
          fs.readFileSync(serviceAccountPath, 'utf-8'),
        );
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.initialized = true;
        this.logger.log('✅ Firebase Admin initialized');
      } else {
        this.initialized = true;
      }
    } catch (err) {
      this.logger.error('❌ Firebase Admin init failed:', err);
    }
  }

  /**
   * Send a security incident push notification to a specific device.
   */
  async sendIncidentAlert(
    fcmToken: string,
    incident: {
      id: string;
      type: string;
      imagePath: string;
    },
  ): Promise<void> {
    if (!this.initialized) {
      this.logger.warn('Firebase not initialized — skipping push notification');
      return;
    }

    const apiBase = process.env.API_BASE_URL || 'http://192.168.1.12:3000';
    const imageUrl = `${apiBase}${incident.imagePath}`;

    const isIntruder = incident.type === 'intruder';
    const title = isIntruder ? '🚨 INTRUDER DETECTED' : '🐾 ANIMAL DETECTED';
    const body = isIntruder
      ? 'An unknown person was detected on your farm!'
      : 'An animal was detected in a restricted area!';

    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: { title, body },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        screen: 'INCIDENT_DETAILS',
        incidentId: incident.id,
        type: incident.type,
        image_url: imageUrl,
        title,
        body,
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'alarm',
          channelId: 'security_alerts',
          priority: 'max',
          defaultSound: false,
          color: '#FF0000',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true,
            badge: 1,
          },
        },
        headers: { 'apns-priority': '10' },
      },
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log(`✅ Push sent for incident ${incident.id} → ${response}`);
    } catch (err) {
      this.logger.error(`❌ Push failed for incident ${incident.id}:`, err);
    }
  }

  /**
   * Generic FCM send — utilisé par VaccineReminderCron et tout autre module.
   */
  async sendToDevice(
    fcmToken: string,
    payload: {
      notification: { title: string; body: string };
      data?: Record<string, string>;
    },
  ): Promise<void> {
    if (!this.initialized) {
      this.logger.warn('Firebase not initialized — skipping push notification');
      return;
    }

    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: payload.notification,
      data: payload.data ?? {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'vaccine_reminders',
          sound: 'default',
        },
      },
      apns: {
        payload: { aps: { sound: 'default', contentAvailable: true } },
        headers: { 'apns-priority': '10' },
      },
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log(`✅ Push sent → ${response}`);
    } catch (err) {
      this.logger.error('❌ Push failed:', err);
    }
  }
}
