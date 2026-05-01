import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { runtimeFlags } from './runtime-flags';

@Injectable()
export class MemoryMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryMonitorService.name);
  private timer?: NodeJS.Timeout;

  onModuleInit() {
    if (!runtimeFlags.memoryMonitorEnabled) {
      return;
    }

    const intervalMs = Number(process.env.MEMORY_MONITOR_INTERVAL_MS || 60000);

    this.timer = setInterval(() => {
      const memory = process.memoryUsage();
      const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;

      this.logger.log(
        `memory rss=${toMb(memory.rss)}MB heapUsed=${toMb(
          memory.heapUsed,
        )}MB heapTotal=${toMb(memory.heapTotal)}MB external=${toMb(
          memory.external,
        )}MB arrayBuffers=${toMb(memory.arrayBuffers)}MB`,
      );
    }, intervalMs);

    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
