import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'app.defaultCity') return 'Manchester';
              if (key === 'app.nodeEnv') return 'development';
              return null;
            }),
          },
        },
        {
          provide: DataSource,
          useValue: { isInitialized: true },
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  describe('getAppConfig', () => {
    it('should return app configuration', () => {
      const config = service.getAppConfig();
      expect(config.appName).toBe('REKI');
      expect(config.tagline).toContain('Manchester');
      expect(config.city).toBe('Manchester');
      expect(config.version).toBeDefined();
      expect(config.minAppVersion).toBeDefined();
    });
  });

  describe('getHealth', () => {
    it('should return healthy status with uptime and db status', () => {
      const health = service.getHealth();
      expect(health.status).toBe('healthy');
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.timestamp).toBeDefined();
      expect(health.database).toBe('connected');
      expect(health.environment).toBe('development');
    });
  });
});
