import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OfferType } from '../../../common/enums';

export class CreateOfferDto {
  @ApiProperty({ example: 'v1' })
  @IsNotEmpty()
  @IsString()
  venueId: string;

  @ApiProperty({ example: 'Happy Hour 2-for-1' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ example: 'Buy one cocktail get one free during happy hour' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2-for-1', enum: OfferType })
  @IsEnum(OfferType)
  type: OfferType;

  @ApiProperty({ example: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] })
  @IsArray()
  @IsString({ each: true })
  validDays: string[];

  @ApiProperty({ example: '17:00' })
  @IsNotEmpty()
  @IsString()
  validTimeStart: string;

  @ApiProperty({ example: '19:00' })
  @IsNotEmpty()
  @IsString()
  validTimeEnd: string;

  @ApiPropertyOptional({ example: 100, description: '0 = unlimited' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxRedemptions?: number;

  @ApiPropertyOptional({ example: 9.0 })
  @IsOptional()
  savingValue?: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether this offer is available right now (manual toggle)' })
  @IsOptional()
  @IsBoolean()
  isAvailableNow?: boolean;
}

export class UpdateOfferDto {
  @ApiPropertyOptional({ example: 'Updated Happy Hour' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: OfferType })
  @IsOptional()
  @IsEnum(OfferType)
  type?: OfferType;

  @ApiPropertyOptional({ example: ['Mon', 'Tue'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  validDays?: string[];

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  validTimeStart?: string;

  @ApiPropertyOptional({ example: '20:00' })
  @IsOptional()
  @IsString()
  validTimeEnd?: string;

  @ApiPropertyOptional({ description: '0 = unlimited' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxRedemptions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  savingValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether this offer is available right now (manual toggle)' })
  @IsOptional()
  @IsBoolean()
  isAvailableNow?: boolean;
}

export class ToggleOfferDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}
