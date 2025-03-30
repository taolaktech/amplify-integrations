import { Module } from '@nestjs/common';
import { HealthcheckController } from './healthcheck.controller';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [TerminusModule],
  controllers: [HealthcheckController],
})
export class HealthcheckModule {}
