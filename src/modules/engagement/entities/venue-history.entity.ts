import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('venue_history')
@Index('UQ_history_user_venue', ['userId', 'venueId'], { unique: true })
export class VenueHistory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() userId: string;
  @Column() venueId: string;
  @Column({ type: 'timestamp' }) viewedAt: Date;
  @Column({ nullable: true }) source: string | null;
  @UpdateDateColumn() updatedAt: Date;
}
