import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { haversineDistance } from '../../common/utils/distance.util';
import { User } from '../users/entities/user.entity';
import { Venue } from '../venues/entities/venue.entity';
import { CheckInDto, CreateReviewDto, UpdateReviewDto, VenueHistoryDto, VenueShareDto, VibeAccuracyVoteDto } from './dto/engagement.dto';
import { CheckIn } from './entities/check-in.entity';
import { Review } from './entities/review.entity';
import { VenueHistory } from './entities/venue-history.entity';
import { VenueShare } from './entities/venue-share.entity';
import { VibeAccuracyVote } from './entities/vibe-accuracy-vote.entity';

@Injectable()
export class EngagementService {
  constructor(
    @InjectRepository(Review) private reviews: Repository<Review>,
    @InjectRepository(VibeAccuracyVote) private votes: Repository<VibeAccuracyVote>,
    @InjectRepository(CheckIn) private checkIns: Repository<CheckIn>,
    @InjectRepository(VenueHistory) private history: Repository<VenueHistory>,
    @InjectRepository(VenueShare) private shares: Repository<VenueShare>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Venue) private venues: Repository<Venue>,
  ) {}

  private async requireVenue(venueId: string) {
    const venue = await this.venues.findOne({ where: { id: venueId } });
    if (!venue) throw new NotFoundException('Venue not found');
    return venue;
  }

  async getReviews(venueId: string, page = 1, limit = 20, sort = 'newest', userId?: string) {
    await this.requireVenue(venueId);
    page = Math.max(1, page); limit = Math.min(100, Math.max(1, limit));
    const order: any = sort === 'highest' ? { rating: 'DESC', createdAt: 'DESC' }
      : sort === 'lowest' ? { rating: 'ASC', createdAt: 'DESC' } : { createdAt: 'DESC' };
    const [rows, total] = await this.reviews.findAndCount({ where: { venueId }, order, skip: (page - 1) * limit, take: limit });
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users = userIds.length ? await this.users.createQueryBuilder('u').where('u.id IN (:...ids)', { ids: userIds }).getMany() : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    const all = await this.reviews.find({ where: { venueId } });
    const averageRating = all.length ? Number((all.reduce((sum, r) => sum + r.rating, 0) / all.length).toFixed(1)) : 0;
    const vibeAccuracyPercentage = all.length ? Math.round(all.filter((r) => r.vibeAccurate).length * 100 / all.length) : 0;
    return {
      reviews: rows.map((r) => ({ ...r, user: { id: r.userId, name: userMap.get(r.userId)?.name, avatar: userMap.get(r.userId)?.avatar || null }, isMine: r.userId === userId })),
      summary: { averageRating, totalReviews: total, vibeAccuracyPercentage }, page, limit, total,
    };
  }

  async createReview(userId: string, venueId: string, dto: CreateReviewDto) {
    await this.requireVenue(venueId);
    let review = await this.reviews.findOne({ where: { userId, venueId } });
    review = review ? Object.assign(review, dto) : this.reviews.create({ userId, venueId, ...dto, text: dto.text || null });
    review = await this.reviews.save(review);
    return { review: { ...review, isMine: true } };
  }

  async updateReview(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.reviews.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException('You can only modify your own review');
    return { review: { ...(await this.reviews.save(Object.assign(review, dto))), isMine: true } };
  }

  async deleteReview(userId: string, reviewId: string) {
    const review = await this.reviews.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException('You can only delete your own review');
    await this.reviews.remove(review); return { deleted: true };
  }

  async vote(userId: string, venueId: string, dto: VibeAccuracyVoteDto) {
    await this.requireVenue(venueId);
    let vote = await this.votes.findOne({ where: { userId, venueId } });
    const values = { accurate: dto.accurate, observedVibe: dto.observedVibe || null, votedAt: dto.votedAt ? new Date(dto.votedAt) : new Date() };
    vote = vote ? Object.assign(vote, values) : this.votes.create({ userId, venueId, ...values });
    await this.votes.save(vote);
    const [accurateVotes, inaccurateVotes] = await Promise.all([this.votes.count({ where: { venueId, accurate: true } }), this.votes.count({ where: { venueId, accurate: false } })]);
    const total = accurateVotes + inaccurateVotes;
    return { venueId, accurateVotes, inaccurateVotes, accuracyPercentage: total ? Math.round(accurateVotes * 100 / total) : 0, userVote: vote.accurate };
  }

  async checkIn(userId: string, venueId: string, dto: CheckInDto) {
    const venue = await this.requireVenue(venueId);
    if (dto.accuracy > 100) throw new BadRequestException('Location accuracy must be 100 metres or better');
    const metres = haversineDistance(dto.lat, dto.lng, Number(venue.lat), Number(venue.lng)) * 1609.344;
    if (metres > 250) throw new BadRequestException(`You must be within 250 metres of the venue (currently ${Math.round(metres)}m away)`);
    const last = await this.checkIns.findOne({ where: { userId, venueId }, order: { checkedInAt: 'DESC' } });
    if (last && Date.now() - new Date(last.checkedInAt).getTime() < 4 * 60 * 60 * 1000) throw new BadRequestException('You already checked in recently');
    const checkedInAt = dto.timestamp ? new Date(dto.timestamp) : new Date();
    const row = await this.checkIns.save(this.checkIns.create({ userId, venueId, lat: dto.lat, lng: dto.lng, accuracy: dto.accuracy, checkedInAt, pointsAwarded: 20 }));
    const achievements = await this.getAchievements(userId);
    return { checkIn: { id: row.id, venueId, venueName: venue.name, checkedInAt }, pointsAwarded: 20, totalPoints: achievements.points, newAchievements: achievements.achievements.filter((a) => a.unlocked && a.progress === a.target).map(({ id, title }) => ({ id, title })) };
  }

  async getCheckIns(userId: string, page = 1, limit = 20) {
    page = Math.max(1, page); limit = Math.min(100, Math.max(1, limit));
    const [rows, total] = await this.checkIns.findAndCount({ where: { userId }, order: { checkedInAt: 'DESC' }, skip: (page - 1) * limit, take: limit });
    const venueMap = await this.venueMap(rows.map((r) => r.venueId));
    return { checkIns: rows.map((r) => ({ ...r, venueName: venueMap.get(r.venueId)?.name })), page, limit, total };
  }

  async recordHistory(userId: string, venueId: string, dto: VenueHistoryDto) {
    await this.requireVenue(venueId);
    let row = await this.history.findOne({ where: { userId, venueId } });
    const values = { viewedAt: dto.viewedAt ? new Date(dto.viewedAt) : new Date(), source: dto.source || null };
    row = row ? Object.assign(row, values) : this.history.create({ userId, venueId, ...values });
    await this.history.save(row); return { recorded: true, venueId, ...values };
  }

  async getHistory(userId: string) {
    const rows = await this.history.find({ where: { userId }, order: { viewedAt: 'DESC' }, take: 100 });
    const venueMap = await this.venueMap(rows.map((r) => r.venueId));
    return { venues: rows.map((r) => { const v = venueMap.get(r.venueId); return { venueId: r.venueId, venue: v ? { id: v.id, name: v.name, type: v.category, coverImageUrl: v.images?.[0] || null } : null, viewedAt: r.viewedAt, source: r.source }; }) };
  }
  async clearHistory(userId: string) { await this.history.delete({ userId }); return { cleared: true }; }

  async share(userId: string, venueId: string, dto: VenueShareDto) {
    await this.requireVenue(venueId);
    await this.shares.save(this.shares.create({ userId, venueId, channel: dto.channel, sharedAt: dto.sharedAt ? new Date(dto.sharedAt) : new Date(), pointsAwarded: 5 }));
    return { recorded: true, pointsAwarded: 5, totalShares: await this.shares.count({ where: { venueId } }) };
  }

  async getAchievements(userId: string) {
    const [checkIns, reviewCount, shareCount] = await Promise.all([this.checkIns.find({ where: { userId } }), this.reviews.count({ where: { userId } }), this.shares.count({ where: { userId } })]);
    const uniqueVenues = new Set(checkIns.map((c) => c.venueId)).size;
    const points = checkIns.reduce((s, c) => s + c.pointsAwarded, 0) + reviewCount * 10 + shareCount * 5;
    const defs = [
      ['first-night','First Night Out','Complete your first venue check-in','first-night',checkIns.length,1],
      ['city-explorer','City Explorer','Check in at 5 different venues','city-explorer',uniqueVenues,5],
      ['critic','Nightlife Critic','Write 5 venue reviews','critic',reviewCount,5],
      ['socialite','Socialite','Share 10 venues','socialite',shareCount,10],
    ] as const;
    return { points, level: Math.floor(points / 100) + 1, achievements: defs.map(([id,title,description,icon,value,target]) => ({ id,title,description,icon,progress: Math.min(value,target),target,unlocked:value>=target,unlockedAt:value>=target ? new Date().toISOString() : null })) };
  }

  async leaderboard(period = 'weekly', city = 'manchester', limit = 50, currentUserId?: string) {
    const end = new Date(); const start = new Date(0);
    if (period === 'weekly') start.setTime(end.getTime() - 7 * 86400000); else if (period === 'monthly') start.setTime(end.getTime() - 30 * 86400000);
    const [checkIns, shares, reviews] = await Promise.all([
      this.checkIns.find({ where: { checkedInAt: Between(start, end) } }), this.shares.find({ where: { sharedAt: Between(start, end) } }), this.reviews.find({ where: { createdAt: Between(start, end) } }),
    ]);
    const points = new Map<string, number>();
    checkIns.forEach((x) => points.set(x.userId, (points.get(x.userId)||0)+x.pointsAwarded)); shares.forEach((x) => points.set(x.userId,(points.get(x.userId)||0)+5)); reviews.forEach((x) => points.set(x.userId,(points.get(x.userId)||0)+10));
    const userMap = await this.userMap([...points.keys()]);
    const ranked = [...points.entries()].map(([userId,p]) => ({ userId, points:p })).sort((a,b)=>b.points-a.points);
    const entries = ranked.slice(0, Math.min(100, Math.max(1, limit))).map((x,i) => ({ rank:i+1,user:{id:x.userId,name:userMap.get(x.userId)?.name,avatar:userMap.get(x.userId)?.avatar||null},points:x.points,isCurrentUser:x.userId===currentUserId }));
    const mine = ranked.findIndex((x)=>x.userId===currentUserId);
    return { period, city, startsAt: period === 'all_time' ? null : start.toISOString(), endsAt:end.toISOString(), entries, currentUser: mine < 0 ? null : { rank:mine+1,points:ranked[mine].points } };
  }

  private async venueMap(ids: string[]) { const unique=[...new Set(ids)]; const rows=unique.length?await this.venues.createQueryBuilder('v').where('v.id IN (:...ids)',{ids:unique}).getMany():[]; return new Map(rows.map((x)=>[x.id,x])); }
  private async userMap(ids: string[]) { const rows=ids.length?await this.users.createQueryBuilder('u').where('u.id IN (:...ids)',{ids}).getMany():[]; return new Map(rows.map((x)=>[x.id,x])); }
}
