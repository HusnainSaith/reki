import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { NoGuestGuard } from '../../common/guards';
import { JwtAuthGuard } from '../auth/guards';
import { LeaderboardsController, ReviewsController, UserEngagementController, VenueEngagementController } from './engagement.controller';
import { EngagementService } from './engagement.service';

const venueId = '11111111-1111-4111-8111-111111111111';
const reviewId = '22222222-2222-4222-8222-222222222222';
const user = { id: '33333333-3333-4333-8333-333333333333', role: 'user' };

class TestAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) { ctx.switchToHttp().getRequest().user = user; return true; }
}

describe('Engagement endpoints', () => {
  let app: INestApplication;
  const service = {
    getReviews: jest.fn().mockResolvedValue({ reviews: [], summary: {}, total: 0 }),
    createReview: jest.fn().mockResolvedValue({ review: { id: reviewId } }),
    updateReview: jest.fn().mockResolvedValue({ review: { id: reviewId } }),
    deleteReview: jest.fn().mockResolvedValue({ deleted: true }),
    vote: jest.fn().mockResolvedValue({ accuracyPercentage: 100 }),
    checkIn: jest.fn().mockResolvedValue({ checkIn: { id: 'c1' }, pointsAwarded: 20 }),
    getCheckIns: jest.fn().mockResolvedValue({ checkIns: [], total: 0 }),
    recordHistory: jest.fn().mockResolvedValue({ recorded: true }),
    getHistory: jest.fn().mockResolvedValue({ venues: [] }),
    clearHistory: jest.fn().mockResolvedValue({ cleared: true }),
    getAchievements: jest.fn().mockResolvedValue({ points: 0, level: 1, achievements: [] }),
    leaderboard: jest.fn().mockResolvedValue({ period: 'weekly', entries: [] }),
    share: jest.fn().mockResolvedValue({ recorded: true, pointsAwarded: 5 }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [VenueEngagementController, ReviewsController, UserEngagementController, LeaderboardsController],
      providers: [{ provide: EngagementService, useValue: service }],
    }).overrideGuard(JwtAuthGuard).useClass(TestAuthGuard)
      .overrideGuard(NoGuestGuard).useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  afterAll(() => app.close());

  it('GET /venues/:venueId/reviews', () => request(app.getHttpServer()).get(`/venues/${venueId}/reviews`).expect(200));
  it('POST /venues/:venueId/reviews', () => request(app.getHttpServer()).post(`/venues/${venueId}/reviews`).send({ rating: 5, text: 'Great', vibeAccurate: true }).expect(201));
  it('PATCH /reviews/:reviewId', () => request(app.getHttpServer()).patch(`/reviews/${reviewId}`).send({ rating: 4 }).expect(200));
  it('DELETE /reviews/:reviewId', () => request(app.getHttpServer()).delete(`/reviews/${reviewId}`).expect(200));
  it('POST /venues/:venueId/vibe-accuracy-votes', () => request(app.getHttpServer()).post(`/venues/${venueId}/vibe-accuracy-votes`).send({ accurate: true }).expect(201));
  it('POST /venues/:venueId/check-ins', () => request(app.getHttpServer()).post(`/venues/${venueId}/check-ins`).send({ lat: 53.4808, lng: -2.2426, accuracy: 15 }).expect(201));
  it('GET /users/check-ins', () => request(app.getHttpServer()).get('/users/check-ins').expect(200));
  it('POST /users/history/venues/:venueId', () => request(app.getHttpServer()).post(`/users/history/venues/${venueId}`).send({ source: 'home' }).expect(201));
  it('GET /users/history/venues', () => request(app.getHttpServer()).get('/users/history/venues').expect(200));
  it('DELETE /users/history/venues', () => request(app.getHttpServer()).delete('/users/history/venues').expect(200));
  it('GET /users/achievements', () => request(app.getHttpServer()).get('/users/achievements').expect(200));
  it('GET /leaderboards', () => request(app.getHttpServer()).get('/leaderboards?period=weekly').expect(200));
  it('POST /venues/:venueId/shares', () => request(app.getHttpServer()).post(`/venues/${venueId}/shares`).send({ channel: 'copy_link' }).expect(201));
  it('rejects invalid reviews', () => request(app.getHttpServer()).post(`/venues/${venueId}/reviews`).send({ rating: 6, vibeAccurate: true }).expect(400));
  it('rejects inaccurate check-in readings', () => request(app.getHttpServer()).post(`/venues/${venueId}/check-ins`).send({ lat: 53.4808, lng: -2.2426, accuracy: 101 }).expect(400));
});
