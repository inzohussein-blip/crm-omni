/**
 * OMNI-CRM Types
 * TypeScript definitions for the entire system
 */

// ============================================
// USER & AUTH TYPES
// ============================================

export type UserType = 'ADMIN' | 'STAFF' | 'CLIENT' | 'IB';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  userType: UserType;
  status: UserStatus;
  roleId?: string;
  role?: Role;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  level: number;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  module: string;
  action: string;
  description?: string;
}

export interface Device {
  id: string;
  userId: string;
  hardwareId: string;
  deviceName?: string;
  deviceType?: string;
  osType?: string;
  browserType?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
  lastUsedAt?: string;
  lastIP?: string;
  userAgent?: string;
  createdAt: string;
}

// ============================================
// TASK TYPES
// ============================================

export type TaskStatus = 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'PENDING_INFO' | 'ESCALATED' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskCategory = 'KYC_VERIFICATION' | 'DEPOSIT' | 'WITHDRAWAL' | 'ACCOUNT_OPENING' | 'SUPPORT' | 'COMPLAINT' | 'COMPLIANCE' | 'OTHER';
export type PlatformSource = 'WEB' | 'MOBILE_APP' | 'MT4' | 'MT5' | 'API' | 'EMAIL' | 'CHAT' | 'PHONE';

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: Priority;
  priorityScore: number;
  creatorId: string;
  creator?: Partial<User>;
  assigneeId?: string;
  assignee?: Partial<User>;
  platformSource: PlatformSource;
  sourceReference?: string;
  slaMinutes: number;
  slaDeadline?: string;
  slaBreached: boolean;
  status: TaskStatus;
  entityType?: string;
  entityId?: string;
  startedAt?: string;
  completedAt?: string;
  comments?: TaskComment[];
  _count?: { comments: number };
  createdAt: string;
  updatedAt: string;
  slaRemaining?: number;
  isOverdue?: boolean;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// TRANSACTION TYPES
// ============================================

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'INTERNAL_TRANSFER' | 'TRADE' | 'COMMISSION' | 'BONUS' | 'ADJUSTMENT' | 'FEE' | 'SWAP';
export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REJECTED';
export type WalletType = 'INTERNAL' | 'TRADING' | 'IB' | 'BONUS' | 'MARGIN';
export type WalletStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';

export interface Wallet {
  id: string;
  userId: string;
  walletType: WalletType;
  currency: string;
  balance: number;
  frozenBalance: number;
  status: WalletStatus;
  lastBalanceUpdate?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  fromWalletId?: string;
  toWalletId?: string;
  fromWallet?: Wallet;
  toWallet?: Wallet;
  type: TransactionType;
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  fromCurrency?: string;
  toCurrency?: string;
  exchangeRate?: number;
  status: TransactionStatus;
  paymentMethod?: string;
  paymentReference?: string;
  paymentProvider?: string;
  mtOrderId?: string;
  mtTicket?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  cryptoAddress?: string;
  cryptoTxHash?: string;
  cryptoNetwork?: string;
  description?: string;
  metadata?: string;
  createdAt: string;
  processedAt?: string;
}

// ============================================
// CLIENT & KYC TYPES
// ============================================

export type KYCStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type AccountType = 'STANDARD' | 'ECN' | 'ISLAMIC' | 'VIP' | 'DEMO';
export type BookingType = 'A_BOOK' | 'B_BOOK' | 'HYBRID';
export type DocumentType = 'PASSPORT' | 'NATIONAL_ID' | 'DRIVERS_LICENSE' | 'UTILITY_BILL' | 'BANK_STATEMENT' | 'SELFIE' | 'OTHER';
export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface ClientProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  nationality?: string;
  country?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  kycStatus: KYCStatus;
  kycLevel: number;
  kycSubmittedAt?: string;
  kycApprovedAt?: string;
  kycRejectedAt?: string;
  kycRejectionReason?: string;
  riskLevel: RiskLevel;
  riskScore: number;
  preferredLeverage: number;
  accountType: AccountType;
  bookingType: BookingType;
  mtAccountId?: string;
  mtGroup?: string;
  mtLeverage?: number;
  pepStatus: boolean;
  sanctionCheck: boolean;
  lastComplianceCheck?: string;
  createdAt: string;
}

export interface KYCDocument {
  id: string;
  userId: string;
  documentType: DocumentType;
  documentNumber?: string;
  frontImage: string;
  backImage?: string;
  selfieImage?: string;
  status: DocumentStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  extractedData?: string;
  issueDate?: string;
  expiryDate?: string;
  createdAt: string;
}

// ============================================
// TRADING ACCOUNT TYPES
// ============================================

export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'FROZEN' | 'CLOSED' | 'DEMO';

export interface TradingAccount {
  id: string;
  userId: string;
  mtAccountId: string;
  mtPassword: string;
  mtServer: string;
  mtGroup: string;
  accountType: AccountType;
  currency: string;
  leverage: number;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalVolume: number;
  totalProfit: number;
  totalTrades: number;
  bookingType: BookingType;
  status: AccountStatus;
  ibId?: string;
  lastSyncAt?: string;
  createdAt: string;
}

// ============================================
// IB (INTRODUCING BROKER) TYPES
// ============================================

export type IBStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
export type CommissionStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';

export interface IBProfile {
  id: string;
  userId: string;
  ibCode: string;
  ibLevel: number;
  parentIbId?: string;
  parentIb?: IBProfile;
  children?: IBProfile[];
  totalClients: number;
  activeClients: number;
  totalVolume: number;
  totalCommission: number;
  status: IBStatus;
  approvedAt?: string;
  approvedBy?: string;
  commissionPlan?: string;
  referralLinks: ReferralLink[];
  banners: Banner[];
  createdAt: string;
}

export interface IBReferral {
  id: string;
  clientId: string;
  ibId: string;
  level: number;
  status: string;
  referralLinkId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  createdAt: string;
}

export interface Commission {
  id: string;
  userId: string;
  sourceType: string;
  sourceId?: string;
  clientId?: string;
  volume: number;
  amount: number;
  currency: string;
  level: number;
  status: CommissionStatus;
  paidAt?: string;
  walletId?: string;
  createdAt: string;
}

