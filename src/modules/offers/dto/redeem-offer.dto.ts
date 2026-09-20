import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RedeemOfferDto {
  @ApiPropertyOptional({ example: 'REKI-ABC123', description: 'Legacy voucher code returned from /claim' })
  @IsOptional()
  @IsString()
  voucherCode: string;

  @ApiPropertyOptional({ description: 'Signed QR token returned from /claim' })
  @IsOptional()
  @IsString()
  qrCodeData?: string;
}
