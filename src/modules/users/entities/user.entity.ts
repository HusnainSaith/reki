import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Role, AuthProvider } from '../../../common/enums';
import { Notification } from '../../notifications/entities/notification.entity';
import { Redemption } from '../../offers/entities/redemption.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  password: string;

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.EMAIL })
  authProvider: AuthProvider;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  preferences: {
    vibes: string[];
    music: string[];
    notifications?: {
      weeklyRecap?: boolean;
      offerAlerts?: boolean;
      geofenceAlerts?: boolean;
    };
  };

  @Column('text', { array: true, default: '{}' })
  savedVenues: string[];

  // Location fields
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  currentLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  currentLng: number;

  @Column({ nullable: true })
  locationUpdatedAt: Date;

  @Column({ default: false })
  locationEnabled: boolean;

  @Column({ default: false })
  backgroundLocationEnabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  appState: Record<string, any>;

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => Redemption, (redemption) => redemption.user)
  redemptions: Redemption[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
