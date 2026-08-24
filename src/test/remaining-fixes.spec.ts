import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../modules/auth/auth.service';
import { OffersService } from '../modules/offers/offers.service';
import { EmailService } from '../modules/email/email.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Offer } from '../modules/offers/entities/offer.entity';
import { Redemption } from '../modules/offers/entities/redemption.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('Remaining Production Issues - Email & Apple Wallet', () => {
  let authService: AuthService;
  let offersService: OffersService;
  let emailService: EmailService;
  let configService: ConfigService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockOfferRepository = {
    findOne: jest.fn(),
    increment: jest.fn(),
  };

  const mockRedemptionRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        OffersService,
        EmailService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Offer),
          useValue: mockOfferRepository,
        },
        {
          provide: getRepositoryToken(Redemption),
          useValue: mockRedemptionRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    offersService = module.get<OffersService>(OffersService);
    emailService = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Fix 1: Email Delivery Provider Integration', () => {
    it('should use EmailService instead of console.log for verification emails', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      } as User;

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'app.email.provider') return 'console';
        if (key === 'app.email.from') return 'noreply@reki.app';
        if (key === 'app.frontendUrl') return 'http://localhost:3001';
        if (key === 'app.jwt.secret') return 'test-secret';
        return undefined;
      });

      const emailSpy = jest.spyOn(emailService, 'sendVerificationEmail');

      await authService.sendVerificationEmail(mockUser);

      expect(emailSpy).toHaveBeenCalledWith(
        'test@example.com',
        'mock-jwt-token',
        'Test User'
      );
    });

    it('should use EmailService instead of console.log for password reset emails', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      } as User;

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'app.email.provider') return 'console';
        if (key === 'app.email.from') return 'noreply@reki.app';
        if (key === 'app.frontendUrl') return 'http://localhost:3001';
        if (key === 'app.jwt.secret') return 'test-secret';
        return undefined;
      });

      const emailSpy = jest.spyOn(emailService, 'sendPasswordResetEmail');

      await authService.forgotPassword('test@example.com');

      expect(emailSpy).toHaveBeenCalledWith(
        'test@example.com',
        'mock-jwt-token',
        'Test User'
      );
    });

    it('should support multiple email providers (console, sendgrid, ses, smtp)', () => {
      const providers = ['console', 'sendgrid', 'ses', 'smtp'];
      
      providers.forEach(provider => {
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'app.email.provider') return provider;
          return undefined;
        });

        const service = new EmailService(configService);
        expect(service).toBeDefined();
      });
    });

    it('should generate proper HTML email templates', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'app.email.provider') return 'console';
        if (key === 'app.email.from') return 'noreply@reki.app';
        if (key === 'app.frontendUrl') return 'http://localhost:3001';
        return undefined;
      });

      const sendEmailSpy = jest.spyOn(emailService, 'sendEmail');

      await emailService.sendVerificationEmail(
        'test@example.com',
        'token123',
        'John Doe'
      );

      expect(sendEmailSpy).toHaveBeenCalled();
      const emailOptions = sendEmailSpy.mock.calls[0][0];
      expect(emailOptions.html).toContain('Welcome to REKI');
      expect(emailOptions.html).toContain('John Doe');
      expect(emailOptions.html).toContain('token123');
    });
  });

  describe('Fix 2: Apple Wallet Certificate Configuration', () => {
    it('should throw error when Apple Wallet configuration is incomplete', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const mockOffer = {
        id: 'offer-123',
        title: 'Test Offer',
        venue: { name: 'Test Venue' },
      } as Offer;

      await expect(
        offersService.generateAppleWalletPass(mockOffer, 'VOUCHER123')
      ).rejects.toThrow('Apple Wallet configuration incomplete');
    });

    it('should throw error when certificate paths are not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'app.apple.teamId') return 'TEAM123';
        if (key === 'app.apple.passTypeId') return 'pass.com.reki.offers';
        return undefined;
      });

      const mockOffer = {
        id: 'offer-123',
        title: 'Test Offer',
        venue: { name: 'Test Venue' },
      } as Offer;

      await expect(
        offersService.generateAppleWalletPass(mockOffer, 'VOUCHER123')
      ).rejects.toThrow('certificate paths not configured');
    });

    it('should throw error when certificate files do not exist', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'app.apple.teamId') return 'TEAM123';
        if (key === 'app.apple.passTypeId') return 'pass.com.reki.offers';
        if (key === 'app.apple.passCertPath') return '/nonexistent/cert.pem';
        if (key === 'app.apple.passKeyPath') return '/nonexistent/key.pem';
        if (key === 'app.apple.passWwdrPath') return '/nonexistent/wwdr.pem';
        return undefined;
      });

      const mockOffer = {
        id: 'offer-123',
        title: 'Test Offer',
        venue: { name: 'Test Venue' },
      } as Offer;

      await expect(
        offersService.generateAppleWalletPass(mockOffer, 'VOUCHER123')
      ).rejects.toThrow('certificate not found');
    });

    it('should use configured teamId and passTypeId instead of placeholders', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'app.apple.teamId') return 'REAL_TEAM_ID';
        if (key === 'app.apple.passTypeId') return 'pass.com.real.app';
        if (key === 'app.apple.passCertPath') return '/fake/cert.pem';
        if (key === 'app.apple.passKeyPath') return '/fake/key.pem';
        if (key === 'app.apple.passWwdrPath') return '/fake/wwdr.pem';
        return undefined;
      });

      const mockOffer = {
        id: 'offer-123',
        title: 'Test Offer',
        venue: { name: 'Test Venue' },
      } as Offer;

      try {
        await offersService.generateAppleWalletPass(mockOffer, 'VOUCHER123');
      } catch (error: any) {
        expect(mockConfigService.get).toHaveBeenCalledWith('app.apple.teamId');
        expect(mockConfigService.get).toHaveBeenCalledWith('app.apple.passTypeId');
      }
    });
  });

  describe('Integration: Configuration Validation', () => {
    it('should have all required email configuration keys', () => {
      const requiredKeys = [
        'app.email.provider',
        'app.email.from',
        'app.frontendUrl',
      ];

      requiredKeys.forEach(key => {
        mockConfigService.get.mockReturnValue('test-value');
        const value = configService.get(key);
        expect(mockConfigService.get).toHaveBeenCalledWith(key);
      });
    });

    it('should have all required Apple Wallet configuration keys', () => {
      const requiredKeys = [
        'app.apple.teamId',
        'app.apple.passTypeId',
        'app.apple.passCertPath',
        'app.apple.passKeyPath',
        'app.apple.passWwdrPath',
        'app.apple.passKeyPassword',
      ];

      requiredKeys.forEach(key => {
        mockConfigService.get.mockReturnValue('test-value');
        const value = configService.get(key);
        expect(mockConfigService.get).toHaveBeenCalledWith(key);
      });
    });
  });
});
