import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Venue } from '../../venues/entities/venue.entity';

@Entity('venue_live_updates')
@Index('IDX_venue_live_updates_venue_active', ['venueId', 'isActive'])
export class VenueLiveUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  venueId: string;

  @ManyToOne(() => Venue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @Column({ length: 40 })
  type: string;

  @Column({ length: 140 })
  title: string;

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column({ type: 'timestamp', nullable: true })
  startsAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endsAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  updatedByBusinessUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
