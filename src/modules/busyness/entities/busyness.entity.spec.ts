import { Busyness } from './busyness.entity';
import { BusynessLevel } from '../../../common/enums';

describe('Busyness Entity', () => {
  let busyness: Busyness;

  beforeEach(() => {
    busyness = new Busyness();
  });

  it('should create a busyness instance', () => {
    expect(busyness).toBeDefined();
    expect(busyness).toBeInstanceOf(Busyness);
  });

  it('should accept all valid busyness levels', () => {
    const levels = [BusynessLevel.QUIET, BusynessLevel.MODERATE, BusynessLevel.BUSY];
    levels.forEach(level => {
      busyness.level = level;
      expect(busyness.level).toBe(level);
    });
  });

  it('should store percentage in 0-100 range', () => {
    [0, 25, 50, 85, 100].forEach(pct => {
      busyness.percentage = pct;
      expect(busyness.percentage).toBe(pct);
    });
  });

  it('should map levels to correct percentages', () => {
    expect(BusynessLevel.QUIET).toBe('quiet');
    expect(BusynessLevel.MODERATE).toBe('moderate');
    expect(BusynessLevel.BUSY).toBe('busy');
  });

  it('should store updatedBy', () => {
    busyness.updatedBy = 'business-user-123';
    expect(busyness.updatedBy).toBe('business-user-123');
  });

  it('should store dwellTime as integer', () => {
    busyness.dwellTime = 54;
    expect(busyness.dwellTime).toBe(54);
  });

  it('should store venueId', () => {
    busyness.venueId = 'venue-uuid-123';
    expect(busyness.venueId).toBe('venue-uuid-123');
  });
});