export interface ReferralLink {
  id: string;
  ibProfileId: string;
  code: string;
  name?: string;
  totalClicks: number;
  totalSignups: number;
  totalDeposits: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Banner {
  id: string;
  ibProfileId: string;
  name: string;
  imageUrl: string;
  targetUrl: string;
  width?: number;
  height?: number;
  impressions: number;
  clicks: number;
  isActive: boolean;
  createdAt: string;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export type NotificationType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRADE' | 'KYC' | 'TASK' | 'COMMISSION' | 'SYSTEM' | 'SECURITY' | 'MARKETING';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  channels: string;
  emailSent: boolean;
  pushSent: boolean;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// ============================================
// AUDIT LOG TYPES
// ============================================

export interface AuditLog {
  id: string;
  userId?: string;
  user?: Partial<User>;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  transactionId?: string;
  commissionId?: string;
  taskId?: string;
  createdAt: string;
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface DashboardStats {
  tasks: {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    bySource: Record<string, number>;
    slaPerformance: number;
  };
  transactions: {
    total: number;
    pending: number;
    deposits: number;
    withdrawals: number;
    volume: number;
    netFlow: number;
  };
  bookAnalytics: {
    aBook: {
      accounts: number;
      volume: number;
      profit: number;
    };
    bBook: {
      accounts: number;
      volume: number;
      profit: number;
    };
    totalVolume: number;
  };
  clients: {
    total: number;
    new: number;
    active: number;
    pendingKYC: number;
  };
  ib: {
    total: number;
    active: number;
    commission: number;
  };
  meta: {
    period: string;
    dateFrom: string;
    dateTo: string;
    lastUpdated: string;
  };
}

// ============================================
// SUPPORT TICKET TYPES
// ============================================

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'WAITING_THIRD_PARTY' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'GENERAL' | 'TECHNICAL' | 'ACCOUNT' | 'DEPOSIT' | 'WITHDRAWAL' | 'TRADING' | 'COMPLIANCE' | 'COMPLAINT' | 'IB_RELATED';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  user?: Partial<User>;
  subject: string;
  category: TicketCategory;
  priority: Priority;
  assignedToId?: string;
  assignee?: Partial<User>;
  departmentId?: string;
  department?: TicketDepartment;
  status: TicketStatus;
  slaMinutes: number;
  slaDeadline?: string;
  slaBreached: boolean;
  messages?: TicketMessage[];
  rating?: number;
  feedback?: string;
  ratedAt?: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  slaRemaining?: number;
  isOverdue?: boolean;
  _count?: { messages: number };
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'client' | 'staff' | 'system';
  sender?: Partial<User>;
  content: string;
  attachments?: string[];
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDepartment {
  id: string;
  name: string;
  description?: string;
  email?: string;
  defaultSla: number;
  autoAssign: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  categoryId?: string;
  metaTitle?: string;
  metaDescription?: string;
  views: number;
  helpfulYes: number;
  helpfulNo: number;
  isPublished: boolean;
  publishedAt?: string;
  authorId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// MARKETING TYPES
// ============================================

export type CampaignType = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED' | 'FAILED';

export interface TargetAudience {
  countries?: string[];
  accountTypes?: string[];
  depositMin?: number;
  depositMax?: number;
  volumeMin?: number;
  volumeMax?: number;
  kycStatus?: string[];
  registrationDateFrom?: string;
  registrationDateTo?: string;
  lastActivityDays?: number;
  vipOnly?: boolean;
  hasTraded?: boolean;
  excludeUnsubscribed?: boolean;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  type: CampaignType;
  subject?: string;
  content: string;
  htmlContent?: string;
  templateId?: string;
  targetAudience: TargetAudience;
  segmentId?: string;
  scheduledAt?: string;
  sentAt?: string;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  unsubscribeCount: number;
  abTestId?: string;
  abVariant?: string;
  status: CampaignStatus;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  stats?: CampaignStatistics;
}

export interface CampaignStatistics {
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  unsubscribeCount: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
}

export interface SegmentCriteria {
  countries?: string[];
  nationalities?: string[];
  languages?: string[];
  accountTypes?: string[];
  bookingTypes?: string[];
  depositMin?: number;
  depositMax?: number;
  withdrawalMin?: number;
  withdrawalMax?: number;
  balanceMin?: number;
  balanceMax?: number;
  equityMin?: number;
  equityMax?: number;
  volumeMin?: number;
  volumeMax?: number;
  tradesMin?: number;
  tradesMax?: number;
  profitMin?: number;
  profitMax?: number;
  registrationDateFrom?: string;
  registrationDateTo?: string;
  lastLoginDays?: number;
  lastTradeDays?: number;
  lastDepositDays?: number;
  kycStatus?: string[];
  riskLevel?: string[];
  vipOnly?: boolean;
  hasTraded?: boolean;
  hasDeposited?: boolean;
  hasWithdrawn?: boolean;
  isPep?: boolean;
  averageDepositMin?: number;
  averageDepositMax?: number;
  depositFrequency?: 'daily' | 'weekly' | 'monthly' | 'rarely';
  customFilters?: CustomFilter[];
}

export interface CustomFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains';
  value: string | number | string[] | number[];
}

export interface MarketingSegment {
  id: string;
  name: string;
  description?: string;
  criteria: SegmentCriteria;
  memberCount: number;
  lastCalculated?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  members?: SegmentMember[];
  stats?: SegmentStats;
}

export interface SegmentMember {
  userId: string;
  email: string;
  name: string;
  country?: string;
  accountType?: string;
  totalDeposits: number;
  totalVolume: number;
  totalTrades: number;
  lastActivity?: string;
}

export interface SegmentStats {
  memberCount: number;
  totalDeposits: number;
  totalVolume: number;
  avgDeposit: number;
  topCountries: { country: string; count: number }[];
  accountTypeDistribution: { type: string; count: number }[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ABTestResult {
  testId: string;
  variants: {
    variant: string;
    campaignId: string;
    sentCount: number;
    openCount: number;
    clickCount: number;
    openRate: number;
    clickRate: number;
  }[];
  winner: string | null;
  confidence: number;
}

// ============================================
// CALENDAR & EVENT TYPES
// ============================================

export type EventType = 'MEETING' | 'CALL' | 'REMINDER' | 'DEADLINE' | 'TRAINING' | 'MARKETING' | 'COMPLIANCE' | 'OTHER';
export type EventResponseStatus = 'pending' | 'accepted' | 'declined' | 'tentative';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  type: EventType;
  color: string;
  startAt: Date | string;
  endAt?: Date | string | null;
  isAllDay: boolean;
  timezone: string;
  isRecurring: boolean;
  recurrenceRule?: string | null;
  organizerId: string;
  organizer?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
  attendees?: EventAttendee[];
  reminders?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  googleEventId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface EventAttendee {
  eventId: string;
  userId: string;
  responseStatus: EventResponseStatus;
  user?: Partial<User>;
}

export interface RecurrenceRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  count?: number;
  until?: Date | string;
  byDay?: number[];
  byMonthDay?: number[];
  byMonth?: number[];
}

export interface EventReminder {
  minutes: number;
  type: 'email' | 'push' | 'both';
}

export interface CalendarView {
  type: 'month' | 'week' | 'day' | 'agenda';
  date: Date;
  events: CalendarEvent[];
}

export interface CalendarStats {
  total: number;
  byType: Record<string, number>;
  upcoming: number;
  thisWeek: number;
  thisMonth: number;
}

// ============================================
// DISPUTE MANAGEMENT TYPES
// ============================================

export type DisputeStatus = 'OPEN' | 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
export type DisputeCategory = 'DEPOSIT' | 'WITHDRAWAL' | 'TRADING' | 'ACCOUNT' | 'COMPLIANCE' | 'IB_COMMISSION' | 'OTHER';

export interface Dispute {
  id: string;
  caseNumber: string;
  clientId: string;
  client?: Partial<User>;
  againstType: string; // broker, staff, ib
  againstId?: string;
  againstEntity?: Partial<User>;
  title: string;
  description: string;
  category: DisputeCategory;
  amount?: number;
  currency?: string;
  evidence?: EvidenceItem[];
  status: DisputeStatus;
  resolution?: string;
  resolutionType?: string; // refund, compensation, rejected, resolved, partial_refund
  resolvedAt?: string;
  resolvedById?: string;
  resolver?: Partial<User>;
  messages?: DisputeMessage[];
  resolutionTime?: number; // in hours
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderType: 'client' | 'staff' | 'system';
  sender?: Partial<User>;
  content: string;
  attachments?: string[];
  isInternal: boolean;
  createdAt: string;
}

export interface EvidenceItem {
  id: string;
  type: 'document' | 'image' | 'video' | 'screenshot' | 'email' | 'chat_log' | 'transaction_record' | 'other';
  name: string;
  url: string;
  description?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface DisputeStats {
  total: number;
  open: number;
  inReview: number;
  escalated: number;
  resolved: number;
  closed: number;
  totalAmount: number;
  avgResolutionTime: number;
  byCategory: Record<string, number>;
  byAgainstType: Record<string, number>;
}

// ============================================
// ACTIVITY TIMELINE TYPES
// ============================================

export type ActivityAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'VIEW'
  | 'EXPORT'
  | 'IMPORT'
  | 'ASSIGN'
  | 'TRANSFER'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRADE'
  | 'KYC_SUBMIT'
  | 'KYC_APPROVE'
  | 'KYC_REJECT'
  | 'TASK_CREATE'
  | 'TASK_ASSIGN'
  | 'TASK_COMPLETE'
  | 'TICKET_CREATE'
  | 'TICKET_REPLY'
  | 'TICKET_CLOSE'
  | 'COMMISSION_EARN'
  | 'BONUS_AWARD'
  | 'SETTING_CHANGE'
  | 'PASSWORD_CHANGE'
  | 'DEVICE_APPROVE'
  | 'ALERT_TRIGGER'
  | 'CAMPAIGN_SEND'
  | 'DOCUMENT_UPLOAD'
  | 'NOTE_ADD'
  | 'STATUS_CHANGE'
  | 'PRIORITY_CHANGE'
  | 'ESCALATE'
  | 'SYSTEM';

export type ActivityEntityType =
  | 'user'
  | 'client'
  | 'transaction'
  | 'task'
  | 'ticket'
  | 'dispute'
  | 'kyc_document'
  | 'trading_account'
  | 'wallet'
  | 'commission'
  | 'bonus'
  | 'campaign'
  | 'ib_profile'
  | 'referral'
  | 'calendar_event'
  | 'notification'
  | 'device'
  | 'compliance_check'
  | 'audit_log'
  | 'system';

export interface ActivityLog {
  id: string;
  userId?: string | null;
  userName?: string | null;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string | null;
  title: string;
  description?: string | null;
  metadata?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  isPublic: boolean;
  createdAt: string;
}

export interface ActivityStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
  recentActivities: ActivityLog[];
}

export interface ActivityFilter {
  userId?: string;
  entityType?: ActivityEntityType;
  entityId?: string;
  action?: ActivityAction;
  dateFrom?: Date;
  dateTo?: Date;
  isPublic?: boolean;
  search?: string;
}

export interface ActivityAggregation {
  date: string;
  count: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
}

// ============================================
// I18N / LOCALIZATION TYPES
// ============================================

export interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isRtl: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Translation {
  id: string;
  languageCode: string;
  namespace: string;
  key: string;
  value: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TranslationKey {
  namespace: string;
  key: string;
  value: string;
}

export interface TranslationsByNamespace {
  [namespace: string]: {
    [key: string]: string;
  };
}

export interface LanguageStats {
  code: string;
  name: string;
  totalTranslations: number;
  namespaces: string[];
  completionPercentage: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
