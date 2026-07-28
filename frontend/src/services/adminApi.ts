
const BASE = '/api/admin';
function getToken(): string {
  try {
    const raw = localStorage.getItem('userInfo');
    if (!raw) return '';
    return JSON.parse(raw)?.accessToken ?? '';
  } catch {
    return '';
  }
}
function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err?.message ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  pendingReturns: number;
  totalRevenue: number;
}

export interface AdminOrder {
  _id: string;
  userId: { _id: string; name?: string; email?: string; firstName?: string; lastName?: string } | null;
  items: { productId: string; quantity: number }[];
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentProvider: string;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
  gender?: string;
  createdAt: string;
}

export interface AdminProduct {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  stock: number;
  isActive: boolean;
  category: { name: string } | null;
  images: string[];
}

export interface CustomerIssue {
  _id: string;
  userId: { _id: string; name?: string; email?: string; firstName?: string; lastName?: string } | null;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
}

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'pending' | 'resolved';
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
}

export interface AdminReturn {
  _id: string;
  userId: { _id: string; name?: string; email?: string } | null;
  orderId: string;
  // productId: string;
  productName: string;
  productImage?: string;
  reason: string;
  description?: string;
  status: string;
  refundAmount?: number;
  adminRemarks?: string;
  createdAt: string;
}

export interface Coupon {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  targetRole: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  _id: string;
  action: string;
  description: string;
  userId?: string;
  createdAt: string;
}

export interface StoreSettings {
  _id?: string;
  storeName: string;
  storeEmail: string;
  currency: string;
  heroBannerImages: string[];
  // maintenanceMode: boolean;
  freeShippingThreshold: number;
  socialLinks: Record<string, string>;
  logoUrl?: string;
  faviconUrl?: string;
  gstRate?: number;
  commissionRate?: number;
  gatewayFeePercent?: number;
  gatewayFixedFee?: number;
  settlementCycleDays?: number;
}

export interface AnalyticsData {
  revenueByDay: { _id: string; revenue: number; count: number }[];
  ordersByStatus: { _id: string; count: number }[];
  topCustomers: { _id: string; totalSpent: number; orderCount: number; user?: AdminUser }[];
  monthlyRevenue: { _id: string; revenue: number }[];
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const adminApi = {
  // Dashboard
  dashboard: {
    getStats: () =>
      request<{ stats: DashboardStats; recentOrders: AdminOrder[] }>('GET', '/dashboard'),
  },

  // Search
  search: (query: string) =>
    request<{ users: AdminUser[]; orders: AdminOrder[] }>('GET', `/search?q=${encodeURIComponent(query)}`),

  // Analytics
  analytics: {
    get: (days?: number) => request<AnalyticsData>('GET', `/analytics${days ? `?days=${days}` : ''}`),
  },

  // Orders
  orders: {
    list: () => request<{ orders: AdminOrder[] }>('GET', '/orders'),
    updateStatus: (id: string, status: string) =>
      request<{ message: string; order: AdminOrder }>('PATCH', `/orders/${id}/status`, { status }),
  },

  // Users
  users: {
    list: () => request<{ users: AdminUser[] }>('GET', '/users'),
    delete: (id: string) =>
      request<{ message: string }>('DELETE', `/users/${id}`),
  },

  // Returns
  returns: {
    list: () => request<{ returns: AdminReturn[] }>('GET', '/returns'),
    updateStatus: (id: string, status: string, adminRemarks?: string, refundAmount?: number) =>
      request<{ message: string }>('PATCH', `/returns/${id}/status`, { status, adminRemarks, refundAmount }),
  },

  // Coupons
  coupons: {
    list: () => request<{ coupons: Coupon[] }>('GET', '/coupons'),
    create: (dto: Omit<Coupon, '_id' | 'usedCount' | 'createdAt'>) =>
      request<{ coupon: Coupon }>('POST', '/coupons', dto),
    toggle: (id: string, isActive: boolean) =>
      request<{ coupon: Coupon }>('PATCH', `/coupons/${id}`, { isActive }),
    delete: (id: string) => request<{ message: string }>('DELETE', `/coupons/${id}`),
  },

  // Notifications
  notifications: {
    list: () => request<{ notifications: Notification[] }>('GET', '/notifications'),
    create: (dto: Pick<Notification, 'title' | 'message' | 'type' | 'targetRole'>) =>
      request<{ notification: Notification }>('POST', '/notifications', dto),
    markRead: (id: string) =>
      request<{ notification: Notification }>('PATCH', `/notifications/${id}/read`),
  },

  // Activity Logs
  activityLogs: {
    list: () => request<{ logs: ActivityLog[] }>('GET', '/activity-logs'),
  },

  // Settings
  settings: {
    get: () => request<{ settings: StoreSettings }>('GET', '/settings'),
    update: (data: Partial<StoreSettings>) =>
      request<{ settings: StoreSettings }>('PATCH', '/settings', data),
  },

  // Products
  products: {
    list: () => request<{ products: AdminProduct[] }>('GET', '/products'),
    delete: (id: string) => request<{ message: string }>('DELETE', `/products/${id}`),
  },

  // Issues
  issues: {
    list: () => request<{ issues: CustomerIssue[] }>('GET', '/issues'),
    updateStatus: (id: string, status: string) =>
      request<{ message: string; issue: CustomerIssue }>('PATCH', `/issues/${id}/status`, { status }),
  },

  // Contact Messages
  messages: {
    list: async () => {
      const res = await fetch('/api/contact');
      if (!res.ok) throw new Error('Failed to fetch contact messages');
      const contacts = (await res.json()) || [];

      try {
        const issuesRes = await request<CustomerIssue[]>('GET', '/issues');
        if (Array.isArray(issuesRes)) {
          const formattedIssues = issuesRes.map((i: any) => ({
            _id: i._id,
            name: i.user?.name || i.user?.email || 'Customer',
            email: i.user?.email || 'customer@example.com',
            subject: `[Issue] ${i.subject || i.issueType || 'Order Support'}`,
            message: i.description || i.message || '',
            status: i.status || 'pending',
            adminReply: i.adminReply,
            createdAt: i.createdAt,
            repliedAt: i.updatedAt,
          }));
          return [...contacts, ...formattedIssues];
        }
      } catch { }

      return contacts as ContactMessage[];
    },
    updateStatus: async (id: string, status: string) => {
      let res = await fetch(`/api/contact/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        res = await fetch(`/api/contact/${id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
      }
      if (!res.ok) throw new Error('Failed to update message status');
      return res.json();
    },
    reply: async (id: string, adminReply: string, status = 'resolved') => {
      let res = await fetch(`/api/contact/${id}/reply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminReply, status }),
      });
      if (!res.ok) {
        res = await fetch(`/api/contact/${id}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminReply, status }),
        });
      }
      if (!res.ok) throw new Error('Failed to save reply');
      return res.json() as Promise<ContactMessage>;
    },
  },
};
