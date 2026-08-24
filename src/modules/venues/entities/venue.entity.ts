import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { VenueCategory } from '../../../common/enums';
import { Busyness } from '../../busyness/entities/busyness.entity';
import { Vibe } from '../../vibes/entities/vibe.entity';
import { Offer } from '../../offers/entities/offer.entity';
import { VenueAnalytics } from '../../business/entities/venue-analytics.entity';
import { BusinessUser } from '../../business/entities/business-user.entity';

@Entity('venues')
@Index('IDX_venue_city', ['city'])
@Index('IDX_venue_category', ['category'])
@Index('IDX_venue_price', ['priceLevel'])
@Index('IDX_venue_city_category', ['city', 'category'])
@Index('IDX_venue_lat_lng', ['lat', 'lng'])
export class Venue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ default: 'Manchester' })
  city: string;

  @Column()
  area: string;

  @Column({ type: 'enum', enum: VenueCategory })
  category: VenueCategory;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column('text', { array: true, default: '{}' })
  images: string[];

  @Column({ type: 'int', default: 2 })
  priceLevel: number;

  @Column({ nullable: true })
  openingHours: string;

  @Column({ nullable: true })
  closingTime: string;

  @Column({ default: false })
  isLive: boolean;

  @Column('text', { array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 4.0 })
  rating: number;

  @Column({ nullable: true })
  businessUserId: string;

  @ManyToOne(() => BusinessUser, (businessUser) => businessUser.venues)
  @JoinColumn({ name: 'businessUserId' })
  businessUser: BusinessUser;

  @OneToOne(() => Busyness, (busyness) => busyness.venue)
  busyness: Busyness;

  @OneToOne(() => Vibe, (vibe) => vibe.venue)
  vibe: Vibe;

  @OneToMany(() => Offer, (offer) => offer.venue)
  offers: Offer[];

  @OneToMany(() => VenueAnalytics, (analytics) => analytics.venue)
  analytics: VenueAnalytics[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
