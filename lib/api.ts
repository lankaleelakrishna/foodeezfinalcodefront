import axios from 'axios';
import { topProgress } from './progress';

const TOKEN_KEY = 'restaurant_onboarding_token';

const defaultApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: defaultApiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  }
  topProgress.start();
  return config;
});
api.interceptors.response.use(
  (res)  => { topProgress.done(); return res; },
  (err)  => { topProgress.done(); return Promise.reject(err); },
);

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

// ── Customer axios instance (separate token) ───────────────────────────────────

export const CUSTOMER_TOKEN_KEY = 'customer_auth_token';

export const customerApi = axios.create({
  baseURL: defaultApiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

customerApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(CUSTOMER_TOKEN_KEY);
    if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  }
  topProgress.start();
  return config;
});
customerApi.interceptors.response.use(
  (res) => { topProgress.done(); return res; },
  (err) => { topProgress.done(); return Promise.reject(err); },
);

export const setCustomerAuthToken = (token: string | null) => {
  if (token) {
    customerApi.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete customerApi.defaults.headers.common.Authorization;
  }
};

export type PaymentType = 'SUBSCRIPTION' | 'ONBOARDING' | 'COMMISSION';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'UPI' | 'CARD' | 'NET_BANKING' | 'CASH' | 'OTHER';

export type CreatePaymentPayload = {
  restaurantId: string;
  amount: number;
  currency?: string;
  type: PaymentType;
  status?: PaymentStatus;
  transactionId?: string;
  paymentMethod?: PaymentMethod;
  description?: string;
  paidAt?: string;
};

export const paymentApi = {
  create: (data: CreatePaymentPayload) =>
    api.post('/payment-analysis', data),
  list: (page = 1, limit = 20) =>
    api.get(`/payment-analysis?page=${page}&limit=${limit}`),
  summary: () =>
    api.get('/payment-analysis/summary'),
  daily: (year: number, month: number) =>
    api.get(`/payment-analysis/daily?year=${year}&month=${month}`),
  weekly: (year: number, quarter?: number) =>
    api.get(`/payment-analysis/weekly?year=${year}${quarter ? `&quarter=${quarter}` : ''}`),
  monthly: (year: number) =>
    api.get(`/payment-analysis/monthly?year=${year}`),
  quarterly: (year: number) =>
    api.get(`/payment-analysis/quarterly?year=${year}`),
};

// ── Delivery Types ─────────────────────────────────────────────────────────────

export type DeliveryStatus =
  | 'ASSIGNED' | 'ACCEPTED' | 'PICKED_UP' | 'ON_THE_WAY'
  | 'ARRIVED' | 'DELIVERED' | 'CANCELLED';

export type AssignmentType = 'AUTO' | 'MANUAL';

export type DeliveryPartnerStatus =
  | 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export type VehicleType =
  | 'BICYCLE' | 'MOTORCYCLE' | 'CAR' | 'SCOOTER' | 'ELECTRIC_SCOOTER';

export type SupportTicketType = 'SOS' | 'COMPLAINT' | 'QUERY' | 'INCIDENT';
export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
export type PayoutType = 'DELIVERY_FEE' | 'INCENTIVE' | 'BONUS' | 'PENALTY';

// ── Delivery Partners API ──────────────────────────────────────────────────────

export type CreateDeliveryPartnerPayload = {
  name: string;
  email: string;
  phone: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  vehicleModel?: string;
  licenseNumber: string;
  aadharNumber?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  bankName?: string;
  city?: string;
  state?: string;
  profilePhoto?: string;
};

export const deliveryPartnersApi = {
  list: (page = 1, limit = 20, status?: string) =>
    api.get(`/delivery-partners?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`),
  get: (id: string) =>
    api.get(`/delivery-partners/${id}`),
  create: (data: CreateDeliveryPartnerPayload) =>
    api.post('/delivery-partners', data),
  update: (id: string, data: Partial<CreateDeliveryPartnerPayload>) =>
    api.patch(`/delivery-partners/${id}`, data),
  updateStatus: (id: string, status: DeliveryPartnerStatus) =>
    api.patch(`/delivery-partners/${id}/status`, { status }),
  toggleOnline: (id: string, isOnline: boolean) =>
    api.patch(`/delivery-partners/${id}/online-status`, { isOnline }),
  rate: (id: string, rating: number, comment?: string) =>
    api.post(`/delivery-partners/${id}/rate`, { rating, comment }),
  earnings: (id: string) =>
    api.get(`/delivery-partners/${id}/earnings`),
  delete: (id: string) =>
    api.delete(`/delivery-partners/${id}`),
};

