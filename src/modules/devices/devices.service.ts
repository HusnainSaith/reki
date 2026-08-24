import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(NotificationPreference)
    private prefRepository: Repository<NotificationPreference>,
  ) {}

  // ─── DEVICE TOKEN MANAGEMENT ────────────────────────

  async registerDevice(userId: string, dto: RegisterDeviceDto): Promise<Device> {
    // Upsert: if same fcmToken exists, update it
    const existing = await this.deviceRepository.findOne({
      where: { fcmToken: dto.fcmToken },
    });

    if (existing) {
      existing.userId = userId;
      existing.platform = dto.platform;
      existing.deviceId = dto.deviceId;
      existing.appVersion = dto.appVersion;
      existing.isActive = true;
      existing.lastActiveAt = new Date();
      return this.deviceRepository.save(existing);
    }

    const device = this.deviceRepository.create({
      userId,
      ...dto,
      isActive: true,
      lastActiveAt: new Date(),
    });
    this.logger.log(`Device registered for user ${userId}, platform: ${dto.platform}`);
    return this.deviceRepository.save(device);
  }

  async deactivateDevice(deviceId: string, userId: string): Promise<void> {
    await this.deviceRepository.update(
      { id: deviceId, userId },
      { isActive: false },
    );
    this.logger.log(`Device ${deviceId} deactivated for user ${userId}`);
  }

  async getActiveDevicesByUserId(userId: string): Promise<Device[]> {
    return this.deviceRepository.find({
      where: { userId, isActive: true },
    });
  }

  async markDeviceInactive(fcmToken: string): Promise<void> {
    await this.deviceRepository.update({ fcmToken }, { isActive: false });
  }

  async getActiveDeviceCount(): Promise<number> {
    return this.deviceRepository.count({ where: { isActive: true } });
  }

  // ─── NOTIFICATION PREFERENCES ───────────────────────

  async getPreferences(userId: string): Promise<NotificationPreference> {
    let prefs = await this.prefRepository.findOne({ where: { userId } });
    if (!prefs) {
      // Attempt to create default preferences — may fail if userId is a business user
      // (FK constraint: notification_preferences.userId → users.id)
      prefs = this.prefRepository.create({ userId });
      try {
        prefs = await this.prefRepository.save(prefs);
      } catch {
        // FK violation: userId not in users table (e.g. business user)
        // Return in-memory defaults without persisting
        prefs.vibeAlerts = true;
        prefs.livePerformance = true;
        prefs.socialCheckins = true;
        prefs.offerAlerts = true;
        prefs.weeklyRecap = true;
        prefs.proximityAlerts = true;
        prefs.quietHoursStart = null;
        prefs.quietHoursEnd = null;
        return prefs;
      }
    }
    return prefs;
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreference> {
    let prefs = await this.prefRepository.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.prefRepository.create({ userId, ...dto });
    } else {
      Object.assign(prefs, dto);
    }
    try {
      return await this.prefRepository.save(prefs);
    } catch {
      // FK violation: business user or non-existent userId
      return prefs;
    }
  }

  /**
   * Check if a specific notification type is enabled for a user
   * and respects quiet hours.
   */
  async shouldSendPush(userId: string, notificationType: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);

    // Check type preference
    const typeMap: Record<string, keyof NotificationPreference> = {
      vibe_alert: 'vibeAlerts',
      live_performance: 'livePerformance',
      social_checkin: 'socialCheckins',
      offer_confirmation: 'offerAlerts',
      proximity_offer: 'proximityAlerts',
      weekly_recap: 'weeklyRecap',
    };

    const prefKey = typeMap[notificationType];
    if (prefKey && prefs[prefKey] === false) {
      return false;
    }

    // Check quiet hours
    if (prefs.quietHoursStart && prefs.quietHoursEnd) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
      const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (startMinutes > endMinutes) {
        // Overnight quiet hours (e.g. 02:00 - 09:00)
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
          return false;
        }
      } else {
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          return false;
        }
      }
    }

    return true;
  }
}
