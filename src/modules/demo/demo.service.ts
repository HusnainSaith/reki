import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from '../venues/entities/venue.entity';
import { Busyness } from '../busyness/entities/busyness.entity';
import { Vibe } from '../vibes/entities/vibe.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Redemption } from '../offers/entities/redemption.entity';
import { VenueAnalytics } from '../business/entities/venue-analytics.entity';
import { ActivityLog } from '../audit/entities/activity-log.entity';
import { BusynessLevel, NotificationType } from '../../common/enums';
import { VENUE_BUSYNESS, VENUE_VIBES } from '../../seed/seed-data';

/**
 * Demo simulation scenarios for investor presentations.
 * Allows time-based busyness state changes and pre-built demo flows.
 */

interface VenueTimeState {
  level: BusynessLevel;
  percentage: number;
  vibes: string[];
  music: string[];
}

// Saturday Night scenario: how venues change from 7PM to midnight
const SATURDAY_NIGHT_TIMELINE: Record<number, Record<number, VenueTimeState>> = {
  // venueIndex: { hour: state }
  0: { // Albert's Schloss
    19: { level: BusynessLevel.QUIET, percentage: 25, vibes: ['Chill', 'Beer Garden'], music: ['Lo-fi', 'Vinyl'] },
    20: { level: BusynessLevel.MODERATE, percentage: 50, vibes: ['Chill', 'Live Music'], music: ['Indie', 'R&B'] },
    21: { level: BusynessLevel.MODERATE, percentage: 60, vibes: ['High Energy', 'Live Music'], music: ['House', 'R&B'] },
    22: { level: BusynessLevel.BUSY, percentage: 85, vibes: ['High Energy', 'Packed'], music: ['House', 'Techno'] },
    23: { level: BusynessLevel.BUSY, percentage: 95, vibes: ['High Energy', 'Packed', 'Late Night'], music: ['House', 'Techno'] },
  },
  1: { // Warehouse Project
    19: { level: BusynessLevel.QUIET, percentage: 10, vibes: ['Underground'], music: ['Techno'] },
    20: { level: BusynessLevel.QUIET, percentage: 15, vibes: ['Underground'], music: ['Techno'] },
    21: { level: BusynessLevel.QUIET, percentage: 20, vibes: ['Underground'], music: ['Techno', 'House'] },
    22: { level: BusynessLevel.MODERATE, percentage: 55, vibes: ['Underground', 'High Energy'], music: ['Techno', 'House'] },
    23: { level: BusynessLevel.BUSY, percentage: 88, vibes: ['High Energy', 'Packed', 'Underground'], music: ['Techno', 'House'] },
    0: { level: BusynessLevel.BUSY, percentage: 95, vibes: ['High Energy', 'Packed', 'Late Night'], music: ['Techno', 'House'] },
  },
  2: { // 20 Stories
    19: { level: BusynessLevel.MODERATE, percentage: 40, vibes: ['Romantic', 'Rooftop'], music: ['Lo-fi', 'R&B'] },
    20: { level: BusynessLevel.MODERATE, percentage: 55, vibes: ['Romantic', 'Date Night'], music: ['Lo-fi', 'R&B'] },
    21: { level: BusynessLevel.MODERATE, percentage: 65, vibes: ['Date Night', 'Rooftop'], music: ['R&B', 'House'] },
    22: { level: BusynessLevel.BUSY, percentage: 80, vibes: ['High Energy', 'Rooftop'], music: ['House', 'R&B'] },
    23: { level: BusynessLevel.BUSY, percentage: 85, vibes: ['High Energy', 'Late Night'], music: ['House'] },
  },
  3: { // The Alchemist
    19: { level: BusynessLevel.MODERATE, percentage: 45, vibes: ['Chill', 'Intimate'], music: ['Lo-fi', 'Indie'] },
    20: { level: BusynessLevel.MODERATE, percentage: 60, vibes: ['Date Night', 'Intimate'], music: ['Lo-fi', 'R&B'] },
    21: { level: BusynessLevel.BUSY, percentage: 75, vibes: ['High Energy', 'Date Night'], music: ['R&B', 'House'] },
    22: { level: BusynessLevel.BUSY, percentage: 85, vibes: ['High Energy', 'Packed'], music: ['House', 'R&B'] },
    23: { level: BusynessLevel.BUSY, percentage: 90, vibes: ['High Energy', 'Packed', 'Late Night'], music: ['House'] },
  },
  4: { // Albert Hall
    19: { level: BusynessLevel.QUIET, percentage: 20, vibes: ['Live Music', 'Intimate'], music: ['Indie', 'Vinyl'] },
    20: { level: BusynessLevel.MODERATE, percentage: 45, vibes: ['Live Music', 'High Energy'], music: ['Indie', 'R&B'] },
    21: { level: BusynessLevel.MODERATE, percentage: 65, vibes: ['Live Music', 'High Energy'], music: ['Indie', 'R&B'] },
    22: { level: BusynessLevel.BUSY, percentage: 82, vibes: ['High Energy', 'Packed', 'Live Music'], music: ['House', 'Techno'] },
    23: { level: BusynessLevel.BUSY, percentage: 90, vibes: ['High Energy', 'Packed', 'Late Night'], music: ['House', 'Techno'] },
  },
};

