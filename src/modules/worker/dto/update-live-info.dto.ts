import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLiveInfoDto {
  @ApiProperty({ enum: ['music', 'offer', 'event', 'notice'], example: 'music' })
  @IsIn(['music', 'offer', 'event', 'notice'])
  type: string;

  @ApiProperty({ example: 'Live music tonight' })
  @IsString()
  @MaxLength(140)
  title: string;

  @ApiPropertyOptional({ example: 'Acoustic set from 9 PM' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