// ── Delivery Assignments API ───────────────────────────────────────────────────

export type AutoAssignPayload = {
  orderId: string;
  restaurantId: string;
  branchId?: string;
  restaurantLatitude: number;
  restaurantLongitude: number;
  customerLatitude: number;
  customerLongitude: number;
  customerAddress?: string;
  deliveryFee?: number;
};

export type ManualAssignPayload = {
  orderId: string;
  partnerId: string;
  restaurantId: string;
  branchId?: string;
  restaurantLatitude?: number;
  restaurantLongitude?: number;
  customerLatitude?: number;
  customerLongitude?: number;
  customerAddress?: string;
  deliveryFee?: number;
};

export const deliveryAssignmentsApi = {
  autoAssign: (data: AutoAssignPayload) =>
    api.post('/delivery-assignments/assign', data),
  manualAssign: (data: ManualAssignPayload) =>
    api.post('/delivery-assignments/manual', data),
  pending: () =>
    api.get('/delivery-assignments/pending'),
  get: (id: string) =>
    api.get(`/delivery-assignments/${id}`),
  byOrder: (orderId: string) =>
    api.get(`/delivery-assignments/order/${orderId}`),
  byPartner: (partnerId: string, page = 1, limit = 20) =>
    api.get(`/delivery-assignments/partner/${partnerId}?page=${page}&limit=${limit}`),
  updateStatus: (id: string, status: DeliveryStatus, cancellationReason?: string) =>
    api.patch(`/delivery-assignments/${id}/status`, { status, cancellationReason }),
  reassign: (id: string, partnerId: string, reason?: string) =>
    api.patch(`/delivery-assignments/${id}/reassign`, { partnerId, reason }),
};

// ── Delivery Tracking API ──────────────────────────────────────────────────────

export const deliveryTrackingApi = {
  updateLocation: (data: {
    partnerId: string; latitude: number; longitude: number;
    speed?: number; heading?: number; accuracy?: number;
    assignmentId?: string; orderId?: string;
  }) => api.post('/delivery-tracking/location', data),
  byOrder: (orderId: string) =>
    api.get(`/delivery-tracking/order/${orderId}`),
  byRider: (riderId: string) =>
    api.get(`/delivery-tracking/rider/${riderId}`),
  riderHistory: (riderId: string, assignmentId?: string) =>
    api.get(`/delivery-tracking/rider/${riderId}/history${assignmentId ? `?assignmentId=${assignmentId}` : ''}`),
  activeRiders: () =>
    api.get('/delivery-tracking/active-riders'),
};

// ── Delivery Support API ───────────────────────────────────────────────────────

export const deliverySupportApi = {
  createSos: (data: {
    partnerId: string; latitude: number; longitude: number;
    assignmentId?: string; description?: string;
  }) => api.post('/delivery-support/sos', data),
  createTicket: (data: {
    partnerId?: string; assignmentId?: string; orderId?: string;
    ticketType: SupportTicketType; priority?: SupportTicketPriority;
    title: string; description: string;
  }) => api.post('/delivery-support/ticket', data),
  listTickets: (page = 1, limit = 20, status?: string, type?: string) =>
    api.get(`/delivery-support/tickets?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}${type ? `&type=${type}` : ''}`),
  sosAlerts: () =>
    api.get('/delivery-support/tickets/sos'),
  getTicket: (id: string) =>
    api.get(`/delivery-support/tickets/${id}`),
  ticketsByPartner: (partnerId: string, page = 1, limit = 20) =>
    api.get(`/delivery-support/tickets/partner/${partnerId}?page=${page}&limit=${limit}`),
  updateTicket: (id: string, data: { status?: SupportTicketStatus; priority?: SupportTicketPriority; adminNotes?: string }) =>
    api.patch(`/delivery-support/tickets/${id}`, data),
};

// ── Delivery Payouts API ───────────────────────────────────────────────────────

