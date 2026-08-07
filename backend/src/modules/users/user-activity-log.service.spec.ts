import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UserActivityLogService } from './user-activity-log.service';
import { UserActivityLog, EventType, VerificationStatus, RegistrationStatus } from './schemas/user-activity-log.schema';

describe('UserActivityLogService', () => {
  let service: UserActivityLogService;
  let mockModel: any;

  beforeEach(async () => {
    mockModel = {
      save: jest.fn(),
      find: jest.fn().mockReturnValue({ lean: jest.fn() }),
      exists: jest.fn(),
      updateOne: jest.fn(),
    };

    // Need to use a constructor function for new this.logModel()
    const mockModelFn = function (dto: any) {
      this.userId = dto.userId;
      this.userName = dto.userName;
      this.email = dto.email;
      this.eventType = dto.eventType;
      this.verificationStatus = dto.verificationStatus;
      this.registrationStatus = dto.registrationStatus;
      this.save = mockModel.save;
    };
    
    mockModelFn.find = mockModel.find;
    mockModelFn.exists = mockModel.exists;
    mockModelFn.updateOne = mockModel.updateOne;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserActivityLogService,
        {
          provide: getModelToken(UserActivityLog.name),
          useValue: mockModelFn,
        },
      ],
    }).compile();

    service = module.get<UserActivityLogService>(UserActivityLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logEvent', () => {
    it('should successfully save a log event', async () => {
      mockModel.save.mockResolvedValueOnce({});
      
      await service.logEvent({
        email: 'test@example.com',
        eventType: EventType.LOGIN_SUCCESS,
      });

      expect(mockModel.save).toHaveBeenCalled();
    });

    it('should handle errors silently and log them', async () => {
      mockModel.save.mockRejectedValueOnce(new Error('DB Error'));
      const loggerSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});

      await service.logEvent({
        email: 'test@example.com',
        eventType: EventType.LOGIN_SUCCESS,
      });

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to log user activity event: login_success for test@example.com'),
        expect.any(String)
      );
    });
  });

  describe('markAbandonedRegistrations', () => {
    it('should do nothing if there are no started logs', async () => {
      mockModel.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValueOnce([]) });
      
      await service.markAbandonedRegistrations();
      
      expect(mockModel.exists).not.toHaveBeenCalled();
      expect(mockModel.updateOne).not.toHaveBeenCalled();
    });

    it('should mark logs as abandoned if no account was created', async () => {
      const mockStartedLog = {
        _id: 'log123',
        email: 'test@example.com',
        userName: 'Test User',
        createdAt: new Date('2023-01-01'),
      };
      
      mockModel.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValueOnce([mockStartedLog]) });
      mockModel.exists.mockResolvedValueOnce(false); // No account created
      mockModel.save.mockResolvedValue({}); // For the logEvent call inside
      
      const logEventSpy = jest.spyOn(service, 'logEvent').mockResolvedValueOnce(undefined);

      await service.markAbandonedRegistrations();

      expect(mockModel.exists).toHaveBeenCalledWith({
        email: 'test@example.com',
        eventType: EventType.ACCOUNT_CREATED,
        createdAt: { $gt: mockStartedLog.createdAt },
      });

      expect(logEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: EventType.REGISTRATION_ABANDONED,
          email: 'test@example.com',
        })
      );

      expect(mockModel.updateOne).toHaveBeenCalledWith(
        { _id: 'log123' },
        { $set: { registrationStatus: RegistrationStatus.ABANDONED } }
      );
    });

    it('should mark logs as completed if an account was created later', async () => {
      const mockStartedLog = {
        _id: 'log123',
        email: 'test@example.com',
        createdAt: new Date('2023-01-01'),
      };
      
      mockModel.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValueOnce([mockStartedLog]) });
      mockModel.exists.mockResolvedValueOnce(true); // Account was created
      
      const logEventSpy = jest.spyOn(service, 'logEvent');

      await service.markAbandonedRegistrations();

      expect(logEventSpy).not.toHaveBeenCalled();
      
      expect(mockModel.updateOne).toHaveBeenCalledWith(
        { _id: 'log123' },
        { $set: { registrationStatus: RegistrationStatus.COMPLETED } }
      );
    });
  });
});
