import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';

describe('DemoController', () => {
  let controller: DemoController;
  let service: Partial<DemoService>;

  beforeEach(() => {
    service = {
      runScenario: jest.fn().mockResolvedValue({ success: true }),
      simulateTime: jest.fn().mockResolvedValue({ success: true, updatedVenues: 15 }),
      getScenarios: jest.fn().mockReturnValue({ scenarios: [] }),
      resetDemo: jest.fn().mockResolvedValue({ success: true }),
    };
    controller = new DemoController(service as DemoService);
  });

  it('simulate', async () => {
    await controller.simulate({ scenario: 'saturday-night', hour: 22 } as any);
    expect(service.runScenario).toHaveBeenCalledWith('saturday-night', 22);
  });

  it('simulateTime', async () => {
    await controller.simulateTime({ hour: 20 } as any);
    expect(service.simulateTime).toHaveBeenCalledWith(20);
  });

  it('getScenarios', async () => {
    const result = await controller.getScenarios();
    expect(service.getScenarios).toHaveBeenCalled();
  });

  it('resetDemo', async () => {
    const result = await controller.resetDemo();
    expect(service.resetDemo).toHaveBeenCalled();
  });
});
