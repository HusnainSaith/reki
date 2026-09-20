import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OffersService } from './offers.service';
import { Offer } from './entities/offer.entity';
import { Redemption } from './entities/redemption.entity';
import { VenueAnalytics } from '../business/entities/venue-analytics.entity';
import { OfferStatus, RedemptionStatus } from '../../common/enums';
import { ConfigService } from '@nestjs/config';

describe('OffersService', () => {
  let service: OffersService;
  let offersRepo: Record<string, jest.Mock>;
  let redemptionsRepo: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;

  const mockOffer: Partial<Offer> = {
    id: 'offer-1',
    venueId: 'venue-1',
    title: 'Happy Hour 2-for-1',
    isActive: true,
    validDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    validTimeStart: '00:00',
    validTimeEnd: '23:59',
    redemptionCount: 5,
    maxRedemptions: 100,
    expiresAt: new Date(Date.now() + 86400000),
    savingValue: 5.5,
  };

  beforeEach(async () => {
    offersRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      increment: jest.fn(),
    };
    redemptionsRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const analyticsRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest.fn(),
    };
    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        { provide: getRepositoryToken(Offer), useValue: offersRepo },
        { provide: getRepositoryToken(Redemption), useValue: redemptionsRepo },
        { provide: getRepositoryToken(VenueAnalytics), useValue: analyticsRepo },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<OffersService>(OffersService);
  });

  describe('findById', () => {
    it('should return offer with venue relation', async () => {
      offersRepo.findOne.mockResolvedValue(mockOffer);
      const result = await service.findById('offer-1');
      expect(result).toEqual(mockOffer);
      expect(offersRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ relations: ['venue', 'venue.cityRecord'] }),
      );
    });
  });

  describe('findByVenueId', () => {
    it('should return offers for a venue', async () => {
      offersRepo.find.mockResolvedValue([mockOffer]);
      const result = await service.findByVenueId('venue-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('isOfferAvailableNow', () => {
    it('should return false if offer is inactive', () => {
      const offer = { ...mockOffer, isActive: false } as Offer;
      expect(service.isOfferAvailableNow(offer)).toBe(false);
    });

    it('should return false if max redemptions reached', () => {
      const offer = { ...mockOffer, redemptionCount: 100, maxRedemptions: 100 } as Offer;
      expect(service.isOfferAvailableNow(offer)).toBe(false);
    });

    it('should return false if offer is expired', () => {
      const offer = { ...mockOffer, expiresAt: new Date(Date.now() - 86400000) } as Offer;
      expect(service.isOfferAvailableNow(offer)).toBe(false);
    });

    it('should return true for valid active offer', () => {
      const now = new Date();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = days[now.getDay()];
      const offer = {
        ...mockOffer,
        validDays: [today],
        validTimeStart: '00:00',
        validTimeEnd: '23:59',
      } as Offer;
      expect(service.isOfferAvailableNow(offer)).toBe(true);
    });

    it('should return false if current day not in validDays', () => {
      const now = new Date();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = days[now.getDay()];
      const otherDays = days.filter((d) => d !== today);
      const offer = { ...mockOffer, validDays: otherDays } as Offer;
      expect(service.isOfferAvailableNow(offer)).toBe(false);
    });
  });

  describe('getOfferStatus', () => {
    it('should return INACTIVE for deactivated offer', () => {
      const offer = { ...mockOffer, isActive: false } as Offer;
      expect(service.getOfferStatus(offer)).toBe(OfferStatus.INACTIVE);
    });

    it('should return EXPIRED for past-expiry offer', () => {
      const offer = { ...mockOffer, expiresAt: new Date(Date.now() - 86400000) } as Offer;
      expect(service.getOfferStatus(offer)).toBe(OfferStatus.EXPIRED);
    });

    it('should return EXPIRED when max redemptions reached', () => {
      const offer = { ...mockOffer, redemptionCount: 100, maxRedemptions: 100 } as Offer;
      expect(service.getOfferStatus(offer)).toBe(OfferStatus.EXPIRED);
    });
  });

  describe('calculateSaving', () => {
    it('should return saving value', () => {
      expect(service.calculateSaving(mockOffer as Offer)).toBe(5.5);
    });

    it('should return 0 if no saving value', () => {
      const offer = { ...mockOffer, savingValue: null } as any;
      expect(service.calculateSaving(offer)).toBe(0);
    });
  });

  describe('claimOffer', () => {
    it('should create a redemption with voucher code', async () => {
      const redemption = { id: 'r-1', offerId: 'offer-1', userId: 'user-1', status: RedemptionStatus.ACTIVE };
      redemptionsRepo.create.mockReturnValue(redemption);
      redemptionsRepo.save.mockResolvedValue(redemption);

      const result = await service.claimOffer('offer-1', 'user-1', 'venue-1');
      expect(result.status).toBe(RedemptionStatus.ACTIVE);
      expect(redemptionsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ offerId: 'offer-1', userId: 'user-1' }),
      );
    });
  });

  describe('findActiveClaimByUser', () => {
    it('should find active claim', async () => {
      const claim = { id: 'r-1', status: RedemptionStatus.ACTIVE };
      redemptionsRepo.findOne.mockResolvedValue(claim);
      const result = await service.findActiveClaimByUser('offer-1', 'user-1');
      expect(result).toEqual(claim);
    });

    it('should return null if no active claim', async () => {
      redemptionsRepo.findOne.mockResolvedValue(null);
      expect(await service.findActiveClaimByUser('offer-1', 'user-1')).toBeNull();
    });
  });

  describe('redeemOffer', () => {
    it('should mark redemption as redeemed and increment count', async () => {
      const redemption = { id: 'r-1', offerId: 'offer-1', status: RedemptionStatus.ACTIVE };
      redemptionsRepo.findOne.mockResolvedValue(redemption);
      redemptionsRepo.save.mockResolvedValue({ ...redemption, status: RedemptionStatus.REDEEMED });

      const result = await service.redeemOffer('r-1', 5.5);
      expect(redemption.status).toBe(RedemptionStatus.REDEEMED);
      expect(offersRepo.increment).toHaveBeenCalledWith({ id: 'offer-1' }, 'redemptionCount', 1);
    });

    it('should throw if redemption not found', async () => {
      redemptionsRepo.findOne.mockResolvedValue(null);
      await expect(service.redeemOffer('gone', 5)).rejects.toThrow('Redemption not found');
    });
  });
});
