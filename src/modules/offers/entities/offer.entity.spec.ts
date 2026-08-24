import { Offer } from './offer.entity';
import { OfferType } from '../../../common/enums';

describe('Offer Entity', () => {
  let offer: Offer;

  beforeEach(() => {
    offer = new Offer();
  });

  it('should create an offer instance', () => {
    expect(offer).toBeDefined();
    expect(offer).toBeInstanceOf(Offer);
  });

  it('should accept all valid offer types', () => {
    const types = Object.values(OfferType);
    expect(types.length).toBeGreaterThan(0);
    types.forEach(type => {
      offer.type = type;
      expect(offer.type).toBe(type);
    });
  });

  it('should store valid days array', () => {
    offer.validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    expect(offer.validDays).toHaveLength(5);
    expect(offer.validDays).toContain('monday');
  });

  it('should store time range', () => {
    offer.validTimeStart = '17:00';
    offer.validTimeEnd = '19:00';
    expect(offer.validTimeStart).toBe('17:00');
    expect(offer.validTimeEnd).toBe('19:00');
  });

  it('should have boolean isActive', () => {
    offer.isActive = true;
    expect(offer.isActive).toBe(true);
    offer.isActive = false;
    expect(offer.isActive).toBe(false);
  });

  it('should track redemption count', () => {
    offer.redemptionCount = 0;
    expect(offer.redemptionCount).toBe(0);
    offer.redemptionCount = 42;
    expect(offer.redemptionCount).toBe(42);
  });

  it('should have maxRedemptions', () => {
    offer.maxRedemptions = 100;
    expect(offer.maxRedemptions).toBe(100);
  });

  it('should store saving value as decimal', () => {
    offer.savingValue = 14.50;
    expect(offer.savingValue).toBeCloseTo(14.50, 2);
  });

  it('should store expiry date', () => {
    const expiry = new Date('2026-12-31');
    offer.expiresAt = expiry;
    expect(offer.expiresAt).toEqual(expiry);
  });

  it('should allow null expiry', () => {
    offer.expiresAt = null;
    expect(offer.expiresAt).toBeNull();
  });
});
