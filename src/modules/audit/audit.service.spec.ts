import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let repo: any;

  beforeEach(() => {
    repo = {
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => ({ id: 'log-1', ...e })),
      find: jest.fn().mockResolvedValue([{ id: 'log-1' }, { id: 'log-2' }]),
    };
    service = new AuditService(repo);
  });

  it('log creates and saves an activity log', async () => {
    const entry = { actorId: 'u-1', actorRole: 'admin', action: 'login', target: 'auth' };
    const result = await service.log(entry);
    expect(repo.create).toHaveBeenCalledWith(entry);
    expect(repo.save).toHaveBeenCalled();
    expect(result.id).toBe('log-1');
  });

  it('findAll returns logs in DESC order', async () => {
    const result = await service.findAll();
    expect(repo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
    expect(result).toHaveLength(2);
  });
});
