import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiOkResponse } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CacheTTL } from '../../common/interceptors/cache-headers.interceptor';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @CacheTTL(86400)
  @ApiOperation({ summary: 'Get all vibe + music tags' })
  @ApiOkResponse({ description: 'Object with vibes[] and music[] tag arrays' })
  async findAll() {
    return this.tagsService.findAll();
  }

  @Get('vibes')
  @CacheTTL(86400)
  @ApiOperation({ summary: 'Get all vibe tags only' })
  @ApiOkResponse({ description: 'Array of vibe tags' })
  async findVibes() {
    const { vibes } = await this.tagsService.findAll();
    return vibes;
  }

  @Get('music')
  @CacheTTL(86400)
  @ApiOperation({ summary: 'Get all music tags only' })
  @ApiOkResponse({ description: 'Array of music tags' })
  async findMusic() {
    const { music } = await this.tagsService.findAll();
    return music;
  }

  @Get('search')
  @CacheTTL(3600)
  @ApiOperation({ summary: 'Search tags by name' })
  @ApiQuery({ name: 'q', required: true })
  @ApiOkResponse({ description: 'Matching tags across vibes + music' })
  async search(@Query('q') query: string) {
    return this.tagsService.search(query);
  }
}
