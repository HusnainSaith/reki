import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CronService } from './cron.service';
import { User } from '../users/entities/user.entity';
import { PushService } from '../push/push.service';

describe('CronService', () => {
    let service: CronService;
    let usersRepo: Record<string, jest.Mock>;
    let pushService: Record<string, jest.Mock>;

    beforeEach(async () => {
        usersRepo = {
            find: jest.fn(),
        };
        pushService = {
            sendToUser: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CronService,
                { provide: getRepositoryToken(User), useValue: usersRepo },
                { provide: PushService, useValue: pushService },
            ],
        }).compile();

        service = module.get<CronService>(CronService);
    });

    describe('handleWeeklyRecap', () => {
        it('should query active users and send push notifications', async () => {
            usersRepo.find.mockResolvedValue([
                { id: 'u-1', name: 'John Doe', email: 'john@test.com' },
                { id: 'u-2', name: 'Jane Doe', email: 'jane@test.com' },
            ]);
            pushService.sendToUser.mockResolvedValue({ sent: true });

            await service.handleWeeklyRecap();

            expect(usersRepo.find).toHaveBeenCalled();
            expect(pushService.sendToUser).toHaveBeenCalledTimes(2);
            expect(pushService.sendToUser).toHaveBeenCalledWith('u-1', 'weekly_recap', expect.anything());
        });
    });
});
