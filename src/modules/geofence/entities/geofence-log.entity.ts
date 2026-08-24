import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('geofence_logs')
@Index('IDX_geofence_user_venue', ['userId', 'venueId'])
@Index('IDX_geofence_user_notified', ['userId', 'notifiedAt'])
export class GeofenceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  venueId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  distance: number;

  @Column({ nullable: true })
  offerId: string;

  @Column()
  notifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
