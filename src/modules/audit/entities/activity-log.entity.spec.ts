import { ActivityLog } from './activity-log.entity';

describe('ActivityLog Entity', () => {
  let log: ActivityLog;

  beforeEach(() => {
    log = new ActivityLog();
  });

  it('should create an activity log instance', () => {
    expect(log).toBeDefined();
    expect(log).toBeInstanceOf(ActivityLog);
  });

  it('should store actor information', () => {
    log.actorId = 'business-user-123';
    log.actorRole = 'business';
    expect(log.actorId).toBe('business-user-123');
    expect(log.actorRole).toBe('business');
  });

  it('should store action types', () => {
    const actions = ['BUSINESS_LOGIN', 'STATUS_UPDATE', 'OFFER_CREATED'];
    actions.forEach(action => {
      log.action = action;
      expect(log.action).toBe(action);
    });
  });

  it('should store target and targetId', () => {
    log.target = 'venue';
    log.targetId = 'venue-uuid-123';
    expect(log.target).toBe('venue');
    expect(log.targetId).toBe('venue-uuid-123');
  });

  it('should store JSONB details', () => {
    log.details = {
      busyness: 'busy',
      percentage: 85,
      vibes: ['High Energy', 'Packed'],
    };
    expect(log.details).toHaveProperty('busyness', 'busy');
    expect(log.details).toHaveProperty('percentage', 85);
  });

  it('should allow null details', () => {
    log.details = null;
    expect(log.details).toBeNull();
  });

  it('should allow null targetId', () => {
    log.targetId = null;
    expect(log.targetId).toBeNull();
  });
});
