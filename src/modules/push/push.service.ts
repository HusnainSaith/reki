import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DevicesService } from '../devices/devices.service';
import { Notification } from '../notifications/entities/notification.entity';
import { NotificationType } from '../../common/enums';

interface PushPayload {
  title: string;
  body: string;
  image?: string;
  sound?: string;
  data?: Record<string, string>;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private firebaseApp: any = null;
  private isFirebaseConfigured = false;

  // Analytics counters (in-memory, reset on restart)
  private pushStats = {
    totalSent: 0,
    delivered: 0,
    failed: 0,
    opened: 0,
  };

  // Dedupe: suppress duplicate (userId, type, refId) pushes within window.
  // Spec (Week 9): "Check user hasn't been notified for same venue/event in last 1 hour".
  private readonly dedupeWindowMs = 60 * 60 * 1000; // 1 hour
  private readonly dedupeCache = new Map<string, number>(); // key -> expiresAt
  private lastDedupeSweep = 0;

  constructor(
    private readonly devicesService: DevicesService,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async onModuleInit() {
    await this.initializeFirebase();
  }

  private async initializeFirebase(): Promise<void> {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase not configured (missing FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY). ' +
        'Push notifications will run in mock mode.',
      );
      return;
    }

    try {
      const admin = await import('firebase-admin');
      this.firebaseApp = admin.default.initializeApp({
        credential: admin.default.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      this.isFirebaseConfigured = true;
      this.logger.log('Firebase Admin SDK initialized — push notifications active');
    } catch (error) {
      this.logger.error('Firebase initialization failed, running in mock mode', error);
    }
  }

  /**
   * Send push notification to a specific user.
   * Checks preferences, quiet hours, rate limits before sending.
   */
  async sendToUser(
    userId: string,
    notificationType: NotificationType,
    payload: PushPayload,
  ): Promise<{ sent: boolean; reason?: string }> {
    // 1. Check user preferences
    const shouldSend = await this.devicesService.shouldSendPush(userId, notificationType);
    if (!shouldSend) {
      return { sent: false, reason: 'User preferences or quiet hours blocked' };
    }

    // 2. Dedupe check — suppress same (user, type, refId) within 1h
    const refId =
      payload.data?.venueId ||
      payload.data?.offerId ||
      payload.data?.redemptionId ||
      payload.data?.notificationId ||
      '';
    const dedupeKey = `${userId}:${notificationType}:${refId}`;
    if (this.isDuplicate(dedupeKey)) {
      this.logger.debug(`Push deduped: ${dedupeKey}`);
      return { sent: false, reason: 'Duplicate within dedupe window' };
    }

    // 3. Get active devices
    const devices = await this.devicesService.getActiveDevicesByUserId(userId);
    if (devices.length === 0) {
      return { sent: false, reason: 'No active devices' };
    }

    // 4. Send to each device
    for (const device of devices) {
      await this.sendToDevice(device.fcmToken, payload);
    }

    // 5. Mark dedupe key as recently sent
    this.markSent(dedupeKey);

    return { sent: true };
  }

  /**
   * Returns true if this (userId, type, refId) key was sent within the dedupe window.
   */
  private isDuplicate(key: string): boolean {
    this.sweepDedupeCacheIfNeeded();
    const expiresAt = this.dedupeCache.get(key);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
      this.dedupeCache.delete(key);
      return false;
    }
    return true;
  }

  private markSent(key: string): void {
    this.dedupeCache.set(key, Date.now() + this.dedupeWindowMs);
  }

  private sweepDedupeCacheIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastDedupeSweep < 5 * 60 * 1000) return; // sweep at most every 5 min
    this.lastDedupeSweep = now;
    for (const [key, expiresAt] of this.dedupeCache.entries()) {
      if (now > expiresAt) this.dedupeCache.delete(key);
    }
  }

  /**
   * Send push to multiple users (e.g., all users who saved a venue).
   */
  async sendToUsers(
    userIds: string[],
    notificationType: NotificationType,
    payload: PushPayload,
  ): Promise<{ totalUsers: number; sent: number; skipped: number }> {
    let sent = 0;
    let skipped = 0;

    for (const userId of userIds) {
      const result = await this.sendToUser(userId, notificationType, payload);
      if (result.sent) {
        sent++;
      } else {
        skipped++;
      }
    }

    return { totalUsers: userIds.length, sent, skipped };
  }

  /**
   * Send FCM push to a specific device token.
   * Falls back to mock mode if Firebase not configured.
   */
  private async sendToDevice(fcmToken: string, payload: PushPayload): Promise<boolean> {
    if (!this.isFirebaseConfigured) {
      // Mock mode
      this.logger.debug(
        `FCM mock: push skipped (no Firebase config) — "${payload.title}: ${payload.body}"`,
      );
      this.pushStats.totalSent++;
      this.pushStats.delivered++;
      return true;
    }

    try {
      const admin = await import('firebase-admin');
      const message: any = {
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
      };

      if (payload.image) {
        message.notification.imageUrl = payload.image;
      }

      if (payload.sound) {
        message.android = { notification: { sound: payload.sound } };
        message.apns = { payload: { aps: { sound: payload.sound } } };
      }

      await admin.default.messaging().send(message);
      this.pushStats.totalSent++;
      this.pushStats.delivered++;
      this.logger.log(`Push sent to device: ${fcmToken.substring(0, 20)}...`);
      return true;
    } catch (error: any) {
      this.pushStats.totalSent++;
      this.pushStats.failed++;

      // If token is invalid, mark device inactive
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        await this.devicesService.markDeviceInactive(fcmToken);
        this.logger.warn(`Invalid FCM token, device deactivated: ${fcmToken.substring(0, 20)}...`);
      } else {
        this.logger.error(`Push send failed: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Track notification open (called when user taps push).
   */
  trackOpen(notificationId: string): void {
    this.pushStats.opened++;
  }

  /**
   * Get push notification analytics.
   */
  getStats(): {
    totalSent: number;
    delivered: number;
    failed: number;
    opened: number;
    openRate: string;
  } {
    const openRate =
      this.pushStats.delivered > 0
        ? ((this.pushStats.opened / this.pushStats.delivered) * 100).toFixed(1) + '%'
        : '0%';

    return {
      ...this.pushStats,
      openRate,
    };
  }

  isConfigured(): boolean {
    return this.isFirebaseConfigured;
  }
}
