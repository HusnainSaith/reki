import { BadRequestException, Controller, Delete, Get, Param, Post, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { BusinessGuard } from '../../common/guards';
import { CurrentUser } from '../auth/decorators';
import { WorkerService } from './worker.service';
import { OffersService } from '../offers/offers.service';
import { RedeemOfferDto } from '../offers/dto/redeem-offer.dto';
import { AssignVenueDto } from './dto/assign-venue.dto';
import { UpdateWorkerStatusDto } from './dto/update-worker-status.dto';
import { AuditService } from '../audit/audit.service';

@ApiTags('Worker')
@ApiBearerAuth()
@Controller('worker')
@UseGuards(JwtAuthGuard, BusinessGuard)
export class WorkerController {
  constructor(
    private readonly workerService: WorkerService,
    private readonly offersService: OffersService,
    private readonly auditService: AuditService,
  ) {}

  @Get('venues')
  @ApiOperation({ summary: 'List venues accessible to the authenticated worker' })
  async getVenues(@CurrentUser() user: { id: string }) {
    return this.workerService.getAssignedVenues(user.id);
  }

  @Post('venues/:venueId/assignments')
  @ApiOperation({ summary: 'Assign an active staff user to a venue' })
  @ApiParam({ name: 'venueId', format: 'uuid' })
  @ApiBody({ type: AssignVenueDto })
  async assignVenue(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() body: AssignVenueDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.workerService.assignVenue(user.id, venueId, body.businessUserId);
  }

  @Delete('venues/:venueId/assignments/:businessUserId')
  @ApiOperation({ summary: 'Deactivate a staff venue assignment' })
  @ApiParam({ name: 'venueId', format: 'uuid' })
  @ApiParam({ name: 'businessUserId', format: 'uuid' })
  async removeVenueAssignment(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('businessUserId', ParseUUIDPipe) businessUserId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.workerService.removeVenueAssignment(user.id, venueId, businessUserId);
  }

  @Post('venues/:venueId/status')
  @ApiOperation({ summary: 'Update venue busyness and broadcast the live status' })
  @ApiParam({ name: 'venueId', format: 'uuid' })
  @ApiBody({ type: UpdateWorkerStatusDto })
  async updateStatus(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() body: UpdateWorkerStatusDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.workerService.updateVenueStatus(user.id, venueId, body.busyness);
  }

  @Post('venues/:venueId/redemptions/scan')
  @ApiOperation({ summary: 'Scan and redeem a customer voucher at an authorized venue' })
  @ApiParam({ name: 'venueId', format: 'uuid' })
  @ApiBody({ type: RedeemOfferDto })
  async scan(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() body: RedeemOfferDto,
    @CurrentUser() user: { id: string },
  ) {
    await this.workerService.assertVenueAccess(user.id, venueId);
    if (!body.voucherCode && !body.qrCodeData) {
      throw new BadRequestException('Voucher code or QR token is required');
    }
    const claim = body.qrCodeData
      ? await this.offersService.findClaimByQrToken(body.qrCodeData)
      : await this.offersService.findClaimByVoucherCode(body.voucherCode);
    if (!claim || claim.venueId !== venueId || claim.offer?.venueId !== venueId) {
      throw new BadRequestException('Voucher is not valid for this venue');
    }
    if (claim.status !== 'active') {
      throw new BadRequestException('Voucher has already been redeemed or is inactive');
    }
    if (!claim.qrCodeData || !this.offersService.verifyQrToken(body.qrCodeData || claim.qrCodeData, claim)) {
      throw new BadRequestException('Voucher QR token is invalid or expired');
    }
    if (!this.offersService.isOfferAvailableNow(claim.offer)) {
      throw new BadRequestException('This offer is no longer available');
    }

    const redeemed = await this.offersService.redeemOfferByWorker(
      claim.id,
      this.offersService.calculateSaving(claim.offer),
      user.id,
    );
    await this.auditService.log({
      actorId: user.id,
      actorRole: 'business',
      action: 'OFFER_REDEEM',
      target: 'redemption',
      targetId: redeemed.id,
      details: { venueId, offerId: redeemed.offerId, transactionId: redeemed.transactionId },
    });
    return {
      status: redeemed.status,
      transactionId: redeemed.transactionId,
      redeemedAt: redeemed.redeemedAt,
      savingValue: Number(redeemed.savingValue),
      currency: redeemed.currency,
    };
  }
}
