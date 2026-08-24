import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { SyncAction, SyncActionType, SyncActionStatus } from './entities/sync-action.entity';
import { Venue } from '../venues/entities/venue.entity';
import { Busyness } from '../busyness/entities/busyness.entity';
import { Vibe } from '../vibes/entities/vibe.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { VenueAnalytics } from '../business/entities/venue-analytics.entity';
import { BusynessLevel, BusynessPercentageMap } from '../../common/enums';
import { SyncActionDto } from './dto';
import { EngagementService } from '../engagement/engagement.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(SyncAction)
    private syncActionRepository: Repository<SyncAction>,
    @InjectRepository(Venue)
    private venuesRepository: Repository<Venue>,
    @InjectRepository(Busyness)
    private busynessRepository: Repository<Busyness>,
    @InjectRepository(Vibe)
    private vibesRepository: Repository<Vibe>,
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(VenueAnalytics)
    private analyticsRepository: Repository<VenueAnalytics>,
    private engagementService: EngagementService,
  ) {}

  private async incrementAnalytic(venueId: string, field: 'totalSaves', delta: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    let analytics = await this.analyticsRepository.findOne({ where: { venueId, date: today } });
    if (!analytics) {
      analytics = this.analyticsRepository.create({ venueId, date: today });
    }
    analytics[field] = Math.max(0, (analytics[field] || 0) + delta);
    await this.analyticsRepository.save(analytics);
  }

  // ─── SYNC QUEUE PROCESSING ────────────────────────────

  async processSyncQueue(
    userId: string,
    deviceId: string,
    actions: SyncActionDto[],
  ): Promise<{ results: any[]; syncedAt: string }> {
    const results: any[] = [];

    for (const action of actions) {
      try {
        const result = await this.processAction(userId, deviceId, action);
        results.push(result);
      } catch (err) {
        const error = err as Error;
        results.push({
          id: action.id,
          status: 'rejected',
          message: error.message || 'Failed to process action',
        });
      }
    }

    return {
      results,
      syncedAt: new Date().toISOString(),
    };
  }

  private async processAction(
    userId: string,
    deviceId: string,
    action: SyncActionDto,
  ): Promise<any> {
    switch (action.type) {
      case SyncActionType.BUSYNESS_UPDATE:
        return this.processBusynessUpdate(userId, deviceId, action);
      case SyncActionType.VIBE_UPDATE:
        return this.processVibeUpdate(userId, deviceId, action);
      case SyncActionType.OFFER_TOGGLE:
        return this.processOfferToggle(userId, deviceId, action);
      case SyncActionType.NOTIFICATION_READ:
        return this.processNotificationRead(userId, deviceId, action);
      case SyncActionType.VENUE_SAVE:
        return this.processVenueSave(userId, deviceId, action);
      case SyncActionType.VENUE_VIEW:
        return this.processVenueView(userId, deviceId, action);
      case SyncActionType.REVIEW_CREATE:
        return this.processEngagementAction(userId, deviceId, action, () => this.engagementService.createReview(userId, action.venueId!, action.data as any));
      case SyncActionType.REVIEW_UPDATE:
        return this.processEngagementAction(userId, deviceId, action, () => this.engagementService.updateReview(userId, action.data?.reviewId, action.data as any));
      case SyncActionType.CHECK_IN:
        return this.processEngagementAction(userId, deviceId, action, () => this.engagementService.checkIn(userId, action.venueId!, { ...(action.data as any), timestamp: action.offlineTimestamp }));
      case SyncActionType.VIBE_ACCURACY_VOTE:
        return this.processEngagementAction(userId, deviceId, action, () => this.engagementService.vote(userId, action.venueId!, { ...(action.data as any), votedAt: action.offlineTimestamp }));
      case SyncActionType.VENUE_HISTORY_VIEW:
        return this.processEngagementAction(userId, deviceId, action, () => this.engagementService.recordHistory(userId, action.venueId!, { ...(action.data as any), viewedAt: action.offlineTimestamp }));
      case SyncActionType.VENUE_SHARE:
        return this.processEngagementAction(userId, deviceId, action, () => this.engagementService.share(userId, action.venueId!, { ...(action.data as any), sharedAt: action.offlineTimestamp }));
      default:
        return { id: action.id, status: 'rejected', message: 'Unknown action type' };
    }
  }

  private async processEngagementAction(userId: string, deviceId: string, action: SyncActionDto, operation: () => Promise<any>) {
    if (!action.venueId) return { id: action.id, status: 'rejected', message: 'venueId is required' };
    const data = await operation();
    await this.saveSyncAction(userId, deviceId, action, SyncActionStatus.SUCCESS);
    return { id: action.id, status: 'success', data };
  }

  // ── BUSYNESS UPDATE (conflict possible) ──

  private async processBusynessUpdate(
    userId: string,
    deviceId: string,
    action: SyncActionDto,
  ): Promise<any> {
    const busyness = await this.busynessRepository.findOne({
      where: { venueId: action.venueId },
    });

    if (!busyness) {
      return { id: action.id, status: 'rejected', message: 'Venue busyness record not found' };
    }

    const offlineTime = new Date(action.offlineTimestamp);
    const serverTime = busyness.lastUpdated ? new Date(busyness.lastUpdated) : new Date(0);

    // Conflict detection: last-write-wins
    if (offlineTime < serverTime) {
      // Save conflict record
      await this.saveSyncAction(userId, deviceId, action, SyncActionStatus.CONFLICT, {
        conflictMessage: `Status was already updated at ${serverTime.toLocaleTimeString()}.`,
        serverData: {
          busyness: busyness.level,
          percentage: busyness.percentage,
          updatedBy: busyness.updatedBy,
          updatedAt: busyness.lastUpdated,
        },
      });

      return {
        id: action.id,
        status: 'conflict',
        message: `Status was already updated at ${serverTime.toLocaleTimeString()}.`,
        serverData: {
          busyness: busyness.level,
          percentage: busyness.percentage,
          updatedBy: busyness.updatedBy,
          updatedAt: busyness.lastUpdated,
        },
        options: ['keep_server', 'override_with_mine'],
      };
    }

    // Accept update
    const level = action.data?.busyness as BusynessLevel;
    if (level && BusynessPercentageMap[level] !== undefined) {
      busyness.level = level;
      busyness.percentage = BusynessPercentageMap[level];
      busyness.updatedBy = userId;
      await this.busynessRepository.save(busyness);
    }

    await this.saveSyncAction(userId, deviceId, action, SyncActionStatus.SUCCESS);
    return { id: action.id, status: 'success' };
  }

  // ── VIBE UPDATE (conflict possible) ──

  private async processVibeUpdate(
    userId: string,
    deviceId: string,
    action: SyncActionDto,
  ): Promise<any> {
    const vibe = await this.vibesRepository.findOne({
      where: { venueId: action.venueId },
    });

    if (!vibe) {
      return { id: action.id, status: 'rejected', message: 'Venue vibe record not found' };
    }

    const offlineTime = new Date(action.offlineTimestamp);
    const serverTime = vibe.lastUpdated ? new Date(vibe.lastUpdated) : new Date(0);

    if (offlineTime < serverTime) {
      await this.saveSyncAction(userId, deviceId, action, SyncActionStatus.CONFLICT, {
        conflictMessage: `Vibes were already updated at ${serverTime.toLocaleTimeString()}.`,
        serverData: {
          tags: vibe.tags,
          updatedBy: vibe.updatedBy,
          updatedAt: vibe.lastUpdated,
        },
      });

      return {
        id: action.id,
        status: 'conflict',
        message: `Vibes were already updated at ${serverTime.toLocaleTimeString()}.`,
        serverData: {
          tags: vibe.tags,
          updatedBy: vibe.updatedBy,
          updatedAt: vibe.lastUpdated,
        },
        options: ['keep_server', 'override_with_mine'],
      };
    }

    if (action.data?.vibes && Array.isArray(action.data.vibes)) {
      vibe.tags = action.data.vibes;
      vibe.updatedBy = userId;
      await this.vibesRepository.save(vibe);
    }

    await this.saveSyncAction(userId, deviceId, action, SyncActionStatus.SUCCESS);
    return { id: action.id, status: 'success' };
  }

  // ── OFFER TOGGLE (edge case: offer may be deleted/expired) ──

  private async processOfferToggle(
    userId: string,
    deviceId: string,
    action: SyncActionDto,
  ): Promise<any> {
    const offer = await this.offersRepository.findOne({
      where: { id: action.offerId },
    });

    if (!offer) {
      await this.saveSyncAction(userId, deviceId, action, SyncActionStatus.REJECTED);
      return {
        id: action.id,
        status: 'rejected',
        reason: 'Offer no longer exists or has expired',
      };
    }

    if (offer.expiresAt && new Date() > new Date(offer.expiresAt)) {
      await this.saveSyncAction(userId, deviceId, action, SyncActionStatus.REJECTED);
      return {
        id: action.id,
        status: 'rejected',
        reason: 'Offer has expired',
      };
    }

    // Accept toggle
    offer.isActive = action.data?.isActive ?? !offer.isActive;
    await this.offersRepository.save(offer);

    await this.saveSyncAction(userId, deviceId, action, SyncActionStatus.SUCCESS);
    return { id: action.id, status: 'success' };
  }

  // ── NOTIFICATION READ (idempotent, always accept) ──

  private async processNotificationRead(
    userId: string,
    deviceId: string,
    action: SyncActionDto,
  ): Promise<any> {
    if (action.notificationId) {
      await this.notificationsRepository.update(action.notificationId, { isRead: true });
    }
    await this.saveSyncAction(userId, deviceId, action, SyncActionStatus.SUCCESS);
    return { id: action.id, status: 'success' };
  }

  // ── VENUE SAVE (always accept, latest wins) ──

  private async processVenueSave(
    userId: string,
    deviceId: string,
    action: SyncActionDto,
  ): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { id: action.id, status: 'rejected', message: 'User not found' };
    }

    const venues = user.savedVenues || [];
    const isSave = action.data?.save !== false;

    if (isSave && action.venueId && !venues.includes(action.venueId)) {
      venues.push(action.venueId);
      user.savedVenues = venues;
      await this.usersRepository.save(user);
      await this.incrementAnalytic(action.venueId, 'totalSaves', 1);
    } else if (!isSave && action.venueId) {
      const wasSaved = venues.includes(action.venueId);
      user.savedVenues = venues.filter((id) => id !== action.venueId);
      await this.usersRepository.save(user);
      if (wasSaved) await this.incrementAnalytic(action.venueId, 'totalSaves', -1);
    }

    await this.saveSyncAction(userId, deviceId, action, SyncActionStatus.SUCCESS);
    return { id: action.id, status: 'success' };
  }

  // ── VENUE VIEW (always accept, additive analytics) ──

  private async processVenueView(
    userId: string,
    deviceId: string,
    action: SyncActionDto,
  ): Promise<any> {
    if (action.venueId) {
      const today = new Date().toISOString().split('T')[0];
      let analytics = await this.analyticsRepository.findOne({
        where: { venueId: action.venueId, date: today },
      });
      if (!analytics) {
        analytics = this.analyticsRepository.create({
          venueId: action.venueId,
          date: today,
          totalViews: 0,
        });
      }
      analytics.totalViews = (analytics.totalViews || 0) + 1;
      await this.analyticsRepository.save(analytics);
    }

    await this.saveSyncAction(userId, deviceId, action, SyncActionStatus.SUCCESS);
    return { id: action.id, status: 'success' };
  }

  // ─── SYNC STATUS ──────────────────────────────────────

  async getSyncStatus(deviceId: string): Promise<{
    pendingActions: number;
    lastSyncAt: string | null;
    conflicts: any[];
  }> {
    const pending = await this.syncActionRepository.count({
      where: { deviceId, status: SyncActionStatus.PENDING },
    });

    const lastSync = await this.syncActionRepository.findOne({
      where: { deviceId },
      order: { syncedAt: 'DESC' },
    });

    const conflicts = await this.syncActionRepository.find({
      where: { deviceId, status: SyncActionStatus.CONFLICT },
      order: { syncedAt: 'DESC' },
      take: 10,
    });

    return {
      pendingActions: pending,
      lastSyncAt: lastSync?.syncedAt?.toISOString() || null,
      conflicts: conflicts.map((c) => ({
        id: c.clientActionId,
        type: c.type,
        message: c.conflictMessage,
        serverData: c.serverData,
        options: c.conflictOptions,
        syncedAt: c.syncedAt,
      })),
    };
  }

  // ─── DELTA SYNC: VENUES ──────────────────────────────

  async getVenuesSyncSince(since: string): Promise<{
    updated: any[];
    deleted: string[];
    lastSync: string;
  }> {
    const sinceDate = new Date(since);

    const venues = await this.venuesRepository
      .createQueryBuilder('venue')
      .leftJoinAndSelect('venue.busyness', 'busyness')
      .leftJoinAndSelect('venue.vibe', 'vibe')
      .leftJoinAndSelect('venue.offers', 'offers')
      .where('venue.updatedAt >= :since', { since: sinceDate })
      .orWhere('busyness.lastUpdated >= :since', { since: sinceDate })
      .orWhere('vibe.lastUpdated >= :since', { since: sinceDate })
      .getMany();

    return {
      updated: venues.map((v) => ({
        id: v.id,
        name: v.name,
        busyness: v.busyness
          ? { level: v.busyness.level, percentage: v.busyness.percentage }
          : null,
        vibe: v.vibe ? { tags: v.vibe.tags, musicGenre: v.vibe.musicGenre } : null,
        offers: (v.offers || []).filter((o) => o.isActive).map((o) => ({
          id: o.id,
          title: o.title,
          isActive: o.isActive,
        })),
        updatedAt: v.updatedAt,
      })),
      deleted: [], // Soft deletes tracked via isActive flags
      lastSync: new Date().toISOString(),
    };
  }

  // ─── DELTA SYNC: NOTIFICATIONS ────────────────────────

  async getNotificationsSyncSince(
    userId: string,
    since: string,
  ): Promise<{ updated: any[]; lastSync: string }> {
    const sinceDate = new Date(since);

    const notifications = await this.notificationsRepository.find({
      where: {
        userId,
        createdAt: MoreThanOrEqual(sinceDate),
      },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    return {
      updated: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        icon: n.icon,
        venueId: n.venueId,
        offerId: n.offerId,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      lastSync: new Date().toISOString(),
    };
  }

  // ─── DELTA SYNC: OFFERS ──────────────────────────────

  async getOffersSyncSince(since: string): Promise<{
    updated: any[];
    expired: string[];
    lastSync: string;
  }> {
    const sinceDate = new Date(since);

    const offers = await this.offersRepository.find({
      where: { createdAt: MoreThanOrEqual(sinceDate) },
      relations: ['venue'],
    });

    const expired = offers
      .filter((o) => o.expiresAt && new Date() > new Date(o.expiresAt))
      .map((o) => o.id);

    const active = offers.filter(
      (o) => !o.expiresAt || new Date() <= new Date(o.expiresAt),
    );

    return {
      updated: active.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        venueId: o.venueId,
        venueName: o.venue?.name,
        isActive: o.isActive,
        validDays: o.validDays,
        validTimeStart: o.validTimeStart,
        validTimeEnd: o.validTimeEnd,
        expiresAt: o.expiresAt,
        createdAt: o.createdAt,
      })),
      expired,
      lastSync: new Date().toISOString(),
    };
  }

  // ─── STATE PERSISTENCE ────────────────────────────────

  async saveUserState(userId: string, state: Record<string, any>): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) return;

    // Merge state fields into user record
    if (state.preferences) {
      user.preferences = state.preferences;
    }
    if (state.savedVenues) {
      user.savedVenues = state.savedVenues;
    }
    if (state.lastFilters || state.lastSyncAt) {
      // Store extra state in a JSONB field
      const appState = (user as any).appState || {};
      if (state.lastFilters) appState.lastFilters = state.lastFilters;
      if (state.lastSyncAt) appState.lastSyncAt = state.lastSyncAt;
      if (state.notificationPreferences) appState.notificationPreferences = state.notificationPreferences;
      (user as any).appState = appState;
    }

    await this.usersRepository.save(user);
  }

  async getUserState(userId: string): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) return null;

    const appState = (user as any).appState || {};

    return {
      preferences: user.preferences || { vibes: [], music: [] },
      savedVenues: user.savedVenues || [],
      lastFilters: appState.lastFilters || null,
      notificationPreferences: appState.notificationPreferences || null,
      lastSyncAt: appState.lastSyncAt || null,
    };
  }

  // ─── ADMIN: OFFLINE STATS ────────────────────────────

  async getOfflineStats(): Promise<{
    totalSyncActions: number;
    pendingSyncActions: number;
    successfulSyncs: number;
    conflictsToday: number;
    rejectedToday: number;
    syncSuccessRate: string;
    avgSyncDelay: string;
  }> {
    const totalSyncActions = await this.syncActionRepository.count();

    const pendingSyncActions = await this.syncActionRepository.count({
      where: { status: SyncActionStatus.PENDING },
    });

    const successfulSyncs = await this.syncActionRepository.count({
      where: { status: SyncActionStatus.SUCCESS },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const conflictsToday = await this.syncActionRepository.count({
      where: {
        status: SyncActionStatus.CONFLICT,
        syncedAt: MoreThanOrEqual(todayStart),
      },
    });

    const rejectedToday = await this.syncActionRepository.count({
      where: {
        status: SyncActionStatus.REJECTED,
        syncedAt: MoreThanOrEqual(todayStart),
      },
    });

    const total = totalSyncActions || 1;
    const syncSuccessRate = `${((successfulSyncs / total) * 100).toFixed(1)}%`;

    return {
      totalSyncActions,
      pendingSyncActions,
      successfulSyncs,
      conflictsToday,
      rejectedToday,
      syncSuccessRate,
      avgSyncDelay: '0 minutes', // Computed from actual sync timestamps in production
    };
  }

  // ─── HELPER ──────────────────────────────────────────

  private async saveSyncAction(
    userId: string,
    deviceId: string,
    action: SyncActionDto,
    status: SyncActionStatus,
    extra?: {
      conflictMessage?: string;
      serverData?: Record<string, any>;
    },
  ): Promise<void> {
    const syncAction = this.syncActionRepository.create({
      clientActionId: action.id,
      deviceId,
      userId,
      type: action.type,
      status,
      data: action.data,
      venueId: action.venueId,
      notificationId: action.notificationId,
      offerId: action.offerId,
      offlineTimestamp: new Date(action.offlineTimestamp),
      conflictMessage: extra?.conflictMessage,
      serverData: extra?.serverData,
      conflictOptions: extra?.conflictMessage ? ['keep_server', 'override_with_mine'] : undefined,
    });
    await this.syncActionRepository.save(syncAction);
  }
}
