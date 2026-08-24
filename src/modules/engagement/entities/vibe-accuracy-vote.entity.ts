import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('vibe_accuracy_votes')
@Index('UQ_vibe_vote_user_venue', ['userId', 'venueId'], { unique: true })
export class VibeAccuracyVote {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() userId: string;
  @Column() venueId: string;
  @Column() accurate: boolean;
  @Column({ nullable: true }) observedVibe: string | null;
  @Column({ type: 'timestamp', nullable: true }) votedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
