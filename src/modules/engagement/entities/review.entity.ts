import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('venue_reviews')
@Index('UQ_review_user_venue', ['userId', 'venueId'], { unique: true })
export class Review {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() userId: string;
  @Column() venueId: string;
  @Column({ type: 'int' }) rating: number;
  @Column({ type: 'varchar', length: 500, nullable: true }) text: string | null;
  @Column() vibeAccurate: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
