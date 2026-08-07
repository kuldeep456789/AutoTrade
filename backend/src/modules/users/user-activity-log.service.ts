import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserActivityLog, UserActivityLogDocument, EventType, VerificationStatus, RegistrationStatus } from './schemas/user-activity-log.schema';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface LogEventParams {
  userId?: string | Types.ObjectId;
  userName?: string;
  email: string;
  eventType: EventType;
  verificationStatus?: VerificationStatus;
  registrationStatus?: RegistrationStatus;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class UserActivityLogService {
  private readonly logger = new Logger(UserActivityLogService.name);

  constructor(
    @InjectModel(UserActivityLog.name) private readonly logModel: Model<UserActivityLogDocument>,
  ) {}

  async logEvent(params: LogEventParams): Promise<void> {
    try {
      const updateData = {
        userId: params.userId ? new Types.ObjectId(params.userId) : null,
        userName: params.userName,
        email: params.email,
        eventType: params.eventType,
        verificationStatus: params.verificationStatus ?? VerificationStatus.NA,
        registrationStatus: params.registrationStatus ?? RegistrationStatus.COMPLETED,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata || {},
      };
      
      const newLog = new this.logModel(updateData);
      await newLog.save();
    } catch (error: any) {
      this.logger.error(`Failed to log user activity event: ${params.eventType} for ${params.email}`, error?.stack || error);
    }
  }

  // Cron job to run every 15 minutes to flag abandoned registrations
  @Cron('0 */15 * * * *')
  async markAbandonedRegistrations() {
    try {
      const ttlMs = 24 * 60 * 60 * 1000; // 24 hours TTL for verification
      const cutoffDate = new Date(Date.now() - ttlMs);

      // Find 'registration_started' events older than 24 hours
      // that are still 'in_progress'
      const startedLogs = await this.logModel.find({
        eventType: EventType.REGISTRATION_STARTED,
        registrationStatus: RegistrationStatus.IN_PROGRESS,
        createdAt: { $lte: cutoffDate },
      }).lean();

      if (!startedLogs.length) return;

      for (const log of startedLogs) {
        // Check if there is an 'account_created' event for this email after the started log
        const hasCompleted = await this.logModel.exists({
          email: log.email,
          eventType: EventType.ACCOUNT_CREATED,
          createdAt: { $gt: log.createdAt },
        });

        if (!hasCompleted) {
          // Log an abandoned event
          await this.logEvent({
            email: log.email,
            userName: log.userName,
            eventType: EventType.REGISTRATION_ABANDONED,
            verificationStatus: VerificationStatus.EXPIRED,
            registrationStatus: RegistrationStatus.ABANDONED,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            metadata: { originalLogId: log._id },
          });

          // Mark the original log as abandoned so we don't process it again
          await this.logModel.updateOne(
            { _id: log._id },
            { $set: { registrationStatus: RegistrationStatus.ABANDONED } }
          );
        } else {
           // If completed, update the old log so we don't process again
           await this.logModel.updateOne(
            { _id: log._id },
            { $set: { registrationStatus: RegistrationStatus.COMPLETED } }
          );
        }
      }
    } catch (error: any) {
      this.logger.error('Error in markAbandonedRegistrations cron job', error?.stack || error);
    }
  }
}
