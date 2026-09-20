import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from './entities/city.entity';

@Injectable()
export class CitiesService {
  constructor(
    @InjectRepository(City)
    private readonly citiesRepository: Repository<City>,
  ) {}

  async findActive() {
    return this.citiesRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findNearest(latitude: number, longitude: number) {
    const cities = await this.findActive();
    const nearest = cities
      .map((city) => ({ city, distanceKm: this.distanceKm(latitude, longitude, Number(city.latitude), Number(city.longitude)) }))
      .sort((left, right) => left.distanceKm - right.distanceKm)[0];

    if (!nearest || nearest.distanceKm > Number(nearest.city.detectionRadiusKm)) {
      throw new NotFoundException('No supported city was found near this location');
    }

    return {
      city: nearest.city,
      distanceKm: Number(nearest.distanceKm.toFixed(2)),
    };
  }

  private distanceKm(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
    const earthRadiusKm = 6371;
    const latitudeDelta = this.toRadians(latitudeB - latitudeA);
    const longitudeDelta = this.toRadians(longitudeB - longitudeA);
    const a = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(this.toRadians(latitudeA))
      * Math.cos(this.toRadians(latitudeB))
      * Math.sin(longitudeDelta / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRadians(value: number) {
    return value * Math.PI / 180;
  }
}
