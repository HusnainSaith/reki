import { IsEnum, IsArray, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusynessLevel } from '../../../common/enums';

export class UpdateVenueStatusDto {
  @ApiProperty({ example: 'moderate', enum: BusynessLevel })
  @IsEnum(BusynessLevel)
  busyness: BusynessLevel;

  @ApiPropertyOptional({ example: ['chill', 'live-music'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vibes?: string[];
}
