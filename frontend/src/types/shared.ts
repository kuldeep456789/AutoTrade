export interface SharedUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

export interface SharedUserActivityLog {
  _id: string;
  userId?: string | SharedUser;
  email: string;
  userName?: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  status: 'success' | 'failed' | 'pending';
  failureReason?: string;
  verificationStatus: string;
  registrationStatus: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
