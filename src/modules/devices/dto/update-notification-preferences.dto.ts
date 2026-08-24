import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ example: true, description: 'Venue busyness alerts' })
  @IsOptional()
  @IsBoolean()
  vibeAlerts?: boolean;

  @ApiPropertyOptional({ example: true, description: 'New live music/events' })
  @IsOptional()
  @IsBoolean()
  livePerformance?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Friend check-ins' })
  @IsOptional()
  @IsBoolean()
  socialCheckins?: boolean;

  @ApiPropertyOptional({ example: true, description: 'New offers at saved venues' })
  @IsOptional()
  @IsBoolean()
  offerAlerts?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Weekly summary' })
  @IsOptional()
  @IsBoolean()
  weeklyRecap?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Nearby venue with offers' })
  @IsOptional()
  @IsBoolean()
  proximityAlerts?: boolean;

  @ApiPropertyOptional({ example: '02:00', description: 'Quiet hours start (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'quietHoursStart must be in HH:mm format' })
  quietHoursStart?: string;

  @ApiPropertyOptional({ example: '09:00', description: 'Quiet hours end (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'quietHoursEnd must be in HH:mm format' })
  quietHoursEnd?: string;
}
