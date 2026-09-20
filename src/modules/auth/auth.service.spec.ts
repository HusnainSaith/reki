import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => {
      return {
        verifyIdToken: jest.fn()
      };
    })
  };
});

jest.mock('jwks-rsa', () => {
  return jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn().mockResolvedValue({
      getPublicKey: () => 'mock-public-key'
    })
  }));
});

jest.mock('jsonwebtoken', () => {
  return {
    decode: jest.fn(),
    verify: jest.fn(),
  };
});

import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Role, AuthProvider } from '../../common/enums';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: Record<string, jest.Mock>;
  let refreshTokensRepo: Record<string, jest.Mock>;
  let notificationsRepo: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;
  let emailService: Record<string, jest.Mock>;
  let notificationsService: Record<string, jest.Mock>;

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'test@reki.app',
    name: 'Test User',
    password: '$2b$10$hashedpassword',
    role: Role.USER,
    authProvider: AuthProvider.EMAIL,
  };

  beforeEach(async () => {
    usersRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    refreshTokensRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    notificationsRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
      decode: jest.fn(),
      verify: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };
    emailService = {
      sendPasswordResetEmail: jest.fn(),
      sendVerificationEmail: jest.fn(),
    };
    notificationsService = {
      createNotification: jest.fn(),
      createWelcomeNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokensRepo },
        { provide: getRepositoryToken(Notification), useValue: notificationsRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: EmailService, useValue: emailService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const hashed = await bcrypt.hash('password123', 10);
      const user = { ...mockUser, password: hashed };
      usersRepo.findOne.mockResolvedValue(user);

      const result = await service.validateUser('test@reki.app', 'password123');
      expect(result).toEqual(user);
    });

    it('should return null when user not found', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      const result = await service.validateUser('nope@reki.app', 'password');
      expect(result).toBeNull();
    });

    it('should return null when password is wrong', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      usersRepo.findOne.mockResolvedValue({ ...mockUser, password: hashed });
      const result = await service.validateUser('test@reki.app', 'wrong');
      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      usersRepo.create.mockReturnValue(mockUser);
      usersRepo.save.mockResolvedValue(mockUser);
      refreshTokensRepo.create.mockReturnValue({});
      refreshTokensRepo.save.mockResolvedValue({});
      notificationsRepo.create.mockReturnValue({});
      notificationsRepo.save.mockResolvedValue({});

      const result = await service.register({
        email: 'test@reki.app',
        password: 'Test1234',
        name: 'Test User',
      });

      expect(result.user.email).toBe('test@reki.app');
      expect(result.tokens).toBeDefined();
      expect(usersRepo.save).toHaveBeenCalled();
      expect(notificationsService.createWelcomeNotification).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      usersRepo.findOne.mockResolvedValue(mockUser);
      await expect(
        service.register({ email: 'test@reki.app', password: 'Test1234', name: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return user info and tokens', async () => {
      refreshTokensRepo.create.mockReturnValue({});
      refreshTokensRepo.save.mockResolvedValue({});

      const result = await service.login(mockUser as User);
      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('test@reki.app');
      expect(result.tokens.accessToken).toBe('mock-token');
      expect(result.tokens.refreshToken).toBe('mock-token');
    });
  });

  describe('guestLogin', () => {
    it('should create a guest user and return tokens', async () => {
      const guest = { id: 'guest-1', name: 'Guest', role: Role.GUEST };
      usersRepo.create.mockReturnValue(guest);
      usersRepo.save.mockResolvedValue(guest);
      refreshTokensRepo.create.mockReturnValue({});
      refreshTokensRepo.save.mockResolvedValue({});

      const result = await service.guestLogin();
      expect(result.user.role).toBe('guest');
      expect(result.user.name).toBe('Guest');
      expect(result.tokens).toBeDefined();
    });
  });

  describe('googleAuth', () => {
    let mockVerifyIdToken: jest.Mock;

    beforeEach(() => {
      // Get the mocked verifyIdToken instance
      mockVerifyIdToken = (service as any).googleClient.verifyIdToken;
    });

    it('should create new user for new Google login', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'google@test.com', name: 'Google User' })
      });
      usersRepo.findOne.mockResolvedValue(null);
      const newUser = { id: 'g-1', email: 'google@test.com', name: 'Google User', role: Role.USER };
      usersRepo.create.mockReturnValue(newUser);
      usersRepo.save.mockResolvedValue(newUser);
      refreshTokensRepo.create.mockReturnValue({});
      refreshTokensRepo.save.mockResolvedValue({});
      notificationsRepo.create.mockReturnValue({});
      notificationsRepo.save.mockResolvedValue({});

      const result = await service.googleAuth('valid-id-token');
      expect(result.user.email).toBe('google@test.com');
      expect(notificationsService.createWelcomeNotification).toHaveBeenCalled();
    });

    it('should login existing Google user without creating welcome notif', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'existing@test.com', name: 'Existing' })
      });
      const existing = { id: 'e-1', email: 'existing@test.com', name: 'Existing', role: Role.USER };
      usersRepo.findOne.mockResolvedValue(existing);
      refreshTokensRepo.create.mockReturnValue({});
      refreshTokensRepo.save.mockResolvedValue({});

      const result = await service.googleAuth('valid-token');
      expect(result.user.email).toBe('existing@test.com');
      expect(notificationsRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));
      await expect(service.googleAuth('bad-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('appleAuth', () => {
    it('should create new user for Apple login', async () => {
      (jwt.decode as jest.Mock).mockReturnValue({ header: { kid: 'mock-kid' } });
      (jwt.verify as jest.Mock).mockReturnValue({ sub: 'apple-sub-123', email: 'apple@test.com', name: 'Apple User' });

      usersRepo.findOne.mockResolvedValue(null);
      const newUser = { id: 'a-1', email: 'apple@test.com', name: 'Apple User', role: Role.USER };
      usersRepo.create.mockReturnValue(newUser);
      usersRepo.save.mockResolvedValue(newUser);
      refreshTokensRepo.create.mockReturnValue({});
      refreshTokensRepo.save.mockResolvedValue({});
      notificationsRepo.create.mockReturnValue({});
      notificationsRepo.save.mockResolvedValue({});

      const result = await service.appleAuth('valid-token', 'auth-code');
      expect(result.user.email).toBe('apple@test.com');
    });

    it('should throw BadRequestException for invalid Apple token', async () => {
      (jwt.decode as jest.Mock).mockReturnValue(null);
      await expect(service.appleAuth('bad', 'bad')).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword', () => {
    it('should return success message for existing user', async () => {
      usersRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.forgotPassword('test@reki.app');
      expect(result.message).toContain('reset link');
    });

    it('should return same message for non-existing email (prevent enumeration)', async () => {
      usersRepo.findOne.mockResolvedValue(null);
      const result = await service.forgotPassword('nope@reki.app');
      expect(result.message).toContain('reset link');
      expect(result).not.toHaveProperty('resetToken');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', type: 'password-reset' });
      usersRepo.findOne.mockResolvedValue({ ...mockUser });
      usersRepo.save.mockResolvedValue({});

      const result = await service.resetPassword('valid-token', 'NewPass123');
      expect(result.message).toBe('Password reset successful');
      expect(usersRepo.save).toHaveBeenCalled();
    });

    it('should throw for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });
      await expect(service.resetPassword('bad-token', 'pass')).rejects.toThrow(BadRequestException);
    });

    it('should throw for wrong token type', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', type: 'wrong-type' });
      await expect(service.resetPassword('token', 'pass')).rejects.toThrow(BadRequestException);
    });

    it('should throw if user not found', async () => {
      jwtService.verify.mockReturnValue({ sub: 'gone', type: 'password-reset' });
      usersRepo.findOne.mockResolvedValue(null);
      await expect(service.resetPassword('token', 'pass')).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email and set isVerified to true', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', type: 'email-verification' });
      usersRepo.findOne.mockResolvedValue({ id: 'user-1', isVerified: false });

      const result = await service.verifyEmail('valid-token');
      expect(result.message).toBe('Email verified successfully');
      expect(usersRepo.save).toHaveBeenCalled();
    });

    it('should return already verified if isVerified is true', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', type: 'email-verification' });
      usersRepo.findOne.mockResolvedValue({ id: 'user-1', isVerified: true });

      const result = await service.verifyEmail('valid-token');
      expect(result.message).toBe('Email already verified');
      expect(usersRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if token type is invalid', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', type: 'password-reset' });
      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens for valid refresh token', async () => {
      const stored = { token: 'valid-refresh', isRevoked: false, expiresAt: new Date(Date.now() + 100000), userId: 'user-1' };
      refreshTokensRepo.findOne.mockResolvedValue(stored);
      refreshTokensRepo.save.mockResolvedValue({});
      refreshTokensRepo.create.mockReturnValue({});
      usersRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.refreshToken('valid-refresh');
      expect(result.accessToken).toBe('mock-token');
      expect(stored.isRevoked).toBe(true);
    });

    it('should throw for expired refresh token', async () => {
      const stored = { token: 'old', isRevoked: false, expiresAt: new Date(Date.now() - 100000), userId: 'user-1' };
      refreshTokensRepo.findOne.mockResolvedValue(stored);
      await expect(service.refreshToken('old')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for revoked refresh token', async () => {
      refreshTokensRepo.findOne.mockResolvedValue(null);
      await expect(service.refreshToken('revoked')).rejects.toThrow(UnauthorizedException);
    });
  });
});
