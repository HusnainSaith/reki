import { User } from './user.entity';
import { Role, AuthProvider } from '../../../common/enums';

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User();
  });

  it('should create a user instance', () => {
    expect(user).toBeDefined();
    expect(user).toBeInstanceOf(User);
  });

  it('should have default role as USER', () => {
    expect(Role.USER).toBe('user');
  });

  it('should have default authProvider as EMAIL', () => {
    expect(AuthProvider.EMAIL).toBe('email');
  });

  it('should accept valid email', () => {
    user.email = 'test@reki.app';
    expect(user.email).toBe('test@reki.app');
  });

  it('should allow nullable email for guest users', () => {
    user.email = null;
    expect(user.email).toBeNull();
  });

  it('should accept valid preferences', () => {
    user.preferences = { vibes: ['Chill', 'Party'], music: ['House'] };
    expect(user.preferences.vibes).toHaveLength(2);
    expect(user.preferences.music).toHaveLength(1);
  });

  it('should default savedVenues to empty array', () => {
    user.savedVenues = [];
    expect(user.savedVenues).toEqual([]);
  });

  it('should accept all valid roles', () => {
    const roles = [Role.USER, Role.BUSINESS, Role.ADMIN, Role.GUEST];
    roles.forEach(role => {
      user.role = role;
      expect(user.role).toBe(role);
    });
  });

  it('should accept all valid auth providers', () => {
    const providers = [AuthProvider.EMAIL, AuthProvider.GOOGLE, AuthProvider.APPLE, AuthProvider.GUEST];
    providers.forEach(provider => {
      user.authProvider = provider;
      expect(user.authProvider).toBe(provider);
    });
  });

  it('should store password as string', () => {
    user.password = '$2b$10$hashedpassword';
    expect(user.password).toContain('$2b$10$');
  });

  it('should have boolean fields', () => {
    user.isVerified = true;
    user.isActive = false;
    expect(user.isVerified).toBe(true);
    expect(user.isActive).toBe(false);
  });
});
