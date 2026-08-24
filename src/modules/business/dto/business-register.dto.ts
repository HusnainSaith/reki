import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BusinessRegisterDto {
  @ApiProperty({ example: 'manager@venue.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePass123', minLength: 8 })
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John Smith' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '+4412345678' })
  @IsOptional()
  @IsString()
  phone?: string;
}
