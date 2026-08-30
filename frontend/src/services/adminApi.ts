import type { SharedUserActivityLog } from '../types/shared';
import { apiUrl } from '../lib/api';

function getToken(): string {
  try {
    const raw = localStorage.getItem('userInfo');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.accessToken || parsed?.token) {
        return parsed.accessToken || parsed.token;
      }
    }
    return localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
  } catch {
    return localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
  }
}
function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    Authorization: `Bearer ${getToken()}`,
  };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = apiUrl(`/api/admin${path.startsWith('/') ? path : `/${path}`}`);
  const res = await fetch(url, {
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
  pendingPaymentOrders: number;
}

export interface AdminOrder {
  _id: string;
  userId: { _id: string; name?: string; email?: string; firstName?: string; lastName?: string; phone?: string } | null;
  items: {
    productId: string;
    vid?: string;
    quantity: number;

    // Product Details
    image?: string;
    productName?: string;
    price?: number;
    sku?: string;
    brand?: string;
    category?: string;

    // Variant Details
    color?: string;
    size?: string;

    // Optional
    discountPrice?: number;
  }[];
  totalAmount: number;
  currency?: string;
  status: string;
  paymentStatus: string;
  paymentProvider: string;
  paymentReference?: string;
  checkoutSessionId?: string;
  paymentIntentId?: string;
  receiptUrl?: string;
  shippingDetails?: {
    customerName?: string;
    address?: string;
    city?: string;
    province?: string;
    countryCode?: string;
    country?: string;
    zip?: string;
    phone?: string;
  };
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

export type UserActivityLog = SharedUserActivityLog;

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
  items: {
    productId: string;
    productName: string;
    productImage?: string;
    productSize?: string;
    productColor?: string;
    quantity: number;
    price?: number;
  }[];
  totalItems: number;
  totalReturnAmount: number;
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

  // Finance
  finance: {
    get: () => request<{
      totalRevenue: number;
      todayRevenue: number;
      weeklyRevenue: number;
      monthlyRevenue: number;
      totalOrders: number;
      averageOrderValue: number;
      totalGst: number;
      pendingOrders: number;
      deliveredOrders: number;
      cancelledOrders: number;
      totalRefunds: number;
    }>('GET', '/finance'),
  },

  // Analytics
  analytics: {
    get: (days?: number) => request<AnalyticsData>('GET', `/analytics${days ? `?days=${days}` : ''}`),
  },

  // Orders
  orders: {
    list: () => request<{ orders: AdminOrder[] }>('GET', '/orders'),
    getById: async (id: string) => {
      const data = await request<{ orders: AdminOrder[] }>('GET', '/orders');
      const order = data.orders?.find((o) => o._id === id);
      if (!order) throw new Error('Order not found');
      return order;
    },
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
    getUserActivityLogs: (params?: { page?: number; limit?: number; search?: string; eventTypes?: string; verificationStatus?: string }) => {
      const qs = new URLSearchParams();
      if (params?.page) qs.append('page', params.page.toString());
      if (params?.limit) qs.append('limit', params.limit.toString());
      if (params?.search) qs.append('search', params.search);
      if (params?.eventTypes) qs.append('eventTypes', params.eventTypes);
      if (params?.verificationStatus) qs.append('verificationStatus', params.verificationStatus);
      const query = qs.toString();
      return request<{ logs: UserActivityLog[]; pagination: any }>('GET', `/user-activity-logs${query ? `?${query}` : ''}`);
    },
  },

  // Settings
  settings: {
    get: () => request<{ settings: StoreSettings }>('GET', '/settings'),
    update: (data: Partial<StoreSettings>) =>
      request<{ settings: StoreSettings }>('PATCH', '/settings', data),
  },

  // Products
  products: {
    list: (page = 1, limit = 20, search = '') => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      return request<{ products: AdminProduct[]; total: number; page: number; limit: number; totalPages: number }>(
        'GET', `/products?${params.toString()}`
      );
    },
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
      const res = await fetch(apiUrl('/api/contact'), {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch contact messages');
      const contacts = (await res.json()) || [];

      try {
        const issuesRes = await request<{ issues: CustomerIssue[] }>('GET', '/issues');
        if (issuesRes && Array.isArray(issuesRes.issues)) {
          const formattedIssues = issuesRes.issues.map((i: any) => ({
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
      let res = await fetch(apiUrl(`/api/contact/${id}/status`), {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        res = await fetch(apiUrl(`/api/contact/${id}/status`), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ status }),
        });
      }
      if (!res.ok) throw new Error('Failed to update message status');
      return res.json();
    },
    reply: async (id: string, adminReply: string, status = 'resolved') => {
      let res = await fetch(apiUrl(`/api/contact/${id}/reply`), {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ adminReply, status }),
      });
      if (!res.ok) {
        res = await fetch(apiUrl(`/api/contact/${id}/reply`), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ adminReply, status }),
        });
      }
      if (!res.ok) throw new Error('Failed to save reply');
      return res.json() as Promise<ContactMessage>;
    },
  },
};
