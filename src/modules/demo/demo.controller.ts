import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { DemoService } from './demo.service';
import { SimulateDemoDto, SimulateTimeDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('Demo')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT missing or invalid' })
@ApiForbiddenResponse({ description: 'Admin role required' })
@Controller('admin/demo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Post('simulate')
  @ApiOperation({ summary: 'Run a demo scenario (admin only)' })
  @ApiBody({ type: SimulateDemoDto })
  @ApiCreatedResponse({ description: 'Scenario executed — affected venues + changes returned' })
  async simulate(@Body() dto: SimulateDemoDto) {
    return this.demoService.runScenario(dto.scenario, dto.hour);
  }

  @Post('simulate-time')
  @ApiOperation({ summary: 'Simulate a specific hour across all venues (admin only)' })
  @ApiBody({ type: SimulateTimeDto })
  @ApiCreatedResponse({ description: 'Hour simulation applied to all active venues' })
  async simulateTime(@Body() dto: SimulateTimeDto) {
    return this.demoService.simulateTime(dto.hour);
  }

  @Get('scenarios')
  @ApiOperation({ summary: 'List available demo scenarios' })
  @ApiOkResponse({ description: 'Catalog of predefined demo scenarios' })
  async getScenarios() {
    return this.demoService.getScenarios();
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset all demo data to initial seed state (admin only)' })
  @ApiCreatedResponse({ description: 'Demo data reset to seed baseline' })
  async resetDemo() {
    return this.demoService.resetDemo();
  }
}
