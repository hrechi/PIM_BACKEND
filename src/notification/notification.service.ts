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

    const apiBase = process.env.API_BASE_URL || 'http://192.168.1.17:3000';
    const imageUrl = `${apiBase}${incident.imagePath}`;

    const { title, body } = this.getNotificationContent(incident.type);

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

  /**
   * Send a Soil Weather Alert push notification.
   */
  async sendSoilWeatherAlert(
    fcmToken: string,
    alert: {
      alertId: string;
      parcelId: string;
      severity: string;
      alertType: string;
      message: string;
      action?: string | null;
    },
  ): Promise<void> {
    if (!this.initialized) {
      this.logger.warn('Firebase not initialized — skipping push notification');
      return;
    }

    const normalizedSeverity = (alert.severity || 'LOW').toUpperCase();
    const emoji =
      normalizedSeverity === 'CRITICAL'
        ? '🚨'
        : normalizedSeverity === 'HIGH'
          ? '⚠️'
          : normalizedSeverity === 'MEDIUM'
            ? '🟠'
            : 'ℹ️';

    const title = `${emoji} Soil Alert (${normalizedSeverity})`;
    const body = alert.message;

    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: { title, body },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        screen: 'SOIL_ALERTS',
        type: 'SOIL_WEATHER_ALERT',
        alertId: alert.alertId,
        parcelId: alert.parcelId,
        severity: normalizedSeverity,
        alertType: alert.alertType,
        message: alert.message,
        action: alert.action || '',
        title,
        body,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'soil_alerts',
          sound: 'default',
          priority: 'max',
          color: '#D32F2F',
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
      this.logger.log(`✅ Soil alert push sent → ${response}`);
    } catch (err) {
      this.logger.error('❌ Soil alert push failed:', err);
    }
  }

  private getNotificationContent(type: string): {
    title: string;
    body: string;
  } {
    switch (type) {
      case 'intruder':
        return {
          title: '🚨 INTRUDER DETECTED',
          body: 'An unknown person was detected on your farm!',
        };
      case 'animal':
        return {
          title: '🐾 ANIMAL DETECTED',
          body: 'An animal was detected in a restricted area!',
        };
      case 'acoustic_glass':
        return {
          title: '🔊 GLASS BREAK DETECTED',
          body: 'A glass breaking sound was detected on your farm!',
        };
      case 'acoustic_loud':
        return {
          title: '🔊 LOUD NOISE DETECTED',
          body: 'An unusually loud noise was detected on your farm!',
        };
      case 'acoustic_anomaly':
        return {
          title: '🔊 SOUND ANOMALY DETECTED',
          body: 'An unusual sound pattern was detected on your farm!',
        };
      case 'acoustic_engine':
        return {
          title: '🔊 ENGINE SOUND DETECTED',
          body: 'An engine or vehicle sound was detected on your farm!',
        };
      default:
        return {
          title: '⚠️ SECURITY ALERT',
          body: `A security event (${type}) was detected on your farm!`,
        };
    }
  }
}
