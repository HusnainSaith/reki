import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
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
}
