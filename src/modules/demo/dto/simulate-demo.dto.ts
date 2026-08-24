import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SimulateDemoDto {
  @ApiProperty({ description: 'Demo scenario name', example: 'saturday-night' })
  @IsString()
  scenario: string;

  @ApiPropertyOptional({ description: 'Hour to simulate (0-23)', example: 22 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  hour?: number;
}

export class SimulateTimeDto {
  @ApiProperty({ description: 'Hour to simulate (0-23)', example: 22 })
  @IsInt()
  @Min(0)
  @Max(23)
  hour: number;
}
