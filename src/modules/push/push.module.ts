import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushService } from './push.service';
import { DevicesModule } from '../devices/devices.module';
import { Notification } from '../notifications/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    DevicesModule,
  ],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
