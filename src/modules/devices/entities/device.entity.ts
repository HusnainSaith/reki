import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

@Entity('devices')
@Index('IDX_device_userId', ['userId'])
@Index('IDX_device_fcmToken', ['fcmToken'], { unique: true })
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  fcmToken: string;

  @Column({ type: 'enum', enum: DevicePlatform, default: DevicePlatform.IOS })
  platform: DevicePlatform;

  @Column()
  deviceId: string;

  @Column({ nullable: true })
  appVersion: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastActiveAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
