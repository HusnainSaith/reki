import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TestPushDto {
  @ApiProperty({ example: '8c341180-2c9e-4b48-adee-1f8ca7be192e', description: 'Target user UUID' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ example: '🔔 REKI Test Notification' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'This is a test push from REKI admin panel' })
  @IsOptional()
  @IsString()
  body?: string;
}
