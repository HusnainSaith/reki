import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { BusinessUser } from './business-user.entity';
import { Venue } from '../../venues/entities/venue.entity';

@Entity('venue_assignments')
@Unique('UQ_venue_assignment_user_venue', ['businessUserId', 'venueId'])
@Index('IDX_venue_assignments_user_active', ['businessUserId', 'isActive'])
@Index('IDX_venue_assignments_venue_active', ['venueId', 'isActive'])
export class VenueAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  businessUserId: string;

  @ManyToOne(() => BusinessUser, (businessUser) => businessUser.venueAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessUserId' })
  businessUser: BusinessUser;

  @Column({ type: 'uuid' })
  venueId: string;

  @ManyToOne(() => Venue, (venue) => venue.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venueId' })
  venue: Venue;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
