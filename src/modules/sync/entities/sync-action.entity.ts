import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum SyncActionType {
  BUSYNESS_UPDATE = 'BUSYNESS_UPDATE',
  VIBE_UPDATE = 'VIBE_UPDATE',
  OFFER_TOGGLE = 'OFFER_TOGGLE',
  NOTIFICATION_READ = 'NOTIFICATION_READ',
  VENUE_SAVE = 'VENUE_SAVE',
  VENUE_VIEW = 'VENUE_VIEW',
  REVIEW_CREATE = 'REVIEW_CREATE',
  REVIEW_UPDATE = 'REVIEW_UPDATE',
  CHECK_IN = 'CHECK_IN',
  VIBE_ACCURACY_VOTE = 'VIBE_ACCURACY_VOTE',
  VENUE_HISTORY_VIEW = 'VENUE_HISTORY_VIEW',
  VENUE_SHARE = 'VENUE_SHARE',
}

export enum SyncActionStatus {
  SUCCESS = 'success',
  CONFLICT = 'conflict',
  REJECTED = 'rejected',
  PENDING = 'pending',
}

@Entity('sync_actions')
@Index('IDX_sync_deviceId', ['deviceId'])
@Index('IDX_sync_userId', ['userId'])
@Index('IDX_sync_status', ['status'])
export class SyncAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientActionId: string;

  @Column()
  deviceId: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: SyncActionType })
  type: SyncActionType;

  @Column({ type: 'enum', enum: SyncActionStatus, default: SyncActionStatus.PENDING })
  status: SyncActionStatus;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ nullable: true })
  venueId: string;

  @Column({ nullable: true })
  notificationId: string;

  @Column({ nullable: true })
  offerId: string;

  @Column({ type: 'timestamp' })
  offlineTimestamp: Date;

  @Column({ nullable: true })
  conflictMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  serverData: Record<string, any>;

  @Column({ type: 'simple-array', nullable: true })
  conflictOptions: string[];

  @CreateDateColumn()
  syncedAt: Date;
}
