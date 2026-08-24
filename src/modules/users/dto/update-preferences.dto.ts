import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiProperty({ example: ['Chill', 'Party', 'Romantic'], description: 'Selected vibe tags' })
  @IsArray()
  @IsString({ each: true })
  vibes: string[];

  @ApiProperty({ example: ['House', 'R&B'], description: 'Selected music genre tags' })
  @IsArray()
  @IsString({ each: true })
  music: string[];
}
