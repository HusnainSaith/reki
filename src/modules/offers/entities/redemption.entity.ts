import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RedemptionStatus } from '../../../common/enums';
import { Offer } from './offer.entity';
import { User } from '../../users/entities/user.entity';
import { Venue } from '../../venues/entities/venue.entity';

@Entity('redemptions')
export class Redemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  offerId: string;

  @ManyToOne(() => Offer, (offer) => offer.redemptions)
  @JoinColumn({ name: 'offerId' })
  offer: Offer;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.redemptions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  venueId: string;

  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @Column({ unique: true })
  voucherCode: string;

  @Column()
  qrCodeData: string;

  @Column({ type: 'enum', enum: RedemptionStatus, default: RedemptionStatus.ACTIVE })
  status: RedemptionStatus;

  @Column()
  transactionId: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  savingValue: number;

  @Column({ default: 'GBP' })
  currency: string;

  @Column({ type: 'timestamp', nullable: true })
  redeemedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
