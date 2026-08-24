import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Venue } from '../../venues/entities/venue.entity';

@Entity('venue_analytics')
export class VenueAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  venueId: string;

  @ManyToOne(() => Venue, (venue) => venue.analytics)
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int', default: 0 })
  liveBusynessPercent: number;

  @Column({ nullable: true })
  busynessChange: string;

  @Column({ type: 'int', default: 0 })
  avgDwellTime: number;

  @Column({ nullable: true })
  dwellTimeChange: string;

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 0 })
  vibeCheckScore: number;

  @Column({ type: 'int', default: 0 })
  vibeCheckResponses: number;

  @Column({ type: 'int', default: 0 })
  socialShares: number;

  @Column({ nullable: true })
  socialSharesChange: string;

  @Column({ type: 'int', default: 0 })
  totalViews: number;

  @Column({ type: 'int', default: 0 })
  totalSaves: number;

  @Column({ type: 'int', default: 0 })
  offerClicks: number;

  @Column({ type: 'int', default: 0 })
  redemptions: number;

  @CreateDateColumn()
  createdAt: Date;
}
