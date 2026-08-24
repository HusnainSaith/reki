import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

describe('TagsController', () => {
  let controller: TagsController;
  let service: Partial<TagsService>;

  beforeEach(() => {
    service = {
      findAll: jest.fn().mockResolvedValue({ vibes: [{ name: 'Chill' }], music: [{ name: 'House' }] }),
      search: jest.fn().mockResolvedValue([{ name: 'Chill' }]),
    };
    controller = new TagsController(service as TagsService);
  });

  it('findAll', async () => {
    const result = await controller.findAll();
    expect(result).toHaveProperty('vibes');
    expect(result).toHaveProperty('music');
  });

  it('findVibes', async () => {
    const result = await controller.findVibes();
    expect(result).toHaveLength(1);
  });

  it('findMusic', async () => {
    const result = await controller.findMusic();
    expect(result).toHaveLength(1);
  });

  it('search', async () => {
    const result = await controller.search('chill');
    expect(service.search).toHaveBeenCalledWith('chill');
  });
});
