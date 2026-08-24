import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('config/app')
  @ApiOperation({ summary: 'Get app configuration (city, version, tagline)' })
  @ApiOkResponse({ description: 'App config returned' })
  getAppConfig() {
    return this.appService.getAppConfig();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiOkResponse({ description: 'Service healthy (uptime + DB status)' })
  getHealth() {
    return this.appService.getHealth();
  }
}
