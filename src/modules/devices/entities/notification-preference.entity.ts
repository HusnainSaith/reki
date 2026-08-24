import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: true })
  vibeAlerts: boolean;

  @Column({ default: true })
  livePerformance: boolean;

  @Column({ default: true })
  socialCheckins: boolean;

  @Column({ default: true })
  offerAlerts: boolean;

  @Column({ default: true })
  weeklyRecap: boolean;

  @Column({ default: true })
  proximityAlerts: boolean;

  @Column({ nullable: true })
  quietHoursStart: string;

  @Column({ nullable: true })
  quietHoursEnd: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
