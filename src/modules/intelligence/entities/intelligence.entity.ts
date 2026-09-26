import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('interaction_events')
@Index('UQ_interaction_idempotency', ['userId', 'idempotencyKey'], { unique: true })
@Index('IDX_interaction_venue_created', ['venueId', 'createdAt'])
export class InteractionEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') userId: string;
  @Column('uuid', { nullable: true }) venueId: string;
  @Column() type: string;
  @Column() idempotencyKey: string;
  @Column({ type: 'jsonb', nullable: true }) context: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
}

@Entity('busyness_observations')
@Index('IDX_observation_venue_time', ['venueId', 'observedAt'])
export class BusynessObservation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') venueId: string;
  @Column('int') percentage: number;
  @Column() level: string;
  @Column({ default: 'venue_update' }) source: string;
  @Column({ type: 'float', default: 1 }) confidence: number;
  @Column({ type: 'timestamptz' }) observedAt: Date;
  @CreateDateColumn() createdAt: Date;
}

@Entity('model_versions')
@Index('UQ_model_name_version', ['modelName', 'version'], { unique: true })
export class ModelVersion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() modelName: string;
  @Column() version: string;
  @Column({ default: 'active' }) status: string;
  @Column({ type: 'jsonb', nullable: true }) metrics: Record<string, number>;
  @Column({ type: 'timestamptz', nullable: true }) trainedAt: Date;
  @CreateDateColumn() deployedAt: Date;
}
