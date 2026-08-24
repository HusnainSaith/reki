import { Notification } from './notification.entity';
import { NotificationType } from '../../../common/enums';

describe('Notification Entity', () => {
  let notification: Notification;

  beforeEach(() => {
    notification = new Notification();
  });

  it('should create a notification instance', () => {
    expect(notification).toBeDefined();
    expect(notification).toBeInstanceOf(Notification);
  });

  it('should accept all valid notification types', () => {
    const types = Object.values(NotificationType);
    expect(types.length).toBe(8);
    types.forEach(type => {
      notification.type = type;
      expect(notification.type).toBe(type);
    });
  });

  it('should store title and message', () => {
    notification.title = "Albert's Schloss is peaking!";
    notification.message = '🔥 High Vibe Alert';
    expect(notification.title).toContain('peaking');
    expect(notification.message).toContain('Vibe Alert');
  });

  it('should default isRead to false', () => {
    notification.isRead = false;
    expect(notification.isRead).toBe(false);
  });

  it('should allow marking as read', () => {
    notification.isRead = true;
    expect(notification.isRead).toBe(true);
  });

  it('should allow optional venueId', () => {
    notification.venueId = 'venue-uuid';
    expect(notification.venueId).toBe('venue-uuid');
    notification.venueId = null;
    expect(notification.venueId).toBeNull();
  });

  it('should allow optional offerId', () => {
    notification.offerId = 'offer-uuid';
    expect(notification.offerId).toBe('offer-uuid');
    notification.offerId = null;
    expect(notification.offerId).toBeNull();
  });

  it('should store icon emoji', () => {
    notification.icon = '🔥';
    expect(notification.icon).toBe('🔥');
  });

  it('should store userId', () => {
    notification.userId = 'user-uuid-123';
    expect(notification.userId).toBe('user-uuid-123');
  });
});
