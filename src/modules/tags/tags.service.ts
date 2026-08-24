import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { TagCategory } from '../../common/enums';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
  ) {}

  async findAll(): Promise<{ vibes: Tag[]; music: Tag[] }> {
    const all = await this.tagsRepository.find({ where: { isActive: true } });
    return {
      vibes: all.filter((t) => t.category === TagCategory.VIBE),
      music: all.filter((t) => t.category === TagCategory.MUSIC),
    };
  }

  async search(query: string): Promise<Tag[]> {
    return this.tagsRepository
      .createQueryBuilder('tag')
      .where('LOWER(tag.name) LIKE LOWER(:query)', { query: `%${query}%` })
      .andWhere('tag.isActive = true')
      .getMany();
  }
}
