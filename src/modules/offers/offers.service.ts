import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Offer } from './entities/offer.entity';
import { Redemption } from './entities/redemption.entity';
import { VenueAnalytics } from '../business/entities/venue-analytics.entity';
import { OfferStatus, RedemptionStatus } from '../../common/enums';
import { generateVoucherCode, generateTransactionId } from '../../common/utils/generators.util';
import { PKPass } from 'passkit-generator';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
    @InjectRepository(Redemption)
    private redemptionsRepository: Repository<Redemption>,
    @InjectRepository(VenueAnalytics)
    private analyticsRepository: Repository<VenueAnalytics>,
    private configService: ConfigService,
  ) { }

  private async incrementAnalytic(venueId: string, field: 'totalSaves' | 'offerClicks' | 'redemptions', delta = 1): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    let analytics = await this.analyticsRepository.findOne({ where: { venueId, date: today } });
    if (!analytics) {
      analytics = this.analyticsRepository.create({ venueId, date: today });
    }
    analytics[field] = Math.max(0, (analytics[field] || 0) + delta);
    await this.analyticsRepository.save(analytics);
  }

  async findById(id: string): Promise<Offer | null> {
    return this.offersRepository.findOne({ where: { id }, relations: ['venue'] });
  }

  async findAll(): Promise<Offer[]> {
    return this.offersRepository.find({ 
      where: { isActive: true },
      relations: ['venue'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByVenueId(venueId: string): Promise<Offer[]> {
    return this.offersRepository.find({ where: { venueId } });
  }

  /**
   * Get available offers for a venue (active + valid right now).
   */
  async findAvailableByVenueId(venueId: string): Promise<Offer[]> {
    const offers = await this.offersRepository.find({
      where: { venueId, isActive: true },
    });
    return offers.filter((offer) => this.isOfferAvailableNow(offer));
  }

  /**
   * Check if an offer is currently available based on all rules:
   * 1. isActive must be true
   * 2. Current day must be in validDays
   * 3. Current time must be between validTimeStart and validTimeEnd
   * 4. redemptionCount < maxRedemptions
   * 5. Current date < expiresAt (if set)
   */
  isOfferAvailableNow(offer: Offer): boolean {
    const now = new Date();

    // Rule 1: must be active
    if (!offer.isActive) return false;

    // Rule 5: not expired (always applies)
    if (offer.expiresAt && now > new Date(offer.expiresAt)) return false;

    // Rule 4: max redemptions not reached (0 = unlimited)
    if (offer.maxRedemptions > 0 && offer.redemptionCount >= offer.maxRedemptions) return false;

    // isAvailableNow flag: business owner override — skip time/day checks
    if (offer.isAvailableNow) return true;

    // Rule 2: check valid day
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = days[now.getDay()];
    if (offer.validDays && offer.validDays.length > 0 && !offer.validDays.includes(today)) {
      return false;
    }

    // Rule 3: check valid time window
    if (offer.validTimeStart && offer.validTimeEnd) {
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Handle overnight offers (e.g., 22:00 - 02:00)
      if (offer.validTimeStart > offer.validTimeEnd) {
        if (currentTime < offer.validTimeStart && currentTime > offer.validTimeEnd) {
          return false;
        }
      } else {
        if (currentTime < offer.validTimeStart || currentTime > offer.validTimeEnd) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Determine offer status:
   * - active: isActive=true AND within valid dates/times
   * - inactive: isActive=false (toggled off)
   * - expired: expiresAt < now
   * - upcoming: validTimeStart > current time (today&#39;s schedule not yet started)
   */
  getOfferStatus(offer: Offer): OfferStatus {
    const now = new Date();

    if (!offer.isActive) return OfferStatus.INACTIVE;

    if (offer.expiresAt && now > new Date(offer.expiresAt)) return OfferStatus.EXPIRED;

    if (offer.redemptionCount >= offer.maxRedemptions) return OfferStatus.EXPIRED;

    if (offer.validTimeStart) {
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      // Check if today is a valid day
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = days[now.getDay()];
      const isValidDay = !offer.validDays || offer.validDays.length === 0 || offer.validDays.includes(today);

      if (isValidDay && currentTime < offer.validTimeStart) {
        return OfferStatus.UPCOMING;
      }
    }

    if (this.isOfferAvailableNow(offer)) return OfferStatus.ACTIVE;

    return OfferStatus.INACTIVE;
  }

  /**
   * Calculate saving value based on offer type.
   */
  calculateSaving(offer: Offer): number {
    return offer.savingValue ? Number(offer.savingValue) : 0;
  }

  /**
   * Claim an offer — create a redemption with voucher code.
   */
  async claimOffer(offerId: string, userId: string, venueId: string): Promise<Redemption> {
    const redemption = this.redemptionsRepository.create({
      offerId,
      userId,
      venueId,
      voucherCode: generateVoucherCode(),
      qrCodeData: JSON.stringify({ offerId, userId, timestamp: Date.now() }),
      status: RedemptionStatus.ACTIVE,
      transactionId: generateTransactionId(),
      savingValue: 0, // will be set on redeem
    });

    return this.redemptionsRepository.save(redemption);
  }

  /**
   * Find an active (unredeemed) claim by user for a specific offer.
   */
  async findActiveClaimByUser(offerId: string, userId: string): Promise<Redemption | null> {
    return this.redemptionsRepository.findOne({
      where: { offerId, userId, status: RedemptionStatus.ACTIVE },
    });
  }

  /**
   * Find a claim by voucher code.
   */
  async findClaimByVoucherCode(voucherCode: string): Promise<Redemption | null> {
    return this.redemptionsRepository.findOne({
      where: { voucherCode },
      relations: ['offer'],
    });
  }

  /**
   * Redeem a claimed offer.
   */
  async redeemOffer(redemptionId: string, savingValue: number): Promise<Redemption> {
    const redemption = await this.redemptionsRepository.findOne({
      where: { id: redemptionId },
    });

    if (!redemption) throw new Error('Redemption not found');

    redemption.status = RedemptionStatus.REDEEMED;
    redemption.redeemedAt = new Date();
    redemption.savingValue = savingValue;

    // Increment offer redemption count
    await this.offersRepository.increment({ id: redemption.offerId }, 'redemptionCount', 1);

    // Increment venue analytics redemptions
    await this.incrementAnalytic(redemption.venueId, 'redemptions');

    return this.redemptionsRepository.save(redemption);
  }

  /**
   * Track an offer click — increments offerClicks in today's venue analytics.
   */
  async trackClick(offerId: string): Promise<void> {
    const offer = await this.offersRepository.findOne({ where: { id: offerId } });
    if (offer?.venueId) {
      await this.incrementAnalytic(offer.venueId, 'offerClicks');
    }
  }

  /**
   * Generate Apple Wallet Pass
   * Requires proper Apple Developer certificates to be configured.
   * Loads certificates from configured paths and generates a real .pkpass file.
   */
  async generateAppleWalletPass(offer: Offer, voucherCode: string): Promise<Buffer> {
    const teamId = this.configService.get<string>('app.apple.teamId');
    const passTypeId = this.configService.get<string>('app.apple.passTypeId');
    const certPath = this.configService.get<string>('app.apple.passCertPath');
    const keyPath = this.configService.get<string>('app.apple.passKeyPath');
    const wwdrPath = this.configService.get<string>('app.apple.passWwdrPath');
    const keyPassword = this.configService.get<string>('app.apple.passKeyPassword');

    // If Apple Wallet is not configured, return a mock stub for development/demo
    const isConfigured = teamId && passTypeId && certPath && keyPath && wwdrPath;
    if (!isConfigured) {
      const stub = {
        _note: 'Apple Wallet not configured — development stub',
        passType: 'coupon',
        offerTitle: offer.title,
        venue: offer.venue?.name || 'REKI Venue',
        voucherCode,
        offerId: offer.id,
        barcode: {
          format: 'QR',
          message: `reki://offer/${offer.id}/${voucherCode}`,
        },
        instructions: 'Set APPLE_TEAM_ID, APPLE_PASS_TYPE_ID, APPLE_PASS_CERT_PATH, APPLE_PASS_KEY_PATH, APPLE_PASS_WWDR_PATH to generate a real .pkpass file.',
      };
      return Buffer.from(JSON.stringify(stub));
    }

    // Check if certificate files exist
    const certFullPath = path.resolve(certPath!);
    const keyFullPath = path.resolve(keyPath!);
    const wwdrFullPath = path.resolve(wwdrPath!);

    if (!fs.existsSync(certFullPath)) {
      throw new Error(
        `Apple Wallet certificate not found at: ${certFullPath}. ` +
        'Please obtain a Pass Type ID certificate from Apple Developer Portal and place it at the configured path.'
      );
    }

    if (!fs.existsSync(keyFullPath)) {
      throw new Error(
        `Apple Wallet private key not found at: ${keyFullPath}. ` +
        'Please place your private key at the configured path.'
      );
    }

    if (!fs.existsSync(wwdrFullPath)) {
      throw new Error(
        `Apple WWDR certificate not found at: ${wwdrFullPath}. ` +
        'Please download the WWDR certificate from https://www.apple.com/certificateauthority/ and place it at the configured path.'
      );
    }

    const passJsonString = JSON.stringify({
      passTypeIdentifier: passTypeId,
      teamIdentifier: teamId,
      organizationName: 'REKI',
      description: offer.title,
      barcode: {
        format: 'PKBarcodeFormatQR',
        message: `reki://offer/${offer.id}/${voucherCode}`,
        messageEncoding: 'iso-8859-1',
      },
      coupon: {
        primaryFields: [{ key: 'offer', label: 'OFFER', value: offer.title }],
        secondaryFields: [{ key: 'venue', label: 'VENUE', value: offer.venue?.name || 'REKI Venue' }],
        auxiliaryFields: [{ key: 'code', label: 'CODE', value: voucherCode }],
      },
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(102, 126, 234)',
      labelColor: 'rgb(255, 255, 255)',
    });

    try {
      const pass = new PKPass({
        'pass.json': Buffer.from(passJsonString),
      });

      // Load certificates from configured paths
      const certBuffer = fs.readFileSync(certFullPath);
      const keyBuffer = fs.readFileSync(keyFullPath);
      const wwdrBuffer = fs.readFileSync(wwdrFullPath);

      // Set certificates using the correct API
      pass.certificates = {
        signerCert: certBuffer,
        signerKey: keyBuffer,
        wwdr: wwdrBuffer,
        ...(keyPassword && { signerKeyPassphrase: keyPassword }),
      };

      const buffer = await pass.getAsBuffer();
      return buffer;
    } catch (error: any) {
      throw new Error(
        `Apple Wallet pass generation failed: ${error.message}. ` +
        'Please verify your certificates are valid and properly configured. ' +
        'See: https://developer.apple.com/documentation/walletpasses'
      );
    }
  }
}