import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCityDto {
  @ApiProperty({ example: 'manchester', description: 'Supported city slug' })
  @IsString()
  @MaxLength(80)
  city: string;
}
