import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsDateString, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SyncActionType } from '../entities/sync-action.entity';

export class SyncActionDto {
  @ApiProperty({ description: 'Client-generated UUID for this action' })
  @IsString()
  id: string;

  @ApiProperty({ enum: SyncActionType })
  @IsEnum(SyncActionType)
  type: SyncActionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  venueId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notificationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  offerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiProperty({ description: 'Timestamp when action was performed offline' })
  @IsDateString()
  offlineTimestamp: string;
}

export class SubmitSyncQueueDto {
  @ApiProperty({ description: 'Device ID submitting the queue' })
  @IsString()
  deviceId: string;

  @ApiProperty({ type: [SyncActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncActionDto)
  actions: SyncActionDto[];
}

export class UserStateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  preferences?: { vibes: string[]; music: string[] };

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  savedVenues?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  lastFilters?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  notificationPreferences?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  lastSyncAt?: string;
}
