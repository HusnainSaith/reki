import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BusynessLevel } from '../../../common/enums';

export class UpdateWorkerStatusDto {
  @ApiProperty({ enum: BusynessLevel, example: BusynessLevel.MODERATE })
  @IsEnum(BusynessLevel)
  busyness: BusynessLevel;
}
