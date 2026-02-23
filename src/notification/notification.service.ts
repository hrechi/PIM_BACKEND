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
   * @param fcmToken  Device FCM token stored on the user record
   * @param incident  Incident details to include in the payload
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

      // Visible notification (shown in system tray when app is in background)
      notification: {
        title,
        body,
      },

      // Data payload (always delivered, used by Flutter when app is open)
      data: {
        incidentId: incident.id,
        type: incident.type,
        image_url: imageUrl,
        title,
        body,
      },

      // Android-specific: high priority + alarm sound
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

      // iOS-specific
      apns: {
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true,
            badge: 1,
          },
        },
        headers: {
          'apns-priority': '10',
        },
      },
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log(`✅ Push sent for incident ${incident.id} → ${response}`);
    } catch (err) {
      this.logger.error(`❌ Push failed for incident ${incident.id}:`, err);
    }
  }
}
