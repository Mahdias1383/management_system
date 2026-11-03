import { describe, it, expect } from 'vitest';
import {
  toEnglishDigits,
  toPersianDigits,
  normalizeIdentifier,
  hashPassword,
  verifyPassword,
  isValidEmail,
  evaluatePasswordStrength,
  isAuthorizedForRole,
  parsePositiveNumber,
  parsePositiveInteger,
  formatTime,
  localizeRole,
  localizeAuditAction,
  classifyAuditActionCategory,
  parseAuditDateBoundary,
  filterAuditLogs,
  generateComplianceAuditCsv,
  computeAuditBulkSelectionState,
  toggleSelectAllAuditLogs,
  toggleSingleAuditLogSelection,
  resolveAuditLogsForCsvExport,
  issueSessionToken,
} from '../authService';
import { purchaseTrainTicket, refundTrainTicket } from '../bookingEngine';
import { getDefaultLegacyV1Snapshot, migrateV1ToV2 } from '../storageAndMigration';
import { ActiveSession } from '../../types/domain';

describe('authService Core Utilities', () => {
  describe('toEnglishDigits & toPersianDigits', () => {
    it('converts Persian and Arabic digits to ASCII digits', () => {
      expect(toEnglishDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
      expect(toEnglishDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
      expect(toEnglishDigits('RP-۸۹۴۱۲')).toBe('RP-89412');
    });

    it('converts ASCII digits to Persian digits when lang is fa', () => {
      expect(toPersianDigits('12345', 'fa')).toBe('۱۲۳۴۵');
      expect(toPersianDigits('TR-101', 'fa')).toBe('TR-۱۰۱');
    });

    it('converts to ASCII digits when lang is en', () => {
      expect(toPersianDigits('۱۲۳۴۵', 'en')).toBe('12345');
    });

    it('handles null and undefined gracefully', () => {
      expect(toEnglishDigits(null)).toBe('');
      expect(toEnglishDigits(undefined)).toBe('');
      expect(toPersianDigits(null)).toBe('');
      expect(toPersianDigits(undefined)).toBe('');
    });
  });

  describe('normalizeIdentifier', () => {
    it('trims whitespace and converts to lowercase', () => {
      expect(normalizeIdentifier('  Admin.Chief  ')).toBe('admin.chief');
      expect(normalizeIdentifier('TR-101')).toBe('tr-101');
      expect(normalizeIdentifier('User@Example.COM')).toBe('user@example.com');
    });

    it('handles null and undefined safely', () => {
      expect(normalizeIdentifier(null)).toBe('');
      expect(normalizeIdentifier(undefined)).toBe('');
    });
  });

  describe('hashPassword & verifyPassword', () => {
    it('hashes passwords deterministically with rp_sha256$ prefix', () => {
      const hash1 = hashPassword('Admin@123');
      const hash2 = hashPassword('Admin@123');
      expect(hash1).toBe(hash2);
      expect(hash1.startsWith('rp_sha256$')).toBe(true);
    });

    it('correctly verifies matching plaintext and hashed passwords', () => {
      const plain = 'SecretPassword456';
      const hash = hashPassword(plain);
      expect(verifyPassword(plain, hash)).toBe(true);
      expect(verifyPassword('WrongPassword', hash)).toBe(false);
    });

    it('supports backward compatibility with raw plaintext hashes', () => {
      expect(verifyPassword('legacyPass', 'legacyPass')).toBe(true);
      expect(verifyPassword('legacyPass', 'differentPass')).toBe(false);
    });

    it('fails verification on empty stored hash', () => {
      expect(verifyPassword('any', '')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('accepts valid RFC email formats', () => {
      expect(isValidEmail('sara.ahmadi@example.com')).toBe(true);
      expect(isValidEmail('admin_123@railpulse.ir')).toBe(true);
      expect(isValidEmail('user.name+tag@sub.domain.org')).toBe(true);
    });

    it('rejects invalid email formats', () => {
      expect(isValidEmail('plainaddress')).toBe(false);
      expect(isValidEmail('@missinguser.com')).toBe(false);
      expect(isValidEmail('missingdomain@')).toBe(false);
      expect(isValidEmail('user@nodot')).toBe(false);
      expect(isValidEmail('   ')).toBe(false);
    });
  });

  describe('evaluatePasswordStrength', () => {
    it('scores empty passwords as 0', () => {
      expect(evaluatePasswordStrength('').score).toBe(0);
    });

    it('evaluates complexity across length and character diversity', () => {
      const weak = evaluatePasswordStrength('12345');
      expect(weak.score).toBeLessThanOrEqual(2);

      const strong = evaluatePasswordStrength('RailPulse#2026!');
      expect(strong.score).toBeGreaterThanOrEqual(3);
    });
  });

  describe('isAuthorizedForRole', () => {
    const validSession: ActiveSession = {
      userId: 'usr_1',
      username: 'passenger1',
      role: 'passenger',
      sessionToken: 'rptok_abc123',
      displayName: 'Passenger One',
      email: 'passenger1@example.com',
    };

    it('authorizes user when role is in allowed list', () => {
      const res = isAuthorizedForRole(validSession, ['passenger']);
      expect(res.authorized).toBe(true);
    });

    it('denies access when role is not in allowed list', () => {
      const res = isAuthorizedForRole(validSession, ['admin', 'staff']);
      expect(res.authorized).toBe(false);
      expect(res.reasonEn).toContain('Access Denied');
    });

    it('denies access when session is missing or unauthenticated', () => {
      expect(isAuthorizedForRole(null, ['passenger']).authorized).toBe(false);
      expect(isAuthorizedForRole(undefined, ['passenger']).authorized).toBe(false);
    });
  });

  describe('parsePositiveNumber & parsePositiveInteger', () => {
    it('parses valid positive numbers and converts Persian digits', () => {
      const res1 = parsePositiveNumber('450.5');
      expect(res1.valid).toBe(true);
      expect(res1.value).toBe(450.5);

      const res2 = parsePositiveNumber('۴۵۰');
      expect(res2.valid).toBe(true);
      expect(res2.value).toBe(450);
    });

    it('falls back on negative, non-numeric, or invalid input', () => {
      const resNeg = parsePositiveNumber('-50');
      expect(resNeg.valid).toBe(false);
      expect(resNeg.value).toBe(0);

      const resInvalid = parsePositiveNumber('invalid');
      expect(resInvalid.valid).toBe(false);
      expect(resInvalid.value).toBe(0);

      const resNull = parsePositiveNumber(null);
      expect(resNull.valid).toBe(false);
      expect(resNull.value).toBe(0);
    });

    it('validates positive integers and rejects decimals', () => {
      const resInt = parsePositiveInteger('14');
      expect(resInt.valid).toBe(true);
      expect(resInt.value).toBe(14);

      const resDecimal = parsePositiveInteger('14.7');
      expect(resDecimal.valid).toBe(false);
      expect(resDecimal.value).toBe(0);

      const resZero = parsePositiveInteger('۰');
      expect(resZero.valid).toBe(false);
      expect(resZero.value).toBe(0);
    });
  });

  describe('localizeRole & formatTime', () => {
    it('localizes user roles into English and Persian', () => {
      expect(localizeRole('admin', 'en')).toBe('System Admin');
      expect(localizeRole('admin', 'fa')).toBe('مدیر کل سازمان');
      expect(localizeRole('staff', 'en')).toBe('Operations Staff');
      expect(localizeRole('staff', 'fa')).toBe('کارشناس عملیات');
      expect(localizeRole('passenger', 'en')).toBe('Passenger');
      expect(localizeRole('passenger', 'fa')).toBe('مسافر');
    });

    it('formats time with Persian digits for fa locale', () => {
      expect(formatTime('08:30', 'fa')).toBe('۰۸:۳۰');
      expect(formatTime('08:30', 'en')).toBe('08:30');
    });
  });

  describe('issueSessionToken', () => {
    it('creates unique signed token prefix', () => {
      const token = issueSessionToken('usr_test', 'passenger');
      expect(token.startsWith('rptok_')).toBe(true);
      expect(token.length).toBeGreaterThan(10);
    });
  });

  describe('Automated Activity Monitor & Audit Log Tracking', () => {
    it('localizes critical audit action codes into Persian and English', () => {
      expect(localizeAuditAction('TICKET_BOOKED', 'fa')).toBe('صدور و رزرو بلیط مسافر');
      expect(localizeAuditAction('UPDATE_TRAIN_SCHEDULE', 'fa')).toBe('ویرایش زمانبندی قطار');
      expect(localizeAuditAction('TICKET_BOOKED', 'en')).toBe('TICKET_BOOKED');
    });

    it('automatically records TICKET_BOOKED and TICKET_REFUNDED audit log entries with entity metadata', () => {
      const db = migrateV1ToV2(getDefaultLegacyV1Snapshot());
      const passenger = db.passengers[0];
      const train = db.trains[0];
      const initialLogCount = db.auditLogs.length;

      const bookRes = purchaseTrainTicket(db, passenger.id, train.id_train, 1, ['4A'], 1);
      expect(bookRes.success).toBe(true);
      expect(bookRes.db.auditLogs.length).toBe(initialLogCount + 1);
      expect(bookRes.db.auditLogs[0].action).toBe('TICKET_BOOKED');
      expect(bookRes.db.auditLogs[0].entityType).toBe('TICKET');
      expect(bookRes.db.auditLogs[0].entityId).toBe(bookRes.ticket?.pnr);

      const refundRes = refundTrainTicket(bookRes.db, passenger.id, bookRes.ticket!.id);
      expect(refundRes.success).toBe(true);
      expect(refundRes.db.auditLogs.length).toBe(initialLogCount + 2);
      expect(refundRes.db.auditLogs[0].action).toBe('TICKET_REFUNDED');
      expect(refundRes.db.auditLogs[0].entityType).toBe('TICKET');
      expect(refundRes.db.auditLogs[0].entityId).toBe(bookRes.ticket?.pnr);
    });

    it('generates an RFC 4180 compliant, UTF-8 BOM prefixed CSV string for compliance reporting', () => {
      expect(classifyAuditActionCategory('TICKET_BOOKED')).toBe('RESERVATIONS');
      expect(classifyAuditActionCategory('UPDATE_TRAIN_SCHEDULE')).toBe('SCHEDULES');
      expect(classifyAuditActionCategory('PROVISION_OPERATIONS_STAFF')).toBe('STAFF');

      const db = migrateV1ToV2(getDefaultLegacyV1Snapshot());
      const csv = generateComplianceAuditCsv(db.auditLogs);

      expect(csv.startsWith('\uFEFFEvent ID,Timestamp (ISO-8601),Actor Role,Actor Username,Compliance Category')).toBe(true);
      expect(csv).toContain('"TICKET_BOOKED"');
      expect(csv).toContain('"UPDATE_TRAIN_SCHEDULE"');
      expect(csv).toContain('"RP-90234"');
    });

    it('filters audit logs by keyword, Persian digits, date-range boundaries, and time-window presets', () => {
      const db = migrateV1ToV2(getDefaultLegacyV1Snapshot());
      const logs = db.auditLogs;

      // 1. Keyword search across English PNR and Persian numerals
      const byPnrEn = filterAuditLogs(logs, { keyword: 'RP-90234' });
      expect(byPnrEn.length).toBe(1);
      expect(byPnrEn[0].id).toBe('aud_seed_5');

      const byPnrFa = filterAuditLogs(logs, { keyword: '۹۰۲۳۴' });
      expect(byPnrFa.length).toBe(1);
      expect(byPnrFa[0].id).toBe('aud_seed_5');

      // 2. Date-range boundaries (inclusive start-of-day and end-of-day)
      const startMs = parseAuditDateBoundary('2026-10-21', 'start');
      const endMs = parseAuditDateBoundary('2026-10-23', 'end');
      expect(startMs).toBe(Date.parse('2026-10-21T00:00:00.000Z'));
      expect(endMs).toBe(Date.parse('2026-10-23T23:59:59.999Z'));

      const inDateRange = filterAuditLogs(logs, {
        startDate: '2026-10-21',
        endDate: '2026-10-23',
      });
      // Seed logs in 2026-10-21..2026-10-23 are aud_seed_5 (Oct 23), aud_seed_4 (Oct 22), aud_seed_3 (Oct 21)
      expect(inDateRange.map((l) => l.id)).toEqual([
        'aud_seed_5',
        'aud_seed_4',
        'aud_seed_3',
      ]);

      // 3. Combined date-range + category + keyword filter
      const combined = filterAuditLogs(logs, {
        startDate: '2026-10-21',
        endDate: '2026-10-24',
        category: 'SCHEDULES',
        keyword: 'TR-102',
      });
      expect(combined.length).toBe(1);
      expect(combined[0].id).toBe('aud_seed_6');

      // 4. Time-window preset (e.g., 7D relative to a deterministic referenceTimeMs)
      const refMs = Date.parse('2026-10-25T00:00:00.000Z');
      const last7Days = filterAuditLogs(logs, {
        timeWindowPreset: '7D',
        referenceTimeMs: refMs,
      });
      // Oct 18 to Oct 25 includes Oct 20, 21, 22, 23, 24 (5 logs)
      expect(last7Days.length).toBe(5);

      // 5. Inverted date range (startDate > endDate) returns empty list cleanly
      const inverted = filterAuditLogs(logs, {
        startDate: '2026-10-25',
        endDate: '2026-10-20',
      });
      expect(inverted.length).toBe(0);
    });

    it('supports select-all toggling, indeterminate state calculation, and bulk-selected CSV export', () => {
      const db = migrateV1ToV2(getDefaultLegacyV1Snapshot());
      const visibleLogs = db.auditLogs.slice(0, 4);

      // Initially 0 selected
      const initial = computeAuditBulkSelectionState(visibleLogs, []);
      expect(initial.selectedVisibleCount).toBe(0);
      expect(initial.isAllVisibleSelected).toBe(false);
      expect(initial.isIndeterminate).toBe(false);

      // Select all visible logs
      const allSelectedIds = toggleSelectAllAuditLogs(visibleLogs, []);
      expect(allSelectedIds).toEqual(visibleLogs.map((l) => l.id));

      const fullState = computeAuditBulkSelectionState(visibleLogs, allSelectedIds);
      expect(fullState.selectedVisibleCount).toBe(4);
      expect(fullState.isAllVisibleSelected).toBe(true);
      expect(fullState.isIndeterminate).toBe(false);

      // Toggle off a single row -> becomes indeterminate
      const partialIds = toggleSingleAuditLogSelection(visibleLogs[1].id, allSelectedIds);
      expect(partialIds.length).toBe(3);
      const partialState = computeAuditBulkSelectionState(visibleLogs, partialIds);
      expect(partialState.selectedVisibleCount).toBe(3);
      expect(partialState.isAllVisibleSelected).toBe(false);
      expect(partialState.isIndeterminate).toBe(true);

      // Clicking select-all while indeterminate selects all visible rows again
      const reselectedAll = toggleSelectAllAuditLogs(visibleLogs, partialIds);
      expect(reselectedAll.length).toBe(4);
      expect(
        computeAuditBulkSelectionState(visibleLogs, reselectedAll).isAllVisibleSelected
      ).toBe(true);

      // Clicking select-all when all are selected deselects all visible rows
      const deselectedAll = toggleSelectAllAuditLogs(visibleLogs, reselectedAll);
      expect(deselectedAll).toEqual([]);

      // CSV export resolution for SELECTED scope exports only the chosen entries
      const twoSelected = [visibleLogs[0].id, visibleLogs[2].id];
      const resolvedSelected = resolveAuditLogsForCsvExport(
        db.auditLogs,
        visibleLogs,
        twoSelected,
        'SELECTED'
      );
      expect(resolvedSelected.map((l) => l.id)).toEqual(twoSelected);

      const csvSelected = generateComplianceAuditCsv(resolvedSelected);
      expect(csvSelected).toContain(`"${visibleLogs[0].id}"`);
      expect(csvSelected).toContain(`"${visibleLogs[2].id}"`);
      expect(csvSelected).not.toContain(`"${visibleLogs[1].id}"`);
    });
  });
});


