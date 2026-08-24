import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VibesService } from './vibes.service';
import { VibesController } from './vibes.controller';
import { Vibe } from './entities/vibe.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vibe])],
  controllers: [VibesController],
  providers: [VibesService],
  exports: [VibesService],
})
export class VibesModule {}
