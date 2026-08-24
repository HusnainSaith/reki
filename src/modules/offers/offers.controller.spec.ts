import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OffersController', () => {
  let controller: OffersController;
  let service: Partial<OffersService>;
  const user = { id: 'u-1' } as any;

  const mockOffer = {
    id: 'o-1',
    title: 'Happy Hour',
    description: '2 for 1',
    type: '2-for-1',
    venue: { name: 'Bar', address: '123', area: 'NQ', city: 'Manchester', lat: 53, lng: -2 },
    venueId: 'v-1',
    validDays: ['monday'],
    validTimeStart: '17:00',
    validTimeEnd: '19:00',
    savingValue: 5,
    isActive: true,
    expiresAt: null,
  };

  beforeEach(() => {
    service = {
      findById: jest.fn().mockResolvedValue(mockOffer),
      getOfferStatus: jest.fn().mockReturnValue('active'),
      isOfferAvailableNow: jest.fn().mockReturnValue(true),
      findActiveClaimByUser: jest.fn().mockResolvedValue(null),
      claimOffer: jest.fn().mockResolvedValue({
        voucherCode: 'RK-123',
        qrCodeData: 'qr',
        transactionId: 'REKI-001',
        status: 'claimed',
      }),
      findClaimByVoucherCode: jest.fn().mockResolvedValue({
        id: 'r-1',
        userId: 'u-1',
        status: 'claimed',
        voucherCode: 'RK-123',
      }),
      calculateSaving: jest.fn().mockReturnValue(5),
      redeemOffer: jest.fn().mockResolvedValue({
        transactionId: 'REKI-001',
        redeemedAt: new Date(),
        savingValue: 5,
        currency: 'GBP',
      }),
      generateAppleWalletPass: jest.fn().mockResolvedValue(
        Buffer.from(JSON.stringify({ passType: 'coupon', barcode: { format: 'PKBarcodeFormatQR' } }))
      ),
    };
    controller = new OffersController(service as OffersService);
  });

  describe('findOne', () => {
    it('returns offer detail', async () => {
      const result = await controller.findOne('o-1');
      expect(result.offer.title).toBe('Happy Hour');
      expect(result.offer.status).toBe('active');
    });

    it('throws NotFoundException when not found', async () => {
      (service.findById as jest.Mock).mockResolvedValue(null);
      await expect(controller.findOne('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('claim', () => {
    it('claims offer successfully', async () => {
      const result = await controller.claim('o-1', user);
      expect(result.voucherCode).toBe('RK-123');
      expect(result.status).toBe('claimed');
    });

    it('throws NotFoundException when offer not found', async () => {
      (service.findById as jest.Mock).mockResolvedValue(null);
      await expect(controller.claim('bad', user)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when not available now', async () => {
      (service.isOfferAvailableNow as jest.Mock).mockReturnValue(false);
      await expect(controller.claim('o-1', user)).rejects.toThrow(BadRequestException);
    });

    it('returns existing claim if already claimed', async () => {
      (service.findActiveClaimByUser as jest.Mock).mockResolvedValue({
        voucherCode: 'RK-EXIST',
        qrCodeData: 'qr',
        transactionId: 'REKI-002',
        status: 'claimed',
      });
      const result = await controller.claim('o-1', user);
      expect(result.voucherCode).toBe('RK-EXIST');
      expect(result.message).toContain('already');
    });
  });

  describe('redeem', () => {
    it('redeems successfully', async () => {
      const result = await controller.redeem('o-1', { voucherCode: 'RK-123' }, user);
      expect(result.status).toBe('redeemed');
    });

    it('throws NotFoundException when offer not found', async () => {
      (service.findById as jest.Mock).mockResolvedValue(null);
      await expect(controller.redeem('bad', { voucherCode: 'x' }, user)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when voucher code invalid', async () => {
      (service.findClaimByVoucherCode as jest.Mock).mockResolvedValue(null);
      await expect(controller.redeem('o-1', { voucherCode: 'bad' }, user)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when voucher belongs to another user', async () => {
      (service.findClaimByVoucherCode as jest.Mock).mockResolvedValue({
        id: 'r-1',
        userId: 'other-user',
        status: 'claimed',
      });
      await expect(controller.redeem('o-1', { voucherCode: 'RK-123' }, user)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when already redeemed', async () => {
      (service.findClaimByVoucherCode as jest.Mock).mockResolvedValue({
        id: 'r-1',
        userId: 'u-1',
        status: 'redeemed',
      });
      await expect(controller.redeem('o-1', { voucherCode: 'RK-123' }, user)).rejects.toThrow(BadRequestException);
    });
  });

  describe('walletPass', () => {
    let res: any;

    beforeEach(() => {
      res = { set: jest.fn() };
    });

    it('returns wallet pass data', async () => {
      (service.findActiveClaimByUser as jest.Mock).mockResolvedValue({ voucherCode: 'RK-123' });
      const result = await controller.walletPass('o-1', user, res);
      expect(result.passType).toBe('coupon');
      expect(result.barcode).toBeDefined();
    });

    it('throws NotFoundException when offer not found', async () => {
      (service.findById as jest.Mock).mockResolvedValue(null);
      await expect(controller.walletPass('bad', user, res)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when not claimed', async () => {
      (service.findActiveClaimByUser as jest.Mock).mockResolvedValue(null);
      await expect(controller.walletPass('o-1', user, res)).rejects.toThrow(BadRequestException);
    });
  });
});