// Quiet Afternoon scenario
const QUIET_AFTERNOON_TIMELINE: Record<number, Record<number, VenueTimeState>> = {
  0: { 14: { level: BusynessLevel.QUIET, percentage: 15, vibes: ['Chill', 'Beer Garden'], music: ['Lo-fi'] } },
  2: { 14: { level: BusynessLevel.QUIET, percentage: 20, vibes: ['Chill', 'Rooftop'], music: ['Lo-fi'] } },
  3: { 14: { level: BusynessLevel.QUIET, percentage: 25, vibes: ['Chill', 'Intimate'], music: ['Lo-fi', 'Indie'] } },
  7: { 14: { level: BusynessLevel.QUIET, percentage: 30, vibes: ['Chill', 'Date Night'], music: ['Lo-fi'] } },
};

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    @InjectRepository(Venue)
    private venuesRepository: Repository<Venue>,
    @InjectRepository(Busyness)
    private busynessRepository: Repository<Busyness>,
    @InjectRepository(Vibe)
    private vibesRepository: Repository<Vibe>,
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
    @InjectRepository(Redemption)
    private redemptionsRepository: Repository<Redemption>,
    @InjectRepository(VenueAnalytics)
    private analyticsRepository: Repository<VenueAnalytics>,
    @InjectRepository(ActivityLog)
    private activityLogsRepository: Repository<ActivityLog>,
  ) {}

  /**
   * Simulate a specific hour — updates all venues to realistic states for that time.
   */
  async simulateTime(hour: number) {
    const venues = await this.venuesRepository.find({ order: { name: 'ASC' } });
    // Use original seed order
    const venuesByName = new Map(venues.map((v) => [v.name, v]));
    const venueOrder = [
      "Albert's Schloss", 'Warehouse Project', '20 Stories', 'The Alchemist',
      'Albert Hall', 'YES Manchester', 'Diecast', 'Refuge',
      'Cloud 23', 'Night & Day Café', 'Science & Industry', 'Gorilla',
      'The Ivy', 'Peveril of the Peak', 'Electrik',
    ];

    let updated = 0;

    for (let i = 0; i < venueOrder.length; i++) {
      const venue = venuesByName.get(venueOrder[i]);
      if (!venue) continue;

      const state = this.getVenueStateForHour(i, hour);

      // Update busyness
      let busyness = await this.busynessRepository.findOne({ where: { venueId: venue.id } });
      if (!busyness) {
        busyness = this.busynessRepository.create({ venueId: venue.id });
      }
      busyness.level = state.level;
      busyness.percentage = state.percentage;
      busyness.updatedBy = 'demo-system';
      await this.busynessRepository.save(busyness);

      // Update vibes
      let vibe = await this.vibesRepository.findOne({ where: { venueId: venue.id } });
      if (!vibe) {
        vibe = this.vibesRepository.create({ venueId: venue.id });
      }
      vibe.tags = state.vibes;
      vibe.musicGenre = state.music;
      vibe.updatedBy = 'demo-system';
      await this.vibesRepository.save(vibe);

      // Trigger vibe alerts for venues hitting 80%+
      if (state.percentage >= 80) {
        await this.triggerVibeAlert(venue);
      }

      updated++;
    }

    this.logger.log(`Demo simulate: hour=${hour}, updated=${updated} venues`);

    return {
      success: true,
      message: `Simulated ${hour}:00 — ${updated} venues updated`,
      hour,
      updatedVenues: updated,
    };
  }

  /**
   * Run a named demo scenario.
   */
  async runScenario(scenario: string, hour?: number) {
    switch (scenario) {
      case 'saturday-night':
        return this.simulateTime(hour ?? 22);

      case 'quiet-afternoon':
        return this.simulateTime(hour ?? 14);

      case 'quiet-evening':
        return this.simulateTime(hour ?? 18);

      case 'warming-up':
        return this.simulateTime(hour ?? 20);

      case 'peak-time':
        return this.simulateTime(hour ?? 23);

      case 'winding-down':
        return this.simulateTime(hour ?? 1);

      case 'peak-transition': {
        // Simulate transition: 7PM → 10PM in one call
        const results = [];
        for (const h of [19, 20, 21, 22]) {
          const result = await this.simulateTime(h);
          results.push({ hour: h, updated: result.updatedVenues });
        }
        return {
          success: true,
          message: 'Peak transition simulated (7PM → 10PM)',
          scenario: 'peak-transition',
          transitions: results,
        };
      }

      default:
        throw new NotFoundException(
          `Unknown scenario: ${scenario}. Available: saturday-night, quiet-afternoon, quiet-evening, warming-up, peak-time, winding-down, peak-transition`,
        );
    }
  }

  /**
   * Get available demo scenarios.
   */
  getScenarios() {
    return {
      scenarios: [
        {
          id: 'saturday-night',
          name: 'Saturday Night Out',
          description: 'Simulates a typical Saturday night in Manchester. Venues gradually fill up from quiet evening to packed late night.',
          suggestedHours: [19, 20, 21, 22, 23],
        },
        {
          id: 'quiet-afternoon',
          name: 'Quiet Afternoon',
          description: 'Peaceful afternoon state — most venues quiet, rooftop bars moderately active.',
          suggestedHours: [14, 15, 16],
        },
        {
          id: 'quiet-evening',
          name: 'Quiet Evening',
          description: 'Mon-Wed evening state — sparse crowds, chill vibes.',
          suggestedHours: [18, 19],
        },
        {
          id: 'warming-up',
          name: 'Warming Up',
          description: 'Friday 8-9 PM — venues starting to fill, DJ warmup sets.',
          suggestedHours: [20, 21],
        },
        {
          id: 'peak-time',
          name: 'Peak Time',
          description: 'Fri-Sat 11PM-1AM — maximum capacity, packed everywhere.',
          suggestedHours: [23, 0, 1],
        },
        {
          id: 'winding-down',
          name: 'Winding Down',
          description: 'Saturday 1-2 AM — crowds thinning, late-night venues still going.',
          suggestedHours: [1, 2],
        },
        {
          id: 'peak-transition',
          name: 'Peak Hour Transition',
          description: 'Rapid simulation from 7PM to 10PM showing the build-up to peak hours.',
          suggestedHours: null,
        },
      ],
    };
  }

  /**
   * Reset all demo data to initial seed state.
   * Clears redemptions, resets busyness/vibes, clears test notifications.
   */
  async resetDemo() {
    const venues = await this.venuesRepository.find({ order: { name: 'ASC' } });
    const venuesByName = new Map(venues.map((v) => [v.name, v]));
    const venueOrder = [
      "Albert's Schloss", 'Warehouse Project', '20 Stories', 'The Alchemist',
      'Albert Hall', 'YES Manchester', 'Diecast', 'Refuge',
      'Cloud 23', 'Night & Day Café', 'Science & Industry', 'Gorilla',
      'The Ivy', 'Peveril of the Peak', 'Electrik',
    ];

    // 1. Reset busyness to seed defaults
    for (let i = 0; i < venueOrder.length; i++) {
      const venue = venuesByName.get(venueOrder[i]);
      if (!venue || !VENUE_BUSYNESS[i]) continue;

      const busyness = await this.busynessRepository.findOne({ where: { venueId: venue.id } });
      if (busyness) {
        busyness.level = VENUE_BUSYNESS[i].level;
        busyness.percentage = VENUE_BUSYNESS[i].percentage;
        busyness.updatedBy = 'seed';
        await this.busynessRepository.save(busyness);
      }
    }

    // 2. Reset vibes to seed defaults
    for (let i = 0; i < venueOrder.length; i++) {
      const venue = venuesByName.get(venueOrder[i]);
      if (!venue || !VENUE_VIBES[i]) continue;

      const vibe = await this.vibesRepository.findOne({ where: { venueId: venue.id } });
      if (vibe) {
        vibe.tags = VENUE_VIBES[i].tags;
        vibe.musicGenre = VENUE_VIBES[i].musicGenre;
        vibe.updatedBy = 'seed';
        await this.vibesRepository.save(vibe);
      }
    }

    // 3. Clear all redemptions
    const redemptionCount = await this.redemptionsRepository.count();
    await this.redemptionsRepository.clear();

    // 4. Reset offer redemption counts
    await this.offersRepository
      .createQueryBuilder()
      .update()
      .set({ redemptionCount: 0, isActive: true })
      .execute();

    // 5. Clear non-seeded notifications (keep seed notifications)
    const notifCount = await this.notificationsRepository.count();
    await this.notificationsRepository.clear();

    // 6. Clear activity logs
    const logCount = await this.activityLogsRepository.count();
    await this.activityLogsRepository.clear();

    // 7. Clear analytics created during demo
    await this.analyticsRepository.clear();

    this.logger.log('Demo reset complete');

    return {
      success: true,
      message: 'Demo data reset to initial state',
      cleared: {
        redemptions: redemptionCount,
        notifications: notifCount,
        activityLogs: logCount,
      },
      reset: {
        busyness: '15 venues reset to seed defaults',
        vibes: '15 venues reset to seed defaults',
        offers: 'All redemption counts reset to 0',
      },
    };
  }

  /**
   * Get venue state for a specific hour using timeline data.
   * Falls back to time-based defaults if no specific timeline entry.
   */
  private getVenueStateForHour(venueIndex: number, hour: number): VenueTimeState {
    // Check Saturday Night timeline first
    const timeline = SATURDAY_NIGHT_TIMELINE[venueIndex];
    if (timeline && timeline[hour]) {
      return timeline[hour];
    }

    // Check Quiet Afternoon
    const quietTimeline = QUIET_AFTERNOON_TIMELINE[venueIndex];
    if (quietTimeline && quietTimeline[hour]) {
      return quietTimeline[hour];
    }

    // Default time-based state
    return this.getDefaultStateForHour(hour);
  }

  private getDefaultStateForHour(hour: number): VenueTimeState {
    if (hour >= 6 && hour < 17) {
      // Daytime: quiet
      return { level: BusynessLevel.QUIET, percentage: 15 + Math.floor(Math.random() * 15), vibes: ['Chill'], music: ['Lo-fi'] };
    } else if (hour >= 17 && hour < 20) {
      // Early evening: moderate
      return { level: BusynessLevel.MODERATE, percentage: 35 + Math.floor(Math.random() * 20), vibes: ['Chill', 'Live Music'], music: ['Indie', 'Lo-fi'] };
    } else if (hour >= 20 && hour < 22) {
      // Evening: moderate-busy
      return { level: BusynessLevel.MODERATE, percentage: 50 + Math.floor(Math.random() * 20), vibes: ['High Energy', 'Live Music'], music: ['House', 'R&B'] };
    } else {
      // Late night: busy
      return { level: BusynessLevel.BUSY, percentage: 75 + Math.floor(Math.random() * 20), vibes: ['High Energy', 'Packed', 'Late Night'], music: ['House', 'Techno'] };
    }
  }

  private async triggerVibeAlert(venue: Venue) {
    const users = await this.usersRepository
      .createQueryBuilder('user')
      .where(':venueId = ANY(user.savedVenues)', { venueId: venue.id })
      .getMany();

    if (users.length === 0) return;

    const notifications = users.map((user) =>
      this.notificationsRepository.create({
        userId: user.id,
        type: NotificationType.VIBE_ALERT,
        title: `${venue.name} is peaking!`,
        message: `🔥 High Vibe Alert\n80%+ capacity reached. Grab your spot!`,
        icon: 'fire',
        venueId: venue.id,
      }),
    );

    await this.notificationsRepository.save(notifications);
  }
}
