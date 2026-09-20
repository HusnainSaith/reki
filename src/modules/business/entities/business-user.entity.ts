import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BusinessRole } from '../../../common/enums';
import { Venue } from '../../venues/entities/venue.entity';
import { VenueAssignment } from './venue-assignment.entity';

@Entity('business_users')
export class BusinessUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  password: string;

  @OneToMany(() => Venue, (venue) => venue.businessUser)
  venues: Venue[];

  @OneToMany(() => VenueAssignment, (assignment) => assignment.businessUser)
  venueAssignments: VenueAssignment[];

  @Column({ type: 'enum', enum: BusinessRole, default: BusinessRole.OWNER })
  role: BusinessRole;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: false })
  isApproved: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
