import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('area_analytics')
@Index('IDX_area_city_date', ['city', 'date'])
export class AreaAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  areaName: string;

  @Column({ default: 'Manchester' })
  city: string;

  @Column({ type: 'int', default: 0 })
  activeVenues: number;

  @Column({ type: 'int', default: 0 })
  totalUsers: number;

  @Column({ type: 'int', default: 0 })
  avgBusyness: number;

  @Column()
  date: string;

  @Column({ type: 'int', default: 0 })
  hour: number;

  @CreateDateColumn()
  createdAt: Date;
}
