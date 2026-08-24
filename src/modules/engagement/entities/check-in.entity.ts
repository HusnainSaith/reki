import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('venue_check_ins')
@Index('IDX_checkin_user_created', ['userId', 'createdAt'])
export class CheckIn {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() userId: string;
  @Column() venueId: string;
  @Column({ type: 'decimal', precision: 10, scale: 7 }) lat: number;
  @Column({ type: 'decimal', precision: 10, scale: 7 }) lng: number;
  @Column({ type: 'float' }) accuracy: number;
  @Column({ type: 'timestamp' }) checkedInAt: Date;
  @Column({ type: 'int', default: 20 }) pointsAwarded: number;
  @CreateDateColumn() createdAt: Date;
}
