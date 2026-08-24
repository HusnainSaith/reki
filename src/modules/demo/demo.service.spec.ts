import { DemoService } from './demo.service';
import { NotFoundException } from '@nestjs/common';

describe('DemoService', () => {
  let service: DemoService;
  let venuesRepo: any;
  let busynessRepo: any;
  let vibesRepo: any;
  let notificationsRepo: any;
  let usersRepo: any;
  let offersRepo: any;
  let redemptionsRepo: any;
  let analyticsRepo: any;
  let activityLogsRepo: any;

  const mockVenues = [
    { id: 'v-0', name: "Albert's Schloss" },
    { id: 'v-1', name: 'Warehouse Project' },
    { id: 'v-2', name: '20 Stories' },
    { id: 'v-3', name: 'The Alchemist' },
    { id: 'v-4', name: 'Albert Hall' },
  ];

  beforeEach(() => {
    venuesRepo = { find: jest.fn().mockResolvedValue(mockVenues) };
    busynessRepo = {
      findOne: jest.fn().mockResolvedValue({ venueId: 'v-0', level: 'quiet', percentage: 10 }),
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockResolvedValue({}),
    };
    vibesRepo = {
      findOne: jest.fn().mockResolvedValue({ venueId: 'v-0', tags: [], musicGenre: [] }),
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockResolvedValue({}),
    };
    notificationsRepo = {
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(5),
      clear: jest.fn().mockResolvedValue(undefined),
    };
    usersRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };
    offersRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      }),
    };
    redemptionsRepo = { count: jest.fn().mockResolvedValue(3), clear: jest.fn().mockResolvedValue(undefined) };
    analyticsRepo = { clear: jest.fn().mockResolvedValue(undefined) };
    activityLogsRepo = { count: jest.fn().mockResolvedValue(2), clear: jest.fn().mockResolvedValue(undefined) };

    service = new DemoService(
      venuesRepo,
      busynessRepo,
      vibesRepo,
      notificationsRepo,
      usersRepo,
      offersRepo,
      redemptionsRepo,
      analyticsRepo,
      activityLogsRepo,
    );
  });

  describe('simulateTime', () => {
    it('updates venues for given hour', async () => {
      const result = await service.simulateTime(22);
      expect(result.success).toBe(true);
      expect(result.hour).toBe(22);
      expect(busynessRepo.save).toHaveBeenCalled();
      expect(vibesRepo.save).toHaveBeenCalled();
    });

    it('triggers vibe alerts for high percentage venues', async () => {
      // Hour 23 should have 95% for Albert's Schloss
      usersRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'u-1' }]),
      });
      await service.simulateTime(23);
      expect(notificationsRepo.save).toHaveBeenCalled();
    });
  });

  describe('runScenario', () => {
    it('runs saturday-night scenario', async () => {
      const result = await service.runScenario('saturday-night');
      expect(result.success).toBe(true);
    });

    it('runs quiet-afternoon', async () => {
      const result = await service.runScenario('quiet-afternoon');
      expect(result.success).toBe(true);
    });

    it('runs quiet-evening', async () => {
      const result = await service.runScenario('quiet-evening');
      expect(result.success).toBe(true);
    });

    it('runs warming-up', async () => {
      const result = await service.runScenario('warming-up');
      expect(result.success).toBe(true);
    });

    it('runs peak-time', async () => {
      const result = await service.runScenario('peak-time');
      expect(result.success).toBe(true);
    });

    it('runs winding-down', async () => {
      const result = await service.runScenario('winding-down');
      expect(result.success).toBe(true);
    });

    it('runs peak-transition', async () => {
      const result = await service.runScenario('peak-transition');
      expect(result.success).toBe(true);
      expect((result as any).transitions).toHaveLength(4);
    });

    it('throws on unknown scenario', async () => {
      await expect(service.runScenario('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getScenarios', () => {
    it('returns list of scenarios', () => {
      const result = service.getScenarios();
      expect(result.scenarios.length).toBeGreaterThan(0);
    });
  });

  describe('resetDemo', () => {
    it('resets all demo data', async () => {
      const result = await service.resetDemo();
      expect(result.success).toBe(true);
      expect(redemptionsRepo.clear).toHaveBeenCalled();
      expect(notificationsRepo.clear).toHaveBeenCalled();
      expect(activityLogsRepo.clear).toHaveBeenCalled();
      expect(analyticsRepo.clear).toHaveBeenCalled();
    });
  });
});
