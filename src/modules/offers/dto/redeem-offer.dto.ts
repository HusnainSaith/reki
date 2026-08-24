import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RedeemOfferDto {
  @ApiProperty({ example: 'REKI-ABC123', description: 'Voucher code returned from /claim' })
  @IsNotEmpty()
  @IsString()
  voucherCode: string;
}
