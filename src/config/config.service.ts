import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import type { AppConfig } from './config.schema';

@Injectable()
export class AppConfigService {
  constructor(private configService: NestConfigService<AppConfig>) {}

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    const value = this.configService.get<AppConfig[K]>(key);
    if (!value) {
      throw new Error(`Config key "${String(key)}" is not defined`);
    }
    return value;
  }
}
