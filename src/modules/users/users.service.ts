import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Redemption } from '../offers/entities/redemption.entity';
import { VenueAnalytics } from '../business/entities/venue-analytics.entity';
import { paginate } from '../../common/dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Redemption)
    private redemptionsRepository: Repository<Redemption>,
    @InjectRepository(VenueAnalytics)
    private venueAnalyticsRepository: Repository<VenueAnalytics>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  // === Preferences ===

  async getPreferences(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return {
      preferences: user.preferences || { vibes: [], music: [] },
      hasPreferences: !!user.preferences,
    };
  }

  async savePreferences(userId: string, vibes: string[], music: string[]) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    user.preferences = { vibes, music };
    await this.usersRepository.save(user);

    return { preferences: user.preferences };
  }

  // === Saved Venues ===

  async getSavedVenues(userId: string): Promise<string[]> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user.savedVenues || [];
  }

  async saveVenue(userId: string, venueId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const venues = user.savedVenues || [];
    if (!venues.includes(venueId)) {
      venues.push(venueId);
      user.savedVenues = venues;
      await this.usersRepository.save(user);

      // Track in analytics — increment today's save count
      const today = new Date().toISOString().split('T')[0];
      let analytics = await this.venueAnalyticsRepository.findOne({ where: { venueId, date: today } });
      if (!analytics) {
        analytics = this.venueAnalyticsRepository.create({ venueId, date: today });
      }
      analytics.totalSaves = (analytics.totalSaves || 0) + 1;
      await this.venueAnalyticsRepository.save(analytics);
    }

    return { saved: true, savedVenues: user.savedVenues };
  }

  async unsaveVenue(userId: string, venueId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    user.savedVenues = (user.savedVenues || []).filter((id) => id !== venueId);
    await this.usersRepository.save(user);

    return { saved: false, savedVenues: user.savedVenues };
  }

  // === Redemptions ===

  async getRedemptions(userId: string, page = 1, limit = 10) {
    const [redemptions, total] = await this.redemptionsRepository.findAndCount({
      where: { userId },
      relations: ['offer', 'venue'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { redemptions, ...paginate(redemptions, total, page, limit).pagination };
  }

  // === Profile ===

  async getProfile(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar || null,
      authProvider: user.authProvider,
      isVerified: user.isVerified,
      preferences: user.preferences || { vibes: [], music: [] },
      savedVenuesCount: (user.savedVenues || []).length,
      location: {
        currentLat: user.currentLat,
        currentLng: user.currentLng,
        locationUpdatedAt: user.locationUpdatedAt,
        locationEnabled: user.locationEnabled,
        backgroundLocationEnabled: user.backgroundLocationEnabled,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(
    userId: string,
    name?: string,
    phone?: string,
    avatarUrl?: string,
    currentLat?: number,
    currentLng?: number,
    locationEnabled?: boolean,
    backgroundLocationEnabled?: boolean,
  ) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (avatarUrl !== undefined) user.avatar = avatarUrl;
    if (currentLat !== undefined) user.currentLat = currentLat;
    if (currentLng !== undefined) user.currentLng = currentLng;
    if (locationEnabled !== undefined) user.locationEnabled = locationEnabled;
    if (backgroundLocationEnabled !== undefined) user.backgroundLocationEnabled = backgroundLocationEnabled;
    if (currentLat !== undefined || currentLng !== undefined) user.locationUpdatedAt = new Date();

    await this.usersRepository.save(user);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar || null,
      location: {
        currentLat: user.currentLat,
        currentLng: user.currentLng,
        locationUpdatedAt: user.locationUpdatedAt,
        locationEnabled: user.locationEnabled,
        backgroundLocationEnabled: user.backgroundLocationEnabled,
      },
    };
  }

  async deleteAccount(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Delete FK-dependent records before removing the user
    const mgr = this.usersRepository.manager;
    await mgr.query(`DELETE FROM notifications WHERE "userId" = $1`, [userId]);
    await mgr.query(`DELETE FROM refresh_tokens WHERE "userId" = $1`, [userId]);
    await mgr.query(`DELETE FROM redemptions WHERE "userId" = $1`, [userId]);
    await mgr.query(`DELETE FROM devices WHERE "userId" = $1`, [userId]);
    await mgr.query(`DELETE FROM notification_preferences WHERE "userId" = $1`, [userId]);
    await mgr.query(`DELETE FROM sync_actions WHERE "userId" = $1`, [userId]);
    await mgr.query(`DELETE FROM venue_reviews WHERE "userId" = $1`, [userId]);
    await mgr.query(`DELETE FROM vibe_accuracy_votes WHERE "userId" = $1`, [userId]);
    await mgr.query(`DELETE FROM venue_check_ins WHERE "userId" = $1`, [userId]);
    await mgr.query(`DELETE FROM venue_history WHERE "userId" = $1`, [userId]);
    await mgr.query(`DELETE FROM venue_shares WHERE "userId" = $1`, [userId]);

    await this.usersRepository.remove(user);

    return { success: true, message: 'Account deleted successfully' };
  }
}
