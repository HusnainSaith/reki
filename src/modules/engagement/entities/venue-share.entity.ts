import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('venue_shares')
@Index('IDX_share_venue_created', ['venueId', 'createdAt'])
export class VenueShare {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() userId: string;
  @Column() venueId: string;
  @Column() channel: string;
  @Column({ type: 'timestamp' }) sharedAt: Date;
  @Column({ type: 'int', default: 5 }) pointsAwarded: number;
  @CreateDateColumn() createdAt: Date;
}
