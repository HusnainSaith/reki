import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  getAppConfig() {
    return {
      appName: 'REKI',
      tagline: 'Discover the Manchester vibe.',
      city: this.configService.get<string>('app.defaultCity'),
      version: '2.0.0',
      minAppVersion: '1.0.0',
    };
  }

  getHealth() {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: this.dataSource.isInitialized ? 'connected' : 'disconnected',
      environment: this.configService.get<string>('app.nodeEnv') || 'development',
    };
  }
}
