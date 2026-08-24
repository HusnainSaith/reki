import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Busyness } from './entities/busyness.entity';
import { BusynessLevel, BusynessPercentageMap } from '../../common/enums';

@Injectable()
export class BusynessService {
  constructor(
    @InjectRepository(Busyness)
    private busynessRepository: Repository<Busyness>,
  ) {}

  async findByVenueId(venueId: string): Promise<Busyness | null> {
    return this.busynessRepository.findOne({ where: { venueId } });
  }

  /**
   * Update busyness level — auto-calculates percentage from level.
   * Business owner sets level → percentage is derived.
   */
  async updateLevel(
    venueId: string,
    level: BusynessLevel,
    updatedBy: string,
  ): Promise<Busyness> {
    let busyness = await this.busynessRepository.findOne({ where: { venueId } });

    if (!busyness) {
      busyness = this.busynessRepository.create({ venueId });
    }

    busyness.level = level;
    busyness.percentage = BusynessPercentageMap[level];
    busyness.updatedBy = updatedBy;

    return this.busynessRepository.save(busyness);
  }

  /**
   * Get atmosphere label from percentage.
   * Quiet: 0-33%, Lively/Moderate: 34-66%, Packed/Busy: 67-100%
   */
  getAtmosphereFromPercentage(percentage: number): string {
    if (percentage <= 33) return 'quiet';
    if (percentage <= 66) return 'lively';
    return 'packed';
  }

  /**
   * Check if percentage falls within the given atmosphere filter.
   */
  matchesAtmosphere(percentage: number, atmosphere: string): boolean {
    switch (atmosphere.toLowerCase()) {
      case 'quiet':
        return percentage <= 33;
      case 'lively':
        return percentage >= 34 && percentage <= 66;
      case 'packed':
        return percentage >= 67;
      default:
        return true;
    }
  }
}
