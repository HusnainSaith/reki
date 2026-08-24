import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  idToken: string;
}

export class AppleAuthDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  identityToken: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  authorizationCode: string;
}
