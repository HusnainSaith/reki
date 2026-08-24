import { IsOptional, IsString, MaxLength, IsNumber, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Alex Johnson', description: 'Display name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '+447911123456', description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 53.4808, description: 'Current latitude' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currentLat?: number;

  @ApiPropertyOptional({ example: -2.2426, description: 'Current longitude' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currentLng?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether location is enabled' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  locationEnabled?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Whether background location is enabled' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  backgroundLocationEnabled?: boolean;
}
