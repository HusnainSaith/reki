import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class GeofenceCheckDto {
  @ApiProperty({ example: 53.4808, description: 'User latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: -2.2426, description: 'User longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class UpdateLocationDto {
  @ApiProperty({ example: 53.4808, description: 'User latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: -2.2426, description: 'User longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiPropertyOptional({ example: 15, description: 'Accuracy in meters' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiPropertyOptional({ description: 'Timestamp of location reading' })
  @IsOptional()
  timestamp?: string;
}

export class UpdateLocationConsentDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  locationEnabled: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  backgroundLocationEnabled?: boolean;
}
