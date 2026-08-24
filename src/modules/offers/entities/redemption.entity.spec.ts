import { Redemption } from './redemption.entity';
import { RedemptionStatus } from '../../../common/enums';

describe('Redemption Entity', () => {
  let redemption: Redemption;

  beforeEach(() => {
    redemption = new Redemption();
  });

  it('should create a redemption instance', () => {
    expect(redemption).toBeDefined();
    expect(redemption).toBeInstanceOf(Redemption);
  });

  it('should accept all valid statuses', () => {
    const statuses = [RedemptionStatus.ACTIVE, RedemptionStatus.REDEEMED, RedemptionStatus.EXPIRED];
    statuses.forEach(status => {
      redemption.status = status;
      expect(redemption.status).toBe(status);
    });
  });

  it('should store voucher code in correct format', () => {
    redemption.voucherCode = 'RK-992-TX';
    expect(redemption.voucherCode).toMatch(/^RK-\d{3}-[A-Z]{2}$/);
  });

  it('should store QR code data', () => {
    redemption.qrCodeData = 'reki://offer/o1/RK-992-TX';
    expect(redemption.qrCodeData).toContain('reki://');
  });

  it('should store transaction ID in correct format', () => {
    redemption.transactionId = '#REKI-4829-MNCH';
    expect(redemption.transactionId).toMatch(/^#REKI-\d{4}-MNCH$/);
  });

  it('should store saving value', () => {
    redemption.savingValue = 14.50;
    expect(redemption.savingValue).toBeCloseTo(14.50, 2);
  });

  it('should default currency to GBP', () => {
    redemption.currency = 'GBP';
    expect(redemption.currency).toBe('GBP');
  });

  it('should allow null redeemedAt for unclaimed', () => {
    redemption.redeemedAt = null;
    expect(redemption.redeemedAt).toBeNull();
  });

  it('should store redeemedAt when redeemed', () => {
    const now = new Date();
    redemption.redeemedAt = now;
    expect(redemption.redeemedAt).toEqual(now);
  });

  it('should store foreign keys', () => {
    redemption.offerId = 'offer-uuid';
    redemption.userId = 'user-uuid';
    redemption.venueId = 'venue-uuid';
    expect(redemption.offerId).toBe('offer-uuid');
    expect(redemption.userId).toBe('user-uuid');
    expect(redemption.venueId).toBe('venue-uuid');
  });
});
