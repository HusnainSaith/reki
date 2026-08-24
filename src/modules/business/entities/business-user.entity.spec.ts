import { BusinessUser } from './business-user.entity';
import { BusinessRole } from '../../../common/enums';

describe('BusinessUser Entity', () => {
  let user: BusinessUser;

  beforeEach(() => {
    user = new BusinessUser();
  });

  it('should create a business user instance', () => {
    expect(user).toBeDefined();
    expect(user).toBeInstanceOf(BusinessUser);
  });

  it('should accept all valid business roles', () => {
    const roles = [BusinessRole.OWNER, BusinessRole.MANAGER, BusinessRole.STAFF];
    roles.forEach(role => {
      user.role = role;
      expect(user.role).toBe(role);
    });
  });

  it('should store venues list', () => {
    user.venues = [{ id: 'venue-uuid-123' } as any];
    expect(user.venues[0].id).toBe('venue-uuid-123');
  });

  it('should have approval status', () => {
    user.isApproved = false;
    expect(user.isApproved).toBe(false);
    user.isApproved = true;
    expect(user.isApproved).toBe(true);
  });

  it('should have active status', () => {
    user.isActive = true;
    expect(user.isActive).toBe(true);
  });

  it('should store email uniquely', () => {
    user.email = 'manager@alberts.com';
    expect(user.email).toBe('manager@alberts.com');
  });

  it('should store hashed password', () => {
    user.password = '$2b$10$hashedvalue';
    expect(user.password).toContain('$2b$10$');
  });

  it('should allow optional phone', () => {
    user.phone = '+4412345678';
    expect(user.phone).toBe('+4412345678');
    user.phone = null;
    expect(user.phone).toBeNull();
  });
});
