import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'staff@venue.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Venue Staff' })
  @IsString()
  name: string;

  @ApiProperty({ minLength: 8 })
  @MinLength(8)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}
