import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../modules/users/entities/user.entity';
import { Venue } from '../modules/venues/entities/venue.entity';
import { Busyness } from '../modules/busyness/entities/busyness.entity';
import { Vibe } from '../modules/vibes/entities/vibe.entity';
import { Offer } from '../modules/offers/entities/offer.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { Tag } from '../modules/tags/entities/tag.entity';
import { VenueAnalytics } from '../modules/business/entities/venue-analytics.entity';
import { BusinessUser } from '../modules/business/entities/business-user.entity';
import { City } from '../modules/cities/entities/city.entity';

import { Role } from '../common/enums/roles.enum';
import { TagCategory } from '../common/enums/tag-category.enum';

import {
  MANCHESTER_VENUES,
  VENUE_BUSYNESS,
  VENUE_VIBES,
  MOCK_OFFERS,
  MOCK_NOTIFICATIONS,
  MOCK_ANALYTICS,
  MOCK_BUSINESS_USERS,
  VIBE_TAGS,
  MUSIC_TAGS,
} from './seed-data';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
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
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
    @InjectRepository(VenueAnalytics)
    private analyticsRepository: Repository<VenueAnalytics>,
    @InjectRepository(BusinessUser)
    private businessUsersRepository: Repository<BusinessUser>,
    @InjectRepository(City)
    private citiesRepository: Repository<City>,
  ) {}

  async onModuleInit() {
    // Retry logic to handle race condition with TypeORM synchronize on fresh databases
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const venueCount = await this.venuesRepository.count();
        if (venueCount === 0) {
          this.logger.log('No data found — running seed...');
          await this.seed();
          this.logger.log('Seed complete!');
        } else {
          this.logger.log(`Database already has ${venueCount} venues — skipping seed.`);
          // Ensure cities exist and backfill cityId on existing venues
          await this.seedCities();
          await this.backfillVenueCityIds();
        }
        return; // Success — exit retry loop
      } catch (err) {
        const error = err as any;
        if (attempt < maxRetries && error?.driverError?.code === '42P01') {
          this.logger.warn(`Tables not ready yet (attempt ${attempt}/${maxRetries}). Retrying in ${attempt * 2}s...`);
          await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
        } else {
          this.logger.error('Seed failed after retries', error?.stack || error);
          // Don't crash the app — just log the error
          return;
        }
      }
    }
  }

  async seed() {
    // 1. Seed Cities
    await this.seedCities();

    // 2. Seed Tags
    await this.seedTags();

    // 3. Seed Admin User
    const adminUser = await this.seedAdminUser();

    // 4. Seed Demo User (for notifications)
    const demoUser = await this.seedDemoUser();

    // 5. Seed Venues
    const savedVenues = await this.seedVenues();

    // 6. Seed Busyness
    await this.seedBusyness(savedVenues);

    // 7. Seed Vibes
    await this.seedVibes(savedVenues);

    // 8. Seed Offers
    await this.seedOffers(savedVenues);

    // 9. Seed Notifications
    await this.seedNotifications(demoUser, savedVenues);

    // 10. Seed Analytics
    await this.seedAnalytics(savedVenues);

    // 11. Seed Business Users (Week 4)
    await this.seedBusinessUsers(savedVenues);

    this.logger.log('All seed data inserted successfully.');
  }

  private async seedCities(): Promise<void> {
    const cities = [
      { slug: 'manchester', name: 'Manchester', countryCode: 'GB', timezone: 'Europe/London', defaultLocale: 'en-GB', latitude: 53.4808, longitude: -2.2426, detectionRadiusKm: 50, isActive: true },
      { slug: 'london', name: 'London', countryCode: 'GB', timezone: 'Europe/London', defaultLocale: 'en-GB', latitude: 51.5074, longitude: -0.1278, detectionRadiusKm: 50, isActive: true },
      { slug: 'birmingham', name: 'Birmingham', countryCode: 'GB', timezone: 'Europe/London', defaultLocale: 'en-GB', latitude: 52.4862, longitude: -1.8904, detectionRadiusKm: 50, isActive: true },
    ];
    for (const cityData of cities) {
      const existing = await this.citiesRepository.findOne({ where: { slug: cityData.slug } });
      if (!existing) {
        await this.citiesRepository.save(this.citiesRepository.create(cityData));
      }
    }
    this.logger.log('Seeded cities: Manchester, London, Birmingham');
  }

  private async seedTags(): Promise<void> {
    const vibeTags = VIBE_TAGS.map((name) =>
      this.tagsRepository.create({ name, category: TagCategory.VIBE, isActive: true }),
    );
    const musicTags = MUSIC_TAGS.map((name) =>
      this.tagsRepository.create({ name, category: TagCategory.MUSIC, isActive: true }),
    );
    await this.tagsRepository.save([...vibeTags, ...musicTags]);
    this.logger.log(`Seeded ${vibeTags.length} vibe tags + ${musicTags.length} music tags`);
  }

  private async seedAdminUser(): Promise<User> {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = this.usersRepository.create({
      email: 'admin@reki.app',
      name: 'REKI Admin',
      password: hashedPassword,
      role: Role.ADMIN,
      isVerified: true,
      isActive: true,
    });
    const saved = await this.usersRepository.save(admin);
    this.logger.log('Seeded admin user: admin@reki.app');
    return saved;
  }

  private async seedDemoUser(): Promise<User> {
    const hashedPassword = await bcrypt.hash('demo1234', 10);
    const user = this.usersRepository.create({
      email: 'demo@reki.app',
      name: 'Demo User',
      password: hashedPassword,
      role: Role.USER,
      isVerified: true,
      isActive: true,
      preferences: {
        vibes: ['Chill', 'Party', 'Live Music'],
        music: ['House', 'R&B', 'Indie'],
      },
    });
    const saved = await this.usersRepository.save(user);
    this.logger.log('Seeded demo user: demo@reki.app');
    return saved;
  }

  private async seedVenues(): Promise<Venue[]> {
    const manchesterCity = await this.citiesRepository.findOne({ where: { slug: 'manchester' } });
    const venues = MANCHESTER_VENUES.map((v) =>
      this.venuesRepository.create({
        ...v,
        cityId: manchesterCity?.id,
      }),
    );
    const saved = await this.venuesRepository.save(venues);
    this.logger.log(`Seeded ${saved.length} Manchester venues`);
    return saved;
  }

  private async seedBusyness(venues: Venue[]): Promise<void> {
    const records = venues.map((venue, i) =>
      this.busynessRepository.create({
        venueId: venue.id,
        level: VENUE_BUSYNESS[i].level,
        percentage: VENUE_BUSYNESS[i].percentage,
      }),
    );
    await this.busynessRepository.save(records);
    this.logger.log(`Seeded busyness for ${records.length} venues`);
  }

  private async seedVibes(venues: Venue[]): Promise<void> {
    const records = venues.map((venue, i) =>
      this.vibesRepository.create({
        venueId: venue.id,
        tags: VENUE_VIBES[i].tags,
        musicGenre: VENUE_VIBES[i].musicGenre,
        description: VENUE_VIBES[i].description,
        vibeCheckScore: VENUE_VIBES[i].vibeCheckScore,
        responseCount: VENUE_VIBES[i].responseCount,
      }),
    );
    await this.vibesRepository.save(records);
    this.logger.log(`Seeded vibes for ${records.length} venues`);
  }

  private async seedOffers(venues: Venue[]): Promise<void> {
    const records = MOCK_OFFERS.map((o) =>
      this.offersRepository.create({
        venueId: venues[o.venueIndex].id,
        title: o.title,
        description: o.description,
        type: o.type,
        validDays: o.validDays,
        validTimeStart: o.validTimeStart,
        validTimeEnd: o.validTimeEnd,
        isActive: o.isActive,
        maxRedemptions: o.maxRedemptions,
        savingValue: o.savingValue,
        expiresAt: o.expiresAt,
      }),
    );
    await this.offersRepository.save(records);
    this.logger.log(`Seeded ${records.length} offers`);
  }

  private async seedNotifications(user: User, venues: Venue[]): Promise<void> {
    const now = new Date();
    const records = MOCK_NOTIFICATIONS.map((n, i) => {
      // Spread notifications across today, yesterday, and earlier
      const createdAt = new Date(now);
      if (i < 3) {
        createdAt.setHours(createdAt.getHours() - i); // today
      } else if (i < 5) {
        createdAt.setDate(createdAt.getDate() - 1);   // yesterday
        createdAt.setHours(createdAt.getHours() - i);
      } else {
        createdAt.setDate(createdAt.getDate() - (i - 2)); // earlier
      }

      return this.notificationsRepository.create({
        userId: user.id,
        type: n.type,
        title: n.title,
        message: n.message,
        icon: n.icon,
        venueId: n.venueIndex !== undefined ? venues[n.venueIndex].id : null,
        isRead: i > 4, // first 5 unread, rest read
        createdAt,
      });
    });
    await this.notificationsRepository.save(records);
    this.logger.log(`Seeded ${records.length} notifications`);
  }

  private async seedAnalytics(venues: Venue[]): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD' string
    const records = MOCK_ANALYTICS.map((a) =>
      this.analyticsRepository.create({
        venueId: venues[a.venueIndex].id,
        date: today,
        liveBusynessPercent: a.liveBusynessPercent,
        busynessChange: a.busynessChange,
        avgDwellTime: a.avgDwellTime,
        dwellTimeChange: a.dwellTimeChange,
        vibeCheckScore: a.vibeCheckScore,
        vibeCheckResponses: a.vibeCheckResponses,
        socialShares: a.socialShares,
        socialSharesChange: a.socialSharesChange,
        totalViews: a.totalViews,
        totalSaves: a.totalSaves,
        offerClicks: a.offerClicks,
        redemptions: a.redemptions,
      }),
    );
    await this.analyticsRepository.save(records);
    this.logger.log(`Seeded analytics for ${records.length} venues`);
  }

  private async seedBusinessUsers(venues: Venue[]): Promise<void> {
    const records = [];
    for (const bu of MOCK_BUSINESS_USERS) {
      const hashedPassword = await bcrypt.hash(bu.password, 10);
      records.push(
        this.businessUsersRepository.create({
          email: bu.email,
          name: bu.name,
          password: hashedPassword,
          role: bu.role,
          phone: bu.phone,
          isApproved: true,
          isActive: true,
        }),
      );
    }
    const savedUsers = await this.businessUsersRepository.save(records);
    const savedByEmail = new Map(savedUsers.map((user) => [user.email, user]));
    const venueUpdates = [];

    for (const bu of MOCK_BUSINESS_USERS) {
      const user = savedByEmail.get(bu.email);
      if (!user) {
        throw new Error(`Business user not saved: ${bu.email}`);
      }
      venueUpdates.push({
        id: venues[bu.venueIndex].id,
        businessUserId: user.id,
      });
    }

    await this.venuesRepository.save(venueUpdates);
    this.logger.log(`Seeded ${savedUsers.length} business users`);
  }

  private async backfillVenueCityIds(): Promise<void> {
    const cities = await this.citiesRepository.find({ where: { isActive: true } });
    if (cities.length === 0) return;

    const cityByName = new Map(cities.map((c) => [c.name.toLowerCase(), c]));
    const venuesWithoutCity = await this.venuesRepository
      .createQueryBuilder('venue')
      .where('venue.cityId IS NULL')
      .getMany();

    if (venuesWithoutCity.length === 0) return;

    const updates = venuesWithoutCity
      .map((v) => {
        const city = cityByName.get(v.city?.toLowerCase());
        return city ? { id: v.id, cityId: city.id } : null;
      })
      .filter(Boolean);

    if (updates.length > 0) {
      await this.venuesRepository.save(updates);
      this.logger.log(`Backfilled cityId for ${updates.length} existing venues`);
    }
  }
}
