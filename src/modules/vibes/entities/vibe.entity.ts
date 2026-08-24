import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Venue } from '../../venues/entities/venue.entity';

@Entity('vibes')
export class Vibe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  venueId: string;

  @OneToOne(() => Venue, (venue) => venue.vibe)
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @Column('text', { array: true, default: '{}' })
  tags: string[];

  @Column('text', { array: true, default: '{}' })
  musicGenre: string[];

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 0 })
  vibeCheckScore: number;

  @Column({ type: 'int', default: 0 })
  responseCount: number;

  @Column({ nullable: true })
  updatedBy: string;

  @UpdateDateColumn()
  lastUpdated: Date;
}
