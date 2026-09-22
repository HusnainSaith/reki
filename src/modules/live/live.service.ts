import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offer } from '../offers/entities/offer.entity';
import { Venue } from '../venues/entities/venue.entity';
import { OffersService } from '../offers/offers.service';
import { VenueLiveUpdate } from '../worker/entities/venue-live-update.entity';
import { In } from 'typeorm';

@Injectable()
export class LiveService {
  constructor(
    @InjectRepository(Offer)
    private readonly offersRepository: Repository<Offer>,
    @InjectRepository(Venue)
    private readonly venuesRepository: Repository<Venue>,
    @InjectRepository(VenueLiveUpdate)
    private readonly liveUpdatesRepository: Repository<VenueLiveUpdate>,
    private readonly offersService: OffersService,
  ) {}

  async getSnapshot(city = 'manchester') {
    const normalizedCity = city.trim().toLowerCase();
    const venues = await this.venuesRepository
      .createQueryBuilder('venue')
      .leftJoinAndSelect('venue.busyness', 'busyness')
      .leftJoin('venue.cityRecord', 'cityRecord')
      .where('LOWER(cityRecord.slug) = :city', { city: normalizedCity })
      .orderBy('venue.name', 'ASC')
      .getMany();
    const venueIds = venues.map((venue) => venue.id);
    const offers = venueIds.length
      ? await this.offersRepository.find({
        where: venueIds.map((venueId) => ({ venueId, isActive: true })),
        relations: ['venue', 'venue.cityRecord'],
      })
      : [];
    const venueById = new Map(venues.map((venue) => [venue.id, venue]));
    const liveUpdates = venueIds.length ? await this.liveUpdatesRepository.find({
      where: { venueId: In(venueIds), isActive: true }, order: { createdAt: 'DESC' },
    }) : [];

    return {
      city: normalizedCity,
      timestamp: new Date().toISOString(),
      venues: venues.map((venue) => ({
        id: venue.id,
        name: venue.name,
        isLive: venue.isLive,
        busyness: venue.busyness
          ? { level: venue.busyness.level, percentage: venue.busyness.percentage }
          : null,
        offers: offers
          .filter((offer) => offer.venueId === venue.id && this.offersService.isOfferAvailableNow(offer))
          .map((offer) => ({ id: offer.id, title: offer.title, type: offer.type })),
        whatsOn: liveUpdates.filter((update) => update.venueId === venue.id),
      })),
      offers: offers
        .filter((offer) => venueById.has(offer.venueId) && this.offersService.isOfferAvailableNow(offer))
        .map((offer) => ({ id: offer.id, venueId: offer.venueId, title: offer.title, type: offer.type })),
    };
  }
}
