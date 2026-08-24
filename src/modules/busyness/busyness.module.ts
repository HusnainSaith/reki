import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusynessService } from './busyness.service';
import { Busyness } from './entities/busyness.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Busyness])],
  providers: [BusynessService],
  exports: [BusynessService],
})
export class BusynessModule {}
