import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TagsService } from './tags.service';
import { Tag } from './entities/tag.entity';
import { TagCategory } from '../../common/enums';

describe('TagsService', () => {
  let service: TagsService;
  let repo: Record<string, jest.Mock>;

  const mockTags: Partial<Tag>[] = [
    { id: 't-1', name: 'Chill', category: TagCategory.VIBE, isActive: true },
    { id: 't-2', name: 'Party', category: TagCategory.VIBE, isActive: true },
    { id: 't-3', name: 'House', category: TagCategory.MUSIC, isActive: true },
    { id: 't-4', name: 'Techno', category: TagCategory.MUSIC, isActive: true },
  ];

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: getRepositoryToken(Tag), useValue: repo },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
  });

  describe('findAll', () => {
    it('should return tags grouped by vibes and music', async () => {
      repo.find.mockResolvedValue(mockTags);
      const result = await service.findAll();
      expect(result.vibes).toHaveLength(2);
      expect(result.music).toHaveLength(2);
      expect(result.vibes[0].name).toBe('Chill');
      expect(result.music[0].name).toBe('House');
    });

    it('should return empty groups if no tags', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result.vibes).toHaveLength(0);
      expect(result.music).toHaveLength(0);
    });
  });

  describe('search', () => {
    it('should search tags by name (case-insensitive)', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockTags[0]]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search('chill');
      expect(result).toHaveLength(1);
      expect(qb.where).toHaveBeenCalledWith(
        'LOWER(tag.name) LIKE LOWER(:query)',
        { query: '%chill%' },
      );
    });
  });
});
