import { IsNotEmpty, IsString, IsNumber, IsOptional, IsBoolean, Length, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCityDto {
  @ApiProperty({ example: 'leeds' })
  @IsNotEmpty()
  @IsString()
  @Length(1, 80)
  slug: string;

  @ApiProperty({ example: 'Leeds' })
  @IsNotEmpty()
  @IsString()
  @Length(1, 120)
  name: string;

  @ApiProperty({ example: 'GB' })
  @IsNotEmpty()
  @IsString()
  @Length(2, 2)
  countryCode: string;

  @ApiProperty({ example: 'Europe/London' })
  @IsNotEmpty()
  @IsString()
  timezone: string;

  @ApiPropertyOptional({ example: 'en-GB' })
  @IsOptional()
  @IsString()
  defaultLocale?: string;

  @ApiProperty({ example: 53.8008 })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: -1.5491 })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ example: 50, description: 'Detection radius in km' })
  @Transform(({ value }) => value !== undefined ? parseFloat(value) : value)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  detectionRadiusKm?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