export const deliveryPayoutsApi = {
  create: (data: {
    partnerId: string; amount: number; payoutType: PayoutType;
    assignmentId?: string; description?: string;
    periodStart?: string; periodEnd?: string;
  }) => api.post('/delivery-payouts', data),
  list: (page = 1, limit = 20, status?: string) =>
    api.get(`/delivery-payouts?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`),
  byRider: (partnerId: string, page = 1, limit = 20) =>
    api.get(`/delivery-payouts/rider/${partnerId}?page=${page}&limit=${limit}`),
  process: (id: string) =>
    api.patch(`/delivery-payouts/${id}/process`),
  bulkProcess: (partnerId?: string) =>
    api.post(`/delivery-payouts/process/bulk${partnerId ? `?partnerId=${partnerId}` : ''}`),
};

// ── Delivery Analytics API ─────────────────────────────────────────────────────

export const deliveryAnalyticsApi = {
  overview: (from?: string, to?: string) =>
    api.get(`/delivery-analytics/overview${from ? `?from=${from}${to ? `&to=${to}` : ''}` : ''}`),
  riders: (page = 1, limit = 20) =>
    api.get(`/delivery-analytics/riders?page=${page}&limit=${limit}`),
  orders: (from?: string, to?: string) =>
    api.get(`/delivery-analytics/orders${from ? `?from=${from}${to ? `&to=${to}` : ''}` : ''}`),
  earnings: (from?: string, to?: string) =>
    api.get(`/delivery-analytics/earnings${from ? `?from=${from}${to ? `&to=${to}` : ''}` : ''}`),
};

// ── Restaurants API ────────────────────────────────────────────────────────────

export const restaurantsApi = {
  list: () => api.get('/restaurants'),
  get: (id: string) => api.get(`/restaurants/${id}`),
  create: (data: Record<string, any>) => api.post('/restaurants', data),
  update: (id: string, data: Record<string, any>) => api.patch(`/restaurants/${id}`, data),
  onboarding: (id: string) => api.get(`/restaurants/${id}/onboarding`),
  advanceOnboarding: (id: string) => api.patch(`/restaurants/${id}/onboarding-step`),
  users: (id: string) => api.get(`/restaurants/${id}/users`),
  createUser: (id: string, data: { displayName: string; email: string; role: string; password?: string }) =>
    api.post(`/restaurants/${id}/users`, data),
};

// ── Branches API ───────────────────────────────────────────────────────────────

export const branchesApi = {
  list: (restaurantId: string) =>
    api.get(`/restaurants/${restaurantId}/branches`),
  get: (restaurantId: string, branchId: string) =>
    api.get(`/restaurants/${restaurantId}/branches/${branchId}`),
  create: (restaurantId: string, data: Record<string, any>) =>
    api.post(`/restaurants/${restaurantId}/branches`, data),
  update: (restaurantId: string, branchId: string, data: Record<string, any>) =>
    api.patch(`/restaurants/${restaurantId}/branches/${branchId}`, data),
};

// ── Menu API ───────────────────────────────────────────────────────────────────

export type MenuPricingRuleType = 'DISCOUNT' | 'PRICE_OVERRIDE' | 'TIME_BASED';
export type MenuPricingValueType = 'PERCENTAGE' | 'FLAT';

