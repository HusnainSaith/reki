import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignVenueDto {
  @ApiProperty({ format: 'uuid', description: 'Business user receiving access to the venue' })
  @IsUUID()
  businessUserId: string;
}
