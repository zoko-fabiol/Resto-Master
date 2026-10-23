export type PlatformRole =
  | 'platform_owner'
  | 'platform_admin'
  | 'support'
  | 'billing'
  | 'viewer';

export interface PlatformAdmin {
  uid: string;
  email: string;
  name: string;
  role: PlatformRole;
  active: boolean;
  mfaEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAuditLog {
  id: string;
  timestamp: string;
  actorUid: string;
  actorEmail: string;
  actorRole: PlatformRole;
  targetOrgId?: string;
  action: string;
  detail: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  reason: string;
  ticketNumber?: string;
  ipAddress?: string;
  userAgent?: string;
  prevHash?: string;
  sha256Hash: string; // Empreinte cryptographique chaînée
}

export interface SupportSession {
  id: string;
  adminUid: string;
  adminEmail: string;
  orgId: string;
  reason: string;
  mode: 'read_only' | 'read_write';
  secondApproverUid?: string;
  startedAt: string;
  expiresAt: string;
  closedAt?: string;
  actionsPerformed: string[];
  active: boolean;
}

export interface TenantSignupRequest {
  id: string;
  companyName: string;
  legalForm?: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  applicantName: string;
  desiredPlanId: string;
  estimatedTables?: number;
  initialPassword?: string;
  restaurantCode?: string;
  status: 'en_attente' | 'approuvee' | 'rejetee';
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  resultingOrgId?: string;
}
