import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(ActivityLog)
    private activityLogRepository: Repository<ActivityLog>,
  ) {}

  async log(entry: {
    actorId: string;
    actorRole: string;
    action: string;
    target: string;
    targetId?: string;
    details?: Record<string, unknown>;
  }): Promise<ActivityLog> {
    const log = this.activityLogRepository.create(entry);
    return this.activityLogRepository.save(log);
  }

  async findAll(): Promise<ActivityLog[]> {
    return this.activityLogRepository.find({ order: { createdAt: 'DESC' } });
  }
}
