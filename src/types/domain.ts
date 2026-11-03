export type UserRole = 'admin' | 'staff' | 'passenger';
export type Language = 'fa' | 'en';
export type ThemeMode = 'dark' | 'light';
export type QualityTier = 'VIP 5-Star' | 'Business 4-Star' | 'Economy 3-Star';

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  lastname: string;
  email: string;
  role: 'admin';
}

export interface Employee {
  id: string;
  name: string;
  lastname: string;
  username: string;
  email: string;
  passwordHash: string;
  department: string;
  status: 'Active' | 'On-Duty' | 'Suspended';
  createdAt: string;
  linesCreated: number;
  trainsScheduled: number;
}

export interface PassengerUser {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  balance: number;
  createdAt: string;
}

export interface StationSegment {
  stationName: string;
  distanceFromPrevKm: number;
}

export interface TrainLine {
  id: string;
  name_line: string;
  origin: string;
  destination: string;
  num_state: number;
  list_state: string[];
  segmentDistancesKm: number[];
  createdAt: string;
  updatedAt: string;
}

export interface TrainSchedule {
  id: string;
  id_train: string;
  name_train: string;
  name_line: string;
  departureTime: string;
  speed: number;
  list_stop_time: Record<string, number>;
  quality: QualityTier;
  cost_ticket: number;
  totalCapacity: number;
  capacity: number;
  status: 'Scheduled' | 'In-Transit' | 'Delayed' | 'Maintenance';
  createdAt: string;
}

export interface StationNodeTiming {
  stationIndex: number;
  stationName: string;
  distanceFromOriginKm: number;
  arrivalMinutes: number;
  departureMinutes: number;
  stopMinutes: number;
  arrivalFormatted: string;
  departureFormatted: string;
}

export interface SafetyConflict {
  id: string;
  type: 'STATION_PLATFORM_OVERLAP' | 'TRACK_SEGMENT_OVERTAKE';
  severity: 'CRITICAL' | 'WARNING';
  candidateTrainId: string;
  conflictingTrainId: string;
  conflictingTrainName: string;
  lineName: string;
  locationLabel: string;
  overlapWindowFormatted: string;
  descriptionEn: string;
  descriptionFa: string;
  suggestedSafeDepartureTime: string;
}

export interface CollisionCheckResult {
  hasConflict: boolean;
  conflicts: SafetyConflict[];
  candidateTimings: StationNodeTiming[];
  suggestedSafeDeparture: string;
}

export interface TicketRecord {
  id: string;
  pnr: string;
  userId: string;
  passengerName: string;
  passengerUsername: string;
  id_train: string;
  name_train: string;
  name_line: string;
  origin: string;
  destination: string;
  departureTime: string;
  ticketCount: number;
  seatNumbers: string[];
  coachNumber: number;
  unitPrice: number;
  totalPrice: number;
  quality: QualityTier;
  status: 'Confirmed' | 'Refunded';
  purchasedAt: string;
  qrPayload: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  username: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TICKET_PURCHASE' | 'TICKET_REFUND';
  amount: number;
  runningBalance: number;
  descriptionEn: string;
  descriptionFa: string;
  referenceId?: string;
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorRole: UserRole | 'system';
  actorUsername: string;
  action: string;
  detailsEn: string;
  detailsFa: string;
}

export interface LegacyV1Snapshot {
  schemaVersion: 1;
  user_dict: Record<string, {
    username: string;
    name: string;
    email: string;
    password: string | number;
    balance?: number;
  }>;
  employee_dict: Record<string, {
    name: string;
    lastname: string;
    username: string;
    email: string;
    password: string | number;
  }>;
  line_dic: Record<string, {
    name_line: string;
    origin: string;
    destination: string;
    num_state: number;
    list_state: string[];
  }>;
  train_dic: Record<string, {
    id_train: string;
    name_train: string;
    name_line: string;
    speed: string | number;
    list_stop_time: Record<string, string | number>;
    quality: string;
    cost_ticket: string | number;
    capacity: string | number;
    departureTime?: string;
  }>;
}

export interface PlatformDatabaseV2 {
  schemaVersion: 2;
  migratedFromV1At: string;
  admin: AdminUser;
  employees: Employee[];
  passengers: PassengerUser[];
  lines: TrainLine[];
  trains: TrainSchedule[];
  tickets: TicketRecord[];
  transactions: WalletTransaction[];
  auditLogs: AuditLogEntry[];
}

export interface ActiveSession {
  role: UserRole;
  userId: string;
  username: string;
  displayName: string;
  email: string;
  sessionToken: string;
}

export interface TestCaseResult {
  id: string;
  suite: 'UNIT' | 'INTEGRATION' | 'MIGRATION' | 'E2E' | 'UI_ISOLATION';
  titleEn: string;
  titleFa: string;
  descriptionEn: string;
  descriptionFa: string;
  passed: boolean;
  durationMs: number;
  assertionsCount: number;
  logs: string[];
  errorDetails?: string;
}

export type ExecutiveAlertCategory = 'HIGH_REVENUE_BOOKING' | 'SAFETY_RADAR_CONFLICT';

export interface ExecutiveAlert {
  id: string;
  category: ExecutiveAlertCategory;
  severity: 'CRITICAL' | 'HIGH' | 'INFO';
  titleFa: string;
  titleEn: string;
  messageFa: string;
  messageEn: string;
  timestamp: string;
  read: boolean;
  amountIrr?: number;
  pnr?: string;
  trainId?: string;
  lineName?: string;
  locationLabel?: string;
  conflictType?: 'STATION_PLATFORM_OVERLAP' | 'TRACK_SEGMENT_OVERTAKE';
  overlapWindow?: string;
  suggestedSafeDeparture?: string;
}

