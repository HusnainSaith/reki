import { RefreshToken } from './refresh-token.entity';

describe('RefreshToken Entity', () => {
  let token: RefreshToken;

  beforeEach(() => {
    token = new RefreshToken();
  });

  it('should create a refresh token instance', () => {
    expect(token).toBeDefined();
    expect(token).toBeInstanceOf(RefreshToken);
  });

  it('should store userId', () => {
    token.userId = 'user-uuid-123';
    expect(token.userId).toBe('user-uuid-123');
  });

  it('should store token string', () => {
    token.token = 'jwt-refresh-token-string';
    expect(token.token).toBe('jwt-refresh-token-string');
  });

  it('should have expiry date', () => {
    const future = new Date('2026-05-01');
    token.expiresAt = future;
    expect(token.expiresAt).toEqual(future);
  });

  it('should default isRevoked to false', () => {
    token.isRevoked = false;
    expect(token.isRevoked).toBe(false);
  });

  it('should allow revoking token', () => {
    token.isRevoked = true;
    expect(token.isRevoked).toBe(true);
  });
});
