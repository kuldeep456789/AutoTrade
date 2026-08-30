import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CjService } from './cj.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import { CJ_CONFIG } from '../../config/cj.config';

@Injectable()
export class CjCronService implements OnModuleInit {
  private readonly logger = new Logger(CjCronService.name);
  private consecutiveFailures = 0;
  private isSyncing = false;

  constructor(
    private readonly cjService: CjService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  async onModuleInit() {
    // Delay first execution on startup by 30 seconds to allow the application to fully boot
    this.logger.log('[Cron] Delaying startup warehouse check by 30 seconds...');
    setTimeout(async () => {
      try {
        await this.checkWarehouseOnStartup();
      } catch (err: any) {
        this.logger.error(
          '[Cron] Startup warehouse check failed:',
          err?.message ?? err,
        );
      }
    }, 30000);
  }

  /**
   * Startup sync trigger if the warehouse is empty.
   */
  private async checkWarehouseOnStartup() {
    this.logger.log('[Cron] Checking if catalog is populated in database or warehouse cache...');
    const count = await this.cjService.getProductCount();

    if (count === 0) {
      this.logger.warn(
        '[Cron] Warehouse catalog is EMPTY. Running startup catalog sync...',
      );
      this.executeSyncWithMetrics().catch((err) => {
        this.logger.error(
          '[Cron] Startup catalog sync failed:',
          err?.message ?? err,
        );
      });
    } else {
      this.logger.log(
        `[Cron] Warehouse is active with ${count} products available. Startup sync skipped.`,
      );
    }
  }

  /**
   * Hourly Catalog Sync Job with Kolkata timezone.
   */
  @Cron(CronExpression.EVERY_HOUR, {
    timeZone: 'Asia/Kolkata',
  })
  async handleCatalogSync() {
    this.logger.log('[Cron] Hourly CJ Catalog Sync — Starting');

    // Skip if paused due to repeated consecutive failures (circuit breaker pattern)
    if (this.consecutiveFailures >= 5) {
      this.logger.error(
        `[Cron] Sync is currently PAUSED due to ${this.consecutiveFailures} consecutive failures. Skipping execution until reset.`,
      );
      return;
    }

    try {
      await this.executeSyncWithMetrics();
    } catch (error: any) {
      this.logger.error(
        '[Cron] Hourly sync encountered an unhandled error:',
        error?.message || error,
      );
    }
  }

  private async executeSyncWithMetrics() {
    if (this.isSyncing) {
      this.logger.warn(
        '[Cron] Sync is already active in this process. Skipping.',
      );
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      // 1. Health Checks
      this.logger.log('[Cron] Performing pre-sync Health Checks...');
      const redisConnected = this.redisService.isReady();
      if (!redisConnected) {
        this.logger.warn(
          '[Cron] Upstash Redis is currently unavailable or quota limit exceeded. Sync will update MongoDB and local memory cache.',
        );
      }

      // Check CJ Access Token
      try {
        await this.cjService.getAccessToken();
      } catch (err: any) {
        throw new Error(
          `CJ API Authentication check failed: ${err?.message ?? err}`,
        );
      }
      this.logger.log('[Cron] Health checks passed successfully.');

      // 2. Timeout Wrapper (30 Minutes max execution limit)
      const TIMEOUT_LIMIT = 30 * 60 * 1000;
      const syncPromise = this.cjService.runCatalogSync();
      const timeoutPromise = new Promise<{
        success: boolean;
        count: number;
        skipped?: boolean;
      }>((_, reject) =>
        setTimeout(
          () => reject(new Error('Sync execution timed out after 30 minutes')),
          TIMEOUT_LIMIT,
        ),
      );

      const result = await Promise.race([syncPromise, timeoutPromise]);

      // ── A lock-skip is NOT a failure — another sync was already holding
      // the Redis lock. Don't touch the failure counter or send alerts. ──
      if (result.skipped) {
        this.logger.warn(
          '[Cron] Sync skipped — another sync was already in progress (Redis lock held).',
        );
        return;
      }

      const durationMs = Date.now() - startTime;
      const endMemory = process.memoryUsage().heapUsed;
      const memoryDiffMB = ((endMemory - startMemory) / 1024 / 1024).toFixed(2);

      if (result.success) {
        this.consecutiveFailures = 0; // reset failures on success
        this.logger.log(
          `[Cron] ✅ Sync SUCCESS — ${result.count} products in warehouse. Duration: ${(durationMs / 1000).toFixed(1)}s. Heap diff: ${memoryDiffMB} MB`,
        );

        // Store sync metrics report in Redis
        const metricsReport = {
          status: 'success',
          timestamp: new Date().toISOString(),
          durationSeconds: Number((durationMs / 1000).toFixed(1)),
          productCount: result.count,
          memoryHeapUsedMB: Number((endMemory / 1024 / 1024).toFixed(2)),
          consecutiveFailures: this.consecutiveFailures,
        };
        await this.redisService.setJson('cj:sync:last_report', metricsReport);
      } else {
        throw new Error(
          `Sync returned incomplete status (count: ${result.count})`,
        );
      }
    } catch (error: any) {
      this.consecutiveFailures++;
      const durationMs = Date.now() - startTime;

      this.logger.error(
        `[Cron] ❌ Sync FAILED (Consecutive: ${this.consecutiveFailures}) — ${error?.message || error}`,
      );

      // Store failed metrics report
      const metricsReport = {
        status: 'failed',
        timestamp: new Date().toISOString(),
        durationSeconds: Number((durationMs / 1000).toFixed(1)),
        error: error?.message || String(error),
        consecutiveFailures: this.consecutiveFailures,
      };
      await this.redisService.setJson('cj:sync:last_report', metricsReport);

      // Trigger Email Notification on repeated failures
      if (this.consecutiveFailures >= 3) {
        await this.triggerAlertNotification(error?.message || String(error));
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Send notification on failure.
   */
  private async triggerAlertNotification(errorMessage: string) {
    this.logger.warn(
      `[Cron] Repeated failures detected (${this.consecutiveFailures}). Sending email alert...`,
    );
    try {
      const subject = `CRITICAL: AutoTrade CJ Sync Failure Alert`;
      const message = `The hourly catalog sync for CJ Dropshipping has failed consecutively ${this.consecutiveFailures} times.<br/><br/>
                       <strong>Last Error Message:</strong> ${errorMessage}<br/>
                       <strong>Timestamp:</strong> ${new Date().toISOString()}<br/><br/>
                       Please check the server logs and verify connection health.`;
      await this.mailService.sendSystemAlert(subject, message);
    } catch (err: any) {
      this.logger.error(
        `[Cron] Failed to send email alert: ${err?.message ?? err}`,
      );
    }
  }
}
