import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CjService } from './cj.service';
@Injectable()
export class CjCronService {
  private readonly logger = new Logger(CjCronService.name);
  constructor(private readonly cjService: CjService) {}
  @Cron(CronExpression.EVERY_HOUR)
  async handleCatalogSync() {
    this.logger.log('[Cron] CJ Catalog Sync — Starting');
    try {
      const result = await this.cjService.runCatalogSync();
      if (result.success) {
        this.logger.log(
          `[Cron] ✅ Sync SUCCESS — ${result.count} products in warehouse`,
        );
      } else {
        this.logger.warn(
          `[Cron] ⚠️  Sync INCOMPLETE — only ${result.count} products. Existing cache preserved.`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        '[Cron] ❌ Sync threw an unexpected error',
        error?.message || error,
      );
    }
  }
}