export const menuApi = {
  // Categories
  listCategories: (branchId: string) =>
    api.get(`/branches/${branchId}/menu-categories`),
  createCategory: (branchId: string, data: { name: string; displayName: string }) =>
    api.post(`/branches/${branchId}/menu-categories`, data),
  updateCategory: (categoryId: string, data: { name?: string; displayName?: string }) =>
    api.patch(`/menu-categories/${categoryId}`, data),

  // Items
  listItems: (branchId: string) =>
    api.get(`/branches/${branchId}/menu-items`),
  createItem: (branchId: string, data: Record<string, any>) =>
    api.post(`/branches/${branchId}/menu-items`, data),
  updateItem: (itemId: string, data: Record<string, any>) =>
    api.patch(`/menu-items/${itemId}`, data),
  createDiscount: (itemId: string, data: {
    valueType: MenuPricingValueType;
    value: number;
    title?: string;
    startsAt?: string;
    endsAt?: string;
  }) => api.post(`/menu-items/${itemId}/discounts`, data),

  // Addons
  listAddons: (itemId: string) =>
    api.get(`/menu-items/${itemId}/addons`),
  createAddon: (itemId: string, data: {
    name: string; description?: string; price: number; currency?: string;
    isRequired: boolean; minSelections: number; maxSelections: number;
    sortOrder?: number; isVisible?: boolean;
  }) => api.post(`/menu-items/${itemId}/addons`, data),
  updateAddon: (addonId: string, data: Record<string, any>) =>
    api.patch(`/menu-addons/${addonId}`, data),

  // Pricing Rules
  listPricingRules: (itemId: string) =>
    api.get(`/menu-items/${itemId}/pricing-rules`),
  createPricingRule: (itemId: string, data: {
    ruleType: MenuPricingRuleType; valueType: MenuPricingValueType;
    value: number; title?: string; startsAt?: string; endsAt?: string;
  }) => api.post(`/menu-items/${itemId}/pricing-rules`, data),
  updatePricingRule: (ruleId: string, data: Record<string, any>) =>
    api.patch(`/menu-pricing-rules/${ruleId}`, data),

  // Bulk upload & AI scan
  bulkUpload: (branchId: string, data: { categories: any[] }) =>
    api.post(`/branches/${branchId}/menu-bulk-upload`, data),
  scan: (branchId: string, data: { imageBase64: string; mimeType?: string }) =>
    api.post(`/branches/${branchId}/menu-scan`, data),
};

// ── Menu Change Requests API ───────────────────────────────────────────────────

export const menuChangeRequestsApi = {
  create: (itemId: string, data: { changes: Record<string, any>; description: string }) =>
    api.post(`/menu-items/${itemId}/change-requests`, data),
  list: () =>
    api.get('/menu-item-change-requests'),
  approve: (requestId: string, reviewNote?: string) =>
    api.post(`/menu-item-change-requests/${requestId}/approve`, { reviewNote }),
  reject: (requestId: string, reviewNote?: string) =>
    api.post(`/menu-item-change-requests/${requestId}/reject`, { reviewNote }),
};

// ── Auth / Users API ───────────────────────────────────────────────────────────

export const authApi = {
  me: () => api.get('/auth/me'),
  listUsers: () => api.get('/auth/users'),
  createUser: (data: { displayName: string; email: string; role: string; restaurantId?: string }) =>
    api.post('/auth/users', data),
};

// ── Documents API ──────────────────────────────────────────────────────────────

export type DocumentType = 'FSSAI' | 'GST' | 'BANK';

// Backend supports: verified | pending | rejected
// PATCH /restaurants/:restaurantId/documents/:documentId  →  { status, reason? }
export type DocumentStatus = 'verified' | 'pending' | 'rejected';

export const documentsApi = {
  // ── Restaurant-scoped ────────────────────────────────────────────────────────

  // GET  /restaurants/:restaurantId/documents
  // Roles: RestaurantAdmin, SalesOperator, SuperAdmin
  list: (restaurantId: string) =>
    api.get(`/restaurants/${restaurantId}/documents`),

  // POST /restaurants/:restaurantId/documents
  upload: (restaurantId: string, data: { type: DocumentType; s3Key: string; filename: string }) =>
    api.post(`/restaurants/${restaurantId}/documents`, data),

  // PATCH /restaurants/:restaurantId/documents/:documentId
  // Roles: SuperAdmin, SalesOperator
  // status: 'verified' | 'pending' | 'rejected'  (reason required when rejecting)
  updateStatus: (restaurantId: string, documentId: string, status: DocumentStatus, reason?: string) =>
    api.patch(`/restaurants/${restaurantId}/documents/${documentId}`, {
      status,
      ...(reason ? { reason } : {}),
    }),

  // ── Admin endpoints ──────────────────────────────────────────────────────────

  // GET  /admin/documents          – all documents (SuperAdmin)
  listAllForAdmin: () =>
    api.get('/admin/documents'),

  // GET  /admin/documents/restaurant/:restaurantId  (SuperAdmin, SalesOperator)
  listForRestaurantAdmin: (restaurantId: string) =>
    api.get(`/admin/documents/restaurant/${restaurantId}`),

  // GET  /admin/documents/:documentId/preview  (SuperAdmin, SalesOperator)
  // Returns binary blob (image/PDF) OR JSON { url: "signed-s3-url" }
  adminPreview: (documentId: string) =>
    api.get(`/admin/documents/${documentId}/preview`, { responseType: 'blob' }),

  // Kept for backward-compat (direct browser URL if ever needed)
  adminPreviewUrl: (documentId: string) =>
    `${(api.defaults.baseURL ?? '').replace(/\/$/, '')}/admin/documents/${documentId}/preview`,
};

