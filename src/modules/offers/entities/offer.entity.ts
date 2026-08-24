import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { OfferType } from '../../../common/enums';
import { Venue } from '../../venues/entities/venue.entity';
import { Redemption } from './redemption.entity';

@Entity('offers')
@Index('IDX_offer_venueId', ['venueId'])
@Index('IDX_offer_isActive', ['isActive'])
@Index('IDX_offer_venueId_isActive', ['venueId', 'isActive'])
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  venueId: string;

  @ManyToOne(() => Venue, (venue) => venue.offers)
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: OfferType, default: OfferType.TWO_FOR_ONE })
  type: OfferType;

  @Column('text', { array: true })
  validDays: string[];

  @Column()
  validTimeStart: string;

  @Column()
  validTimeEnd: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isAvailableNow: boolean;

  @Column({ type: 'int', default: 0 })
  redemptionCount: number;

  @Column({ type: 'int', default: 100 })
  maxRedemptions: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  savingValue: number;

  @OneToMany(() => Redemption, (redemption) => redemption.offer)
  redemptions: Redemption[];

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;
}
