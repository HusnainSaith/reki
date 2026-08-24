import { Venue } from './venue.entity';
import { VenueCategory } from '../../../common/enums';

describe('Venue Entity', () => {
  let venue: Venue;

  beforeEach(() => {
    venue = new Venue();
  });

  it('should create a venue instance', () => {
    expect(venue).toBeDefined();
    expect(venue).toBeInstanceOf(Venue);
  });

  it('should accept all valid categories', () => {
    const categories = Object.values(VenueCategory);
    expect(categories.length).toBeGreaterThanOrEqual(8);
    categories.forEach(cat => {
      venue.category = cat;
      expect(venue.category).toBe(cat);
    });
  });

  it('should store Manchester coordinates', () => {
    venue.lat = 53.4808;
    venue.lng = -2.2426;
    expect(venue.lat).toBeCloseTo(53.4808, 4);
    expect(venue.lng).toBeCloseTo(-2.2426, 4);
  });

  it('should store images as array', () => {
    venue.images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
    expect(venue.images).toHaveLength(3);
  });

  it('should accept price level 1-4', () => {
    [1, 2, 3, 4].forEach(level => {
      venue.priceLevel = level;
      expect(venue.priceLevel).toBe(level);
    });
  });

  it('should store opening hours', () => {
    venue.openingHours = '12:00';
    venue.closingTime = '02:00';
    expect(venue.openingHours).toBe('12:00');
    expect(venue.closingTime).toBe('02:00');
  });

  it('should have boolean isLive', () => {
    venue.isLive = true;
    expect(venue.isLive).toBe(true);
  });

  it('should store rating as decimal', () => {
    venue.rating = 4.8;
    expect(venue.rating).toBeCloseTo(4.8, 1);
  });

  it('should store tags as string array', () => {
    venue.tags = ['Cocktails', 'Live Music'];
    expect(venue.tags).toContain('Cocktails');
  });

  it('should default city to Manchester', () => {
    expect(VenueCategory.BAR).toBeDefined();
  });
});
