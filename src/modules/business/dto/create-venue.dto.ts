import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { VenueCategory } from '../../../common/enums';

export class CreateVenueDto {
  @ApiProperty({ example: 'The Blue Moon Bar' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '123 Oxford Road, Manchester' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: 'Manchester' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ example: 'City Centre' })
  @IsNotEmpty()
  @IsString()
  area: string;

  @ApiProperty({ example: 'bar', enum: VenueCategory })
  @IsNotEmpty()
  @IsString()
  category: VenueCategory;

  @ApiProperty({ example: 53.4808 })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNotEmpty()
  @IsNumber()
  lat: number;

  @ApiProperty({ example: -2.2426 })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNotEmpty()
  @IsNumber()
  lng: number;

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 4 })
  @Transform(({ value }) => value !== undefined && value !== '' ? parseInt(value, 10) : value)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  priceLevel?: number;

  @ApiProperty({ example: '18:00' })
  @IsNotEmpty()
  @IsString()
  openingHours: string;

  @ApiProperty({ example: '02:00' })
  @IsNotEmpty()
  @IsString()
  closingTime: string;

  @ApiPropertyOptional({ example: ['Chill', 'Party'] })
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try { return JSON.parse(value); } catch { return [value]; }
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
