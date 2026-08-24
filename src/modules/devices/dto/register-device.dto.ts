import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DevicePlatform } from '../entities/device.entity';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'firebase-cloud-messaging-token' })
  @IsString()
  fcmToken: string;

  @ApiProperty({ enum: DevicePlatform, example: DevicePlatform.IOS })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @ApiProperty({ example: 'unique-device-id-123' })
  @IsString()
  deviceId: string;

  @ApiPropertyOptional({ example: '1.0.4' })
  @IsOptional()
  @IsString()
  appVersion?: string;
}
