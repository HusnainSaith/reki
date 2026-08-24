import { VenueAnalytics } from './venue-analytics.entity';

describe('VenueAnalytics Entity', () => {
  let analytics: VenueAnalytics;

  beforeEach(() => {
    analytics = new VenueAnalytics();
  });

  it('should create a venue analytics instance', () => {
    expect(analytics).toBeDefined();
    expect(analytics).toBeInstanceOf(VenueAnalytics);
  });

  it('should store venueId', () => {
    analytics.venueId = 'venue-uuid-123';
    expect(analytics.venueId).toBe('venue-uuid-123');
  });

  it('should store date', () => {
    analytics.date = '2026-04-18';
    expect(analytics.date).toBe('2026-04-18');
  });

  it('should store busyness percentage', () => {
    analytics.liveBusynessPercent = 88;
    expect(analytics.liveBusynessPercent).toBe(88);
  });

  it('should store busyness change string', () => {
    analytics.busynessChange = '+12%';
    expect(analytics.busynessChange).toBe('+12%');
  });

  it('should store dwell time metrics', () => {
    analytics.avgDwellTime = 54;
    analytics.dwellTimeChange = '+8%';
    expect(analytics.avgDwellTime).toBe(54);
  });

  it('should store vibe check metrics', () => {
    analytics.vibeCheckScore = 4.8;
    analytics.vibeCheckResponses = 42;
    expect(analytics.vibeCheckScore).toBeCloseTo(4.8, 1);
    expect(analytics.vibeCheckResponses).toBe(42);
  });

  it('should store social shares', () => {
    analytics.socialShares = 128;
    analytics.socialSharesChange = '+4.5%';
    expect(analytics.socialShares).toBe(128);
  });

  it('should store engagement metrics', () => {
    analytics.totalViews = 1250;
    analytics.totalSaves = 340;
    analytics.offerClicks = 89;
    analytics.redemptions = 42;
    expect(analytics.totalViews).toBe(1250);
    expect(analytics.totalSaves).toBe(340);
    expect(analytics.offerClicks).toBe(89);
    expect(analytics.redemptions).toBe(42);
  });

  it('should default counters to 0', () => {
    const fresh = new VenueAnalytics();
    expect(fresh.totalViews).toBeUndefined();
  });
});
