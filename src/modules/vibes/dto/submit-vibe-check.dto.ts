import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class SubmitVibeCheckDto {
  @ApiProperty({ minimum: 1, maximum: 5, description: 'User rating of the current vibe (1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;
}
