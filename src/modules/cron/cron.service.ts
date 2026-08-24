import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { PushService } from '../push/push.service';
import { NotificationType } from '../../common/enums/notification-type.enum';

@Injectable()
export class CronService {
    private readonly logger = new Logger(CronService.name);

    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
        private readonly pushService: PushService,
    ) { }

    // Run every Monday at 9:00 AM
    @Cron('0 9 * * 1', {
        name: 'weekly_recap_push',
        timeZone: 'Europe/London', // Since it's Manchester focused
    })
    async handleWeeklyRecap() {
        this.logger.log('Starting weekly recap push notifications job...');

        try {
            // Find active users
            const users = await this.usersRepository.find({
                where: { isActive: true },
                select: ['id', 'name', 'email', 'preferences'],
            });

            let sentCount = 0;
            let skippedCount = 0;

            for (const user of users) {
                // Check if user has opted out of weekly recap notifications
                const hasOptedOut = user.preferences?.notifications?.weeklyRecap === false;
                
                if (hasOptedOut) {
                    this.logger.debug(`Skipping weekly recap for user ${user.id} - opted out`);
                    skippedCount++;
                    continue;
                }

                const title = `Hey ${user.name.split(' ')[0]}, ready for the week?`;
                const body = "Check out what's happening in Manchester this week! Your favourite venues have new offers.";

                await this.pushService.sendToUser(user.id, NotificationType.WEEKLY_RECAP, {
                    title,
                    body,
                    data: { type: 'weekly_recap' },
                });

                sentCount++;
            }

            this.logger.log(
                `Weekly recap job completed successfully. Sent: ${sentCount}, Skipped (opted-out): ${skippedCount}, Total users: ${users.length}`
            );
        } catch (error) {
            this.logger.error('Failed to execute weekly recap job', error);
        }
    }
}
