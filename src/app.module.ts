import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { HealthcheckModule } from './healthcheck/healthcheck.module';

@Module({
  imports: [AppConfigModule, HealthcheckModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