// ── Customer Auth API ──────────────────────────────────────────────────────────

export type OtpPurpose = 'SIGNUP' | 'LOGIN' | 'RESET_PASSWORD';

export type SendOtpPayload =
  | { email: string; phone?: never; purpose: 'SIGNUP' | 'LOGIN' }
  | { phone: string; email?: never; purpose: 'RESET_PASSWORD' };

export type CustomerSignupPayload = {
  email: string;
  phone: string;
  otp: string;
  name?: string;
  referralCode?: string;
  deviceId?: string;
  deviceName?: string;
};

export type CustomerLoginPayload = {
  email: string;
  otp: string;
  deviceId?: string;
  deviceName?: string;
  deviceOs?: string;
  appVersion?: string;
};

export type RefreshTokenPayload = {
  refreshToken: string;
  deviceId: string;
};

export type ResetPasswordPayload = {
  phone: string;
  otp: string;
  newPassword: string;
};

export const customerAuthApi = {
  // Public — no token required
  sendOtp: (data: SendOtpPayload) =>
    api.post('/customer/auth/send-otp', data),
  signup: (data: CustomerSignupPayload) =>
    api.post('/customer/auth/signup', data),
  login: (data: CustomerLoginPayload) =>
    api.post('/customer/auth/login', data),
  refresh: (data: RefreshTokenPayload) =>
    api.post('/customer/auth/refresh', data),
  resetPassword: (data: ResetPasswordPayload) =>
    api.post('/customer/auth/reset-password', data),
  // Guarded — requires customer JWT
  logout: (deviceId?: string) =>
    customerApi.post('/customer/auth/logout', { deviceId: deviceId ?? 'default' }),
  logoutAll: () =>
    customerApi.post('/customer/auth/logout-all'),
  getSessions: () =>
    customerApi.get('/customer/auth/sessions'),
  revokeSession: (deviceId: string) =>
    customerApi.delete(`/customer/auth/sessions/${deviceId}`),
};

// ── Customer Discovery API ─────────────────────────────────────────────────────

export type NearbyParams = {
  lat: number; lng: number; radius?: number; page?: number; limit?: number;
  cuisine?: string; minRating?: number; maxDeliveryTime?: number;
  isVeg?: boolean; sortBy?: string;
};

// Discovery endpoints are customer-facing (public or customer-JWT).
// Using customerApi ensures the partner JWT is never sent here —
// the backend was returning empty when it received a partner token.
export const customerDiscoveryApi = {
  nearby: (params: NearbyParams) =>
    customerApi.get('/customer/discovery/nearby', { params }),
  search: (q: string, lat: number, lng: number, page = 1, limit = 20) =>
    customerApi.get('/customer/discovery/search', { params: { q, lat, lng, page, limit } }),
  trending: (lat: number, lng: number) =>
    customerApi.get('/customer/discovery/trending', { params: { lat, lng } }),
  popularDishes: (lat: number, lng: number) =>
    customerApi.get('/customer/discovery/popular-dishes', { params: { lat, lng } }),
  restaurantDetails: (branchId: string) =>
    customerApi.get(`/customer/discovery/restaurants/${branchId}`),
  menu: (branchId: string) =>
    customerApi.get(`/customer/discovery/restaurants/${branchId}/menu`),
};

// ── Customer Cart API ──────────────────────────────────────────────────────────

export type AddToCartPayload = {
  menuItemId: string;
  branchId?: string;
  quantity: number;
  selectedAddons?: { addonId: string; quantity: number }[];
  specialNote?: string;
};

