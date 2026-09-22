import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CitiesService } from './cities.service';

@ApiTags('Cities')
@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List supported active cities' })
  async findActive() {
    return this.citiesService.findActive();
  }

  @Get('detect')
  @ApiOperation({ summary: 'Detect the nearest supported city from GPS coordinates' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  async detect(@Query('lat') latitude: string, @Query('lng') longitude: string) {
    return this.findNearest(latitude, longitude);
  }

  @Get('nearest')
  @ApiOperation({ summary: 'Resolve GPS coordinates to the nearest supported city' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  async findNearest(@Query('lat') latitudeValue: string, @Query('lng') longitudeValue: string) {
    const latitude = Number(latitudeValue);
    const longitude = Number(longitudeValue);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new BadRequestException('Valid latitude and longitude are required');
    }

    return this.citiesService.findNearest(latitude, longitude);
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Get a supported city by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async findById(@Param('id') id: string) {
    const city = await this.citiesService.findById(id);
    if (!city) throw new NotFoundException('City not found');
    return city;
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a supported city by slug' })
  @ApiParam({ name: 'slug' })
  async findBySlug(@Param('slug') slug: string) {
    const city = await this.citiesService.findBySlug(slug);
    if (!city) throw new NotFoundException('City not found');
    return city;
  }
}
