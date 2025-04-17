import { Controller, Get } from '@nestjs/common';
import {
  MemoryHealthIndicator,
  HealthCheckService,
  HealthCheck,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from 'src/auth/decorators';

@Controller('health-check')
export class HealthcheckController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  index() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () =>
        this.disk.checkStorage('storage', {
          // thresholdPercent: 0.5,
          threshold: 250 * 1024 * 1024 * 1024,
          path: 'C:\\',
        }),
    ]);
  }
}
