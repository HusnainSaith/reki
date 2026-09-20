import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Venue } from '../../venues/entities/venue.entity';

@Entity('cities')
@Index('UQ_cities_slug', ['slug'], { unique: true })
@Index('IDX_cities_active', ['isActive'])
export class City {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 80 })
  slug: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 2 })
  countryCode: string;

  @Column({ length: 64 })
  timezone: string;

  @Column({ length: 10, default: 'en-GB' })
  defaultLocale: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 50 })
  detectionRadiusKm: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Venue, (venue) => venue.cityRecord)
  venues: Venue[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
