import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BusynessLevel } from '../../../common/enums';
import { Venue } from '../../venues/entities/venue.entity';

@Entity('busyness')
@Index('IDX_busyness_venueId', ['venueId'])
export class Busyness {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  venueId: string;

  @OneToOne(() => Venue, (venue) => venue.busyness)
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @Column({ type: 'enum', enum: BusynessLevel, default: BusynessLevel.QUIET })
  level: BusynessLevel;

  @Column({ type: 'int', default: 25 })
  percentage: number;

  @Column({ nullable: true })
  updatedBy: string;

  @Column({ type: 'int', default: 0 })
  dwellTime: number;

  @UpdateDateColumn()
  lastUpdated: Date;
}
