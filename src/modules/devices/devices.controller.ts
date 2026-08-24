import {
  Controller,
  Post,
  Delete,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto, UpdateNotificationPreferencesDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('Devices')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'JWT missing or invalid' })
@Controller()
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('devices/register')
  @ApiOperation({ summary: 'Register device for push notifications' })
  @ApiBody({ type: RegisterDeviceDto })
  @ApiCreatedResponse({ description: 'Device registered — returns deviceId' })
  async registerDevice(@Request() req, @Body() dto: RegisterDeviceDto) {
    const device = await this.devicesService.registerDevice(req.user.id, dto);
    return { success: true, deviceId: device.id };
  }

  @Delete('devices/:deviceId')
  @ApiOperation({ summary: 'Deactivate device (on logout)' })
  @ApiParam({ name: 'deviceId', description: 'Device UUID to deactivate', format: 'uuid' })
  @ApiOkResponse({ description: 'Device deactivated (FCM token cleared)' })
  async deactivateDevice(@Request() req, @Param('deviceId') deviceId: string) {
    await this.devicesService.deactivateDevice(deviceId, req.user.id);
    return { success: true };
  }

  @Get('users/notification-preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiOkResponse({ description: 'Current notification preference flags + quiet hours' })
  async getPreferences(@Request() req) {
    return this.devicesService.getPreferences(req.user.id);
  }

  @Put('users/notification-preferences')
  @ApiOperation({ summary: 'Update notification preferences (6 types + quiet hours)' })
  @ApiBody({ type: UpdateNotificationPreferencesDto })
  @ApiOkResponse({ description: 'Preferences updated' })
  async updatePreferences(
    @Request() req,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.devicesService.updatePreferences(req.user.id, dto);
  }
}
