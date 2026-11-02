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
  distanceFromPrevKm: number; // Default 100km if not specified
}

export interface TrainLine {
  id: string;
  name_line: string; // Display name, normalized for uniqueness checks
  origin: string;
  destination: string;
  num_state: number;
  list_state: string[]; // Intermediate station names in order
  segmentDistancesKm: number[]; // Length = num_state + 1 (Origin->S1, ..., Sn->Destination)
  createdAt: string;
  updatedAt: string;
}

export interface TrainSchedule {
  id: string;
  id_train: string; // e.g., TR-101
  name_train: string;
  name_line: string; // Foreign key to TrainLine.name_line
  departureTime: string; // HH:mm format e.g. "08:00"
  speed: number; // Average speed in km/h
  list_stop_time: Record<string, number>; // Stop duration in minutes for each intermediate station
  quality: QualityTier;
  cost_ticket: number;
  totalCapacity: number;
  capacity: number; // Remaining available seats
  status: 'Scheduled' | 'In-Transit' | 'Delayed' | 'Maintenance';
  createdAt: string;
}

export interface StationNodeTiming {
  stationIndex: number;
  stationName: string;
  distanceFromOriginKm: number;
  arrivalMinutes: number; // Minutes from 00:00
  departureMinutes: number; // Minutes from 00:00
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
  locationLabel: string; // Station name or Segment A -> B
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