export const customerCartApi = {
  get: () =>
    customerApi.get('/customer/cart'),
  addItem: (data: AddToCartPayload) =>
    customerApi.post('/customer/cart/items', data),
  updateItem: (itemId: string, quantity: number) =>
    customerApi.patch(`/customer/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId: string) =>
    customerApi.delete(`/customer/cart/items/${itemId}`),
  clear: () =>
    customerApi.delete('/customer/cart'),
  applyCoupon: (couponCode: string) =>
    customerApi.post('/customer/cart/coupon', { couponCode }),
  removeCoupon: () =>
    customerApi.delete('/customer/cart/coupon'),
};

// ── Customer Orders API ────────────────────────────────────────────────────────

export type PlaceOrderPayload = {
  deliveryAddressId: string;
  paymentMethod: 'COD' | 'CARD' | 'WALLET' | 'UPI' | 'NET_BANKING';
  specialInstructions?: string;
  useWalletBalance?: boolean;
  scheduledFor?: string;
};

export type CancelOrderPayload = { reason: string };

export const customerOrdersApi = {
  place: (data: PlaceOrderPayload) =>
    customerApi.post('/customer/orders', data),
  history: (page = 1, limit = 10) =>
    customerApi.get('/customer/orders', { params: { page, limit } }),
  get: (orderId: string) =>
    customerApi.get(`/customer/orders/${orderId}`),
  cancel: (orderId: string, data: CancelOrderPayload) =>
    customerApi.post(`/customer/orders/${orderId}/cancel`, data),
  reorder: (orderId: string) =>
    customerApi.post(`/customer/orders/${orderId}/reorder`),
  tracking: (orderId: string) =>
    customerApi.get(`/customer/orders/${orderId}/tracking`),
  invoice: (orderId: string) =>
    customerApi.get(`/customer/orders/${orderId}/invoice`),
};

// ── Customer Payments API ──────────────────────────────────────────────────────

export type PaymentGateway = 'razorpay' | 'stripe';

export const customerPaymentsApi = {
  initiatePayment: (orderId: string, gateway: PaymentGateway) =>
    customerApi.post('/customer/payments/initiate', { orderId, gateway }),
  verifyPayment: (data: { orderId: string; paymentId: string; signature: string; gateway: PaymentGateway }) =>
    customerApi.post('/customer/payments/verify', data),
  wallet: () =>
    customerApi.get('/customer/payments/wallet'),
  transactions: (page = 1, limit = 20) =>
    customerApi.get('/customer/payments/wallet/transactions', { params: { page, limit } }),
  topupInitiate: (amount: number, gateway: PaymentGateway) =>
    customerApi.post('/customer/payments/wallet/topup/initiate', { amount, gateway }),
};

// ── Customer Profile API ───────────────────────────────────────────────────────

export type UpdateProfilePayload = {
  name?: string; email?: string; dateOfBirth?: string;
  gender?: 'M' | 'F' | 'O'; fcmToken?: string;
};

export type CreateAddressPayload = {
  label: string; addressLine1: string; addressLine2?: string;
  city: string; state: string; pincode: string; landmark?: string;
  latitude: number; longitude: number; isDefault?: boolean;
};

export const customerProfileApi = {
  get: () =>
    customerApi.get('/customer/profile'),
  update: (data: UpdateProfilePayload) =>
    customerApi.patch('/customer/profile', data),
  updateImage: (imageKey: string) =>
    customerApi.patch('/customer/profile/image', { imageKey }),
  // Addresses
  getAddresses: () =>
    customerApi.get('/customer/profile/addresses'),
  addAddress: (data: CreateAddressPayload) =>
    customerApi.post('/customer/profile/addresses', data),
  updateAddress: (id: string, data: Partial<CreateAddressPayload>) =>
    customerApi.patch(`/customer/profile/addresses/${id}`, data),
  deleteAddress: (id: string) =>
    customerApi.delete(`/customer/profile/addresses/${id}`),
  setDefaultAddress: (id: string) =>
    customerApi.patch(`/customer/profile/addresses/${id}/set-default`),
  // Favorites
  getFavRestaurants: () =>
    customerApi.get('/customer/profile/favorites/restaurants'),
  addFavRestaurant: (restaurantId: string) =>
    customerApi.post(`/customer/profile/favorites/restaurants/${restaurantId}`),
  removeFavRestaurant: (restaurantId: string) =>
    customerApi.delete(`/customer/profile/favorites/restaurants/${restaurantId}`),
  getFavItems: () =>
    customerApi.get('/customer/profile/favorites/items'),
  addFavItem: (menuItemId: string, restaurantId: string) =>
    customerApi.post(`/customer/profile/favorites/items/${menuItemId}`, { restaurantId }),
  removeFavItem: (menuItemId: string) =>
    customerApi.delete(`/customer/profile/favorites/items/${menuItemId}`),
};

// ── Customer Reviews API ───────────────────────────────────────────────────────

export type CreateReviewPayload = {
  orderId: string; restaurantRating: number; deliveryRating?: number;
  foodRating?: number; reviewText?: string; imageUrls?: string[]; isAnonymous?: boolean;
};

export const customerReviewsApi = {
  create: (data: CreateReviewPayload) =>
    customerApi.post('/customer/reviews', data),
  byRestaurant: (restaurantId: string, page = 1, limit = 10) =>
    api.get(`/customer/reviews/restaurant/${restaurantId}`, { params: { page, limit } }),
  markHelpful: (reviewId: string) =>
    customerApi.post(`/customer/reviews/${reviewId}/helpful`),
};

// ── Customer Support API ───────────────────────────────────────────────────────

export type CustomerTicketType =
  | 'MISSING_ITEM'
  | 'WRONG_ORDER'
  | 'DELIVERY_ISSUE'
  | 'PAYMENT_ISSUE'
  | 'REFUND_REQUEST'
  | 'FOOD_QUALITY'
  | 'OTHER';
export type CustomerTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type CreateSupportTicketPayload = {
  orderId?: string;
  type: CustomerTicketType;
  description: string;
  priority?: CustomerTicketPriority;
};

export const customerSupportApi = {
  createTicket: (data: CreateSupportTicketPayload) =>
    customerApi.post('/customer/support/tickets', data),
  getTickets: (page = 1, limit = 10) =>
    customerApi.get('/customer/support/tickets', { params: { page, limit } }),
  getTicket: (ticketId: string) =>
    customerApi.get(`/customer/support/tickets/${ticketId}`),
};

// ── Admin Customers API ───────────────────────────────────────────────────────

export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BANNED';
export type CustomerTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export type AdminCustomerTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type AdminTicketType =
  | 'MISSING_ITEM' | 'WRONG_ORDER' | 'DELIVERY_ISSUE'
  | 'PAYMENT_ISSUE' | 'REFUND_REQUEST' | 'FOOD_QUALITY' | 'OTHER';
export type AdminTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const adminCustomersApi = {
  list: (page = 1, limit = 20, params: Record<string, string> = {}) =>
    api.get('/admin/customers', { params: { page, limit, ...params } }),
  stats: () => api.get('/admin/customers/stats'),
  get: (customerId: string) =>
    api.get(`/admin/customers/${customerId}`),
  updateStatus: (customerId: string, status: CustomerStatus) =>
    api.patch(`/admin/customers/${customerId}/status`, { status }),
  getOrders: (customerId: string, page = 1, limit = 10, status?: string) =>
    api.get(`/admin/customers/${customerId}/orders`, { params: { page, limit, ...(status ? { status } : {}) } }),
  getTickets: (customerId: string, page = 1, limit = 10, status?: string) =>
    api.get(`/admin/customers/${customerId}/tickets`, { params: { page, limit, ...(status ? { status } : {}) } }),
};

// ── Admin Orders API ───────────────────────────────────────────────────────────

export const adminOrdersApi = {
  list: (page = 1, limit = 20, params: Record<string, string> = {}) =>
    api.get('/admin/orders', { params: { page, limit, ...params } }),
  get: (orderId: string) =>
    api.get(`/admin/orders/${orderId}`),
};

export const restaurantOrdersApi = {
  list: (page = 1, limit = 20, params: Record<string, string> = {}) =>
    api.get('/restaurant/orders', { params: { page, limit, ...params } }),
  get: (orderId: string) =>
    api.get(`/restaurant/orders/${orderId}`),
};

// ── Admin Tickets API ──────────────────────────────────────────────────────────

export const adminTicketsApi = {
  list: (page = 1, limit = 20, params: Record<string, string> = {}) =>
    api.get('/admin/tickets', { params: { page, limit, ...params } }),
  get: (ticketId: string) =>
    api.get(`/admin/tickets/${ticketId}`),
  update: (ticketId: string, data: { status?: AdminCustomerTicketStatus; priority?: AdminTicketPriority; adminNote?: string }) =>
    api.patch(`/admin/tickets/${ticketId}`, data),
};