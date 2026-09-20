import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  getAppConfig(acceptLanguage?: string) {
    const supportedLocales = this.configService.get<string[]>('app.supportedLocales') || ['en-GB'];
    const requestedLocale = acceptLanguage?.split(',')[0]?.trim();
    const locale = requestedLocale && supportedLocales.includes(requestedLocale)
      ? requestedLocale
      : supportedLocales[0];

    return {
      appName: 'REKI',
      tagline: 'Discover the Manchester vibe.',
      city: this.configService.get<string>('app.defaultCity'),
      version: '2.0.0',
      minAppVersion: '1.0.0',
      locale,
      direction: locale.toLowerCase().startsWith('ar') ? 'rtl' : 'ltr',
      supportedLocales,
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
