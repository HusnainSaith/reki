import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { PushModule } from '../push/push.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        PushModule,
    ],
    providers: [CronService],
})
export class CronModule { }
