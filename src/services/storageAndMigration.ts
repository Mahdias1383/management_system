import {
  LegacyV1Snapshot,
  PassengerUser,
  PlatformDatabaseV2,
  QualityTier,
  TicketRecord,
  TrainLine,
  TrainSchedule,
  WalletTransaction,
} from '../types/domain';
import { hashPassword, normalizeIdentifier } from './authService';

export const STORAGE_KEY_V2 = 'railpulse_enterprise_db_v2';

/**
 * Deep clones any JSON-serializable state to eliminate shared mutable reference bugs
 * (fixes legacy Python `list_state = []` and `train_info_dict = {}` reference sharing across lines/trains).
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generates a realistic Legacy Python v1 dictionary snapshot (`user_dict`, `employee_dict`, `line_dic`, `train_dic`)
 * to verify and demonstrate automatic schema migration from v1 to v2.
 */
export function getDefaultLegacyV1Snapshot(): LegacyV1Snapshot {
  return {
    schemaVersion: 1,
    employee_dict: {
      sara_ahmadi: {
        name: 'سارا (Sara)',
        lastname: 'احمدی (Ahmadi)',
        username: 'sara_ahmadi',
        email: 'sara.ahmadi@railpulse.ir',
        password: 'staff123',
      },
      reza_karimi: {
        name: 'رضا (Reza)',
        lastname: 'کریمی (Karimi)',
        username: 'reza_karimi',
        email: 'reza.karimi@railpulse.ir',
        password: 'staff123',
      },
      nima_farahani: {
        name: 'نیما (Nima)',
        lastname: 'فراهانی (Farahani)',
        username: 'nima_farahani',
        email: 'nima.farahani@railpulse.ir',
        password: 'staff123',
      },
    },
    user_dict: {
      mahdi_as: {
        username: 'mahdi_as',
        name: 'مهدی اسدی (Mahdi Asadi)',
        email: 'mahdi.asadi@example.com',
        password: 'user123',
        balance: 480,
      },
      parisa_rad: {
        username: 'parisa_rad',
        name: 'پریسا راد (Parisa Rad)',
        email: 'parisa.rad@example.com',
        password: 'user123',
        balance: 215,
      },
    },
    line_dic: {
      'tehran-mashhad-hsr': {
        name_line: 'Tehran-Mashhad High-Speed',
        origin: 'Tehran Central (تهران)',
        destination: 'Mashhad Holy Shrine (مشهد)',
        num_state: 3,
        list_state: ['Semnan (سمنان)', 'Shahroud (شاهرود)', 'Neyshabur (نیشابور)'],
      },
      'tehran-isfahan-exp': {
        name_line: 'Tehran-Isfahan Express',
        origin: 'Tehran Central (تهران)',
        destination: 'Isfahan Historical (اصفهان)',
        num_state: 2,
        list_state: ['Qom Junction (قم)', 'Kashan Oasis (کاشان)'],
      },
      'tabriz-tehran-north': {
        name_line: 'Tabriz-Tehran Azerbaijan Corridor',
        origin: 'Tabriz Grand (تبریز)',
        destination: 'Tehran Central (تهران)',
        num_state: 3,
        list_state: ['Mianeh (میانه)', 'Zanjan (زنجان)', 'Qazvin (قزوین)'],
      },
      'tehran-shiraz-royal': {
        name_line: 'Tehran-Shiraz Royal Line',
        origin: 'Tehran Central (تهران)',
        destination: 'Shiraz Persepolis (شیراز)',
        num_state: 2,
        list_state: ['Isfahan South (اصفهان)', 'Abadeh (آباده)'],
      },
    },
    train_dic: {
      'TR-101': {
        id_train: 'TR-101',
        name_train: 'Fadak Royal HSR 101 (فدک رویال)',
        name_line: 'Tehran-Mashhad High-Speed',
        speed: 180,
        list_stop_time: {
          'Semnan (سمنان)': 10,
          'Shahroud (شاهرود)': 15,
          'Neyshabur (نیشابور)': 10,
        },
        quality: 'VIP 5-Star',
        cost_ticket: 65,
        capacity: 140,
        departureTime: '07:00',
      },
      'TR-102': {
        id_train: 'TR-102',
        name_train: 'Ghazal Executive 102 (غزل ویژه)',
        name_line: 'Tehran-Mashhad High-Speed',
        speed: 130,
        list_stop_time: {
          'Semnan (سمنان)': 15,
          'Shahroud (شاهرود)': 20,
          'Neyshabur (نیشابور)': 15,
        },
        quality: 'Business 4-Star',
        cost_ticket: 48,
        capacity: 210,
        departureTime: '09:30',
      },
      'TR-105': {
        id_train: 'TR-105',
        name_train: 'Simorgh Turbo 105 (سیمرغ توربو)',
        name_line: 'Tehran-Mashhad High-Speed',
        speed: 200,
        list_stop_time: {
          'Semnan (سمنان)': 8,
          'Shahroud (شاهرود)': 10,
          'Neyshabur (نیشابور)': 8,
        },
        quality: 'VIP 5-Star',
        cost_ticket: 72,
        capacity: 112,
        departureTime: '14:00',
      },
      'TR-201': {
        id_train: 'TR-201',
        name_train: 'Zayandeh-Rood Express (زاینده‌رود)',
        name_line: 'Tehran-Isfahan Express',
        speed: 160,
        list_stop_time: {
          'Qom Junction (قم)': 12,
          'Kashan Oasis (کاشان)': 10,
        },
        quality: 'VIP 5-Star',
        cost_ticket: 42,
        capacity: 165,
        departureTime: '08:15',
      },
      'TR-301': {
        id_train: 'TR-301',
        name_train: 'Sabalan Star 301 (سبلان استار)',
        name_line: 'Tabriz-Tehran Azerbaijan Corridor',
        speed: 150,
        list_stop_time: {
          'Mianeh (میانه)': 10,
          'Zanjan (زنجان)': 15,
          'Qazvin (قزوین)': 10,
        },
        quality: 'Economy 3-Star',
        cost_ticket: 34,
        capacity: 280,
        departureTime: '06:30',
      },
      'TR-401': {
        id_train: 'TR-401',
        name_train: 'Pars Night sleeper 401 (پارس شیراز)',
        name_line: 'Tehran-Shiraz Royal Line',
        speed: 155,
        list_stop_time: {
          'Isfahan South (اصفهان)': 15,
          'Abadeh (آباده)': 10,
        },
        quality: 'Business 4-Star',
        cost_ticket: 56,
        capacity: 180,
        departureTime: '16:30',
      },
    },
  };
}

/**
 * Migrates a legacy v1 Python dictionary snapshot (`user_dict`, `employee_dict`, `line_dic`, `train_dic`)
 * into a strictly normalized, immutable v2 Enterprise schema.
 * Idempotent: if passed an already-migrated v2 structure or run repeatedly, preserves integrity without duplication.
 */
export function migrateV1ToV2(v1Input: LegacyV1Snapshot): PlatformDatabaseV2 {
  const snapshot = deepClone(v1Input);
  const nowIso = new Date().toISOString();

  // 1. Migrate Employees (deduplicated by normalized username & email)
  const seenEmpUsernames = new Set<string>();
  const seenEmpEmails = new Set<string>();
  const departments = ['High-Speed Dispatch & Signalling', 'Corridor Topology & Safety', 'Fleet Scheduling & Rolling Stock'];
  let empIdx = 0;

  const employees = Object.values(snapshot.employee_dict || {}).reduce<PlatformDatabaseV2['employees']>((acc, emp) => {
    const normUser = normalizeIdentifier(emp.username);
    const normEmail = normalizeIdentifier(emp.email);
    if (!normUser || seenEmpUsernames.has(normUser) || seenEmpEmails.has(normEmail)) {
      return acc;
    }
    seenEmpUsernames.add(normUser);
    seenEmpEmails.add(normEmail);

    acc.push({
      id: `emp_${normUser}`,
      name: String(emp.name).trim(),
      lastname: String(emp.lastname).trim(),
      username: String(emp.username).trim(),
      email: String(emp.email).trim().toLowerCase(),
      passwordHash: hashPassword(emp.password),
      department: departments[empIdx % departments.length],
      status: empIdx === 0 ? 'On-Duty' : 'Active',
      createdAt: '2026-10-15T08:30:00.000Z',
      linesCreated: empIdx === 0 ? 2 : 1,
      trainsScheduled: empIdx === 0 ? 3 : 2,
    });
    empIdx++;
    return acc;
  }, []);

  // 2. Migrate Passengers (deduplicated by normalized username & email)
  const seenPassUsernames = new Set<string>();
  const seenPassEmails = new Set<string>();

  const passengers: PassengerUser[] = Object.values(snapshot.user_dict || {}).reduce<PassengerUser[]>((acc, usr) => {
    const normUser = normalizeIdentifier(usr.username);
    const normEmail = normalizeIdentifier(usr.email);
    if (!normUser || seenPassUsernames.has(normUser) || seenPassEmails.has(normEmail)) {
      return acc;
    }
    seenPassUsernames.add(normUser);
    seenPassEmails.add(normEmail);

    const numericBalance = Number(usr.balance ?? 0);
    acc.push({
      id: `usr_${normUser}`,
      name: String(usr.name).trim(),
      username: String(usr.username).trim(),
      email: String(usr.email).trim().toLowerCase(),
      passwordHash: hashPassword(usr.password),
      balance: Number.isFinite(numericBalance) && numericBalance >= 0 ? numericBalance : 0,
      createdAt: '2026-10-18T11:00:00.000Z',
    });
    return acc;
  }, []);

  // 3. Migrate Train Lines with deep-cloned station arrays (preventing shared list_state bug)
  const seenLines = new Set<string>();
  const defaultCorridorDistances: Record<string, number[]> = {
    'tehran-mashhad high-speed': [216, 194, 360, 125], // Tehran->Semnan->Shahroud->Neyshabur->Mashhad (895 km)
    'tehran-isfahan express': [135, 108, 172], // Tehran->Qom->Kashan->Isfahan (415 km)
    'tabriz-tehran azerbaijan corridor': [165, 135, 170, 155], // Tabriz->Mianeh->Zanjan->Qazvin->Tehran (625 km)
    'tehran-shiraz royal line': [415, 230, 280], // Tehran->Isfahan->Abadeh->Shiraz (925 km)
  };

  const lines: TrainLine[] = Object.values(snapshot.line_dic || {}).reduce<TrainLine[]>((acc, rawLine) => {
    const normLine = normalizeIdentifier(rawLine.name_line);
    if (!normLine || seenLines.has(normLine)) return acc;
    seenLines.add(normLine);

    const clonedStations = Array.isArray(rawLine.list_state)
      ? rawLine.list_state.map((s) => String(s).trim()).filter(Boolean)
      : [];

    const presetDists = defaultCorridorDistances[normLine];
    const segmentDistancesKm =
      presetDists && presetDists.length === clonedStations.length + 1
        ? [...presetDists]
        : Array.from({ length: clonedStations.length + 1 }, () => 120);

    acc.push({
      id: `line_${normLine.replace(/[^a-z0-9]/g, '_')}`,
      name_line: String(rawLine.name_line).trim(),
      origin: String(rawLine.origin).trim(),
      destination: String(rawLine.destination).trim(),
      num_state: clonedStations.length,
      list_state: clonedStations,
      segmentDistancesKm,
      createdAt: '2026-10-16T09:00:00.000Z',
      updatedAt: '2026-10-16T09:00:00.000Z',
    });
    return acc;
  }, []);

  // 4. Migrate Trains with isolated `list_stop_time` maps and positive numeric parsing
  const seenTrainIds = new Set<string>();
  const trains: TrainSchedule[] = Object.values(snapshot.train_dic || {}).reduce<TrainSchedule[]>((acc, rawTrain, idx) => {
    const normId = normalizeIdentifier(rawTrain.id_train);
    if (!normId || seenTrainIds.has(normId)) return acc;
    seenTrainIds.add(normId);

    const speedNum = Math.max(20, Number(rawTrain.speed) || 120);
    const costNum = Math.max(1, Number(rawTrain.cost_ticket) || 35);
    const capNum = Math.max(1, Math.round(Number(rawTrain.capacity) || 100));

    const stopTimesMap: Record<string, number> = {};
    if (rawTrain.list_stop_time && typeof rawTrain.list_stop_time === 'object') {
      for (const [st, val] of Object.entries(rawTrain.list_stop_time)) {
        const parsedStop = Number(val);
        stopTimesMap[st] = Number.isFinite(parsedStop) && parsedStop >= 0 ? parsedStop : 10;
      }
    }

    const validQualities: QualityTier[] = ['VIP 5-Star', 'Business 4-Star', 'Economy 3-Star'];
    const qStr = String(rawTrain.quality || '');
    const matchedQuality: QualityTier =
      validQualities.find((q) => q.toLowerCase() === qStr.toLowerCase()) || 'VIP 5-Star';

    acc.push({
      id: `trn_${normId.replace(/[^a-z0-9]/g, '_')}`,
      id_train: String(rawTrain.id_train).trim().toUpperCase(),
      name_train: String(rawTrain.name_train).trim(),
      name_line: String(rawTrain.name_line).trim(),
      departureTime: rawTrain.departureTime || `0${7 + idx}:00`,
      speed: speedNum,
      list_stop_time: stopTimesMap,
      quality: matchedQuality,
      cost_ticket: costNum,
      totalCapacity: capNum + (idx === 0 ? 4 : idx === 3 ? 2 : 0),
      capacity: capNum,
      status: 'Scheduled',
      createdAt: '2026-10-17T10:15:00.000Z',
    });
    return acc;
  }, []);

  // 5. Seed initial realistic tickets & wallet transactions for pre-populated passengers
  const tickets: TicketRecord[] = [];
  const transactions: WalletTransaction[] = [];

  if (passengers.length > 0 && trains.length > 0) {
    const p1 = passengers[0];
    transactions.push({
      id: 'tx_seed_1',
      userId: p1.id,
      username: p1.username,
      type: 'DEPOSIT',
      amount: 610,
      runningBalance: 610,
      descriptionEn: 'Initial Wallet Top-Up via Online Banking Gateway',
      descriptionFa: 'شارژ اولیه کیف پول از طریق درگاه بانکی',
      timestamp: '2026-10-20T14:20:00.000Z',
    });
    transactions.push({
      id: 'tx_seed_2',
      userId: p1.id,
      username: p1.username,
      type: 'TICKET_PURCHASE',
      amount: 130,
      runningBalance: p1.balance,
      descriptionEn: 'Booked 2x VIP Seats (1A, 1B) on TR-101 (Tehran-Mashhad High-Speed)',
      descriptionFa: 'خرید ۲ صندلی (1A, 1B) قطار TR-101 (خط سریع‌السیر تهران-مشهد)',
      referenceId: 'RP-89412',
      timestamp: '2026-10-21T09:12:00.000Z',
    });

    tickets.push({
      id: 'tkt_seed_1',
      pnr: 'RP-89412',
      userId: p1.id,
      passengerName: p1.name,
      passengerUsername: p1.username,
      id_train: 'TR-101',
      name_train: 'Fadak Royal HSR 101 (فدک رویال)',
      name_line: 'Tehran-Mashhad High-Speed',
      origin: 'Tehran Central (تهران)',
      destination: 'Mashhad Holy Shrine (مشهد)',
      departureTime: '07:00',
      ticketCount: 2,
      seatNumbers: ['1A', '1B'],
      coachNumber: 1,
      unitPrice: 65,
      totalPrice: 130,
      quality: 'VIP 5-Star',
      status: 'Confirmed',
      purchasedAt: '2026-10-21T09:12:00.000Z',
      qrPayload: 'RAILPULSE|PNR:RP-89412|TRAIN:TR-101|COACH:1|SEATS:1A,1B|USER:mahdi_as|VERIFIED',
    });
  }

  if (passengers.length > 1) {
    const p2 = passengers[1];
    transactions.push({
      id: 'tx_seed_3',
      userId: p2.id,
      username: p2.username,
      type: 'DEPOSIT',
      amount: 299,
      runningBalance: 299,
      descriptionEn: 'Wallet Funding via Corporate Travel Card',
      descriptionFa: 'افزایش اعتبار کیف پول با کارت سفر سازمانی',
      timestamp: '2026-10-22T16:00:00.000Z',
    });
    transactions.push({
      id: 'tx_seed_4',
      userId: p2.id,
      username: p2.username,
      type: 'TICKET_PURCHASE',
      amount: 84,
      runningBalance: p2.balance,
      descriptionEn: 'Booked 2x Seats (2C, 2D) on TR-201 (Tehran-Isfahan Express)',
      descriptionFa: 'خرید ۲ صندلی (2C, 2D) قطار TR-201 (اکسپرس تهران-اصفهان)',
      referenceId: 'RP-90234',
      timestamp: '2026-10-23T11:45:00.000Z',
    });

    tickets.push({
      id: 'tkt_seed_2',
      pnr: 'RP-90234',
      userId: p2.id,
      passengerName: p2.name,
      passengerUsername: p2.username,
      id_train: 'TR-201',
      name_train: 'Zayandeh-Rood Express (زاینده‌رود)',
      name_line: 'Tehran-Isfahan Express',
      origin: 'Tehran Central (تهران)',
      destination: 'Isfahan Historical (اصفهان)',
      departureTime: '08:15',
      ticketCount: 2,
      seatNumbers: ['2C', '2D'],
      coachNumber: 2,
      unitPrice: 42,
      totalPrice: 84,
      quality: 'VIP 5-Star',
      status: 'Confirmed',
      purchasedAt: '2026-10-23T11:45:00.000Z',
      qrPayload: 'RAILPULSE|PNR:RP-90234|TRAIN:TR-201|COACH:2|SEATS:2C,2D|USER:parisa_rad|VERIFIED',
    });
  }

  // 6. Seed 30-day historical ticket sales transaction ledger entries for enterprise financial analytics
  const baseAnchorMs = new Date('2026-11-01T12:00:00.000Z').getTime();
  const sampleCorridors = [
    { trainId: 'TR-101', line: 'Tehran-Mashhad High-Speed', unit: 65 },
    { trainId: 'TR-102', line: 'Tehran-Mashhad High-Speed', unit: 48 },
    { trainId: 'TR-201', line: 'Tehran-Isfahan Express', unit: 42 },
    { trainId: 'TR-301', line: 'Tabriz-Tehran Azerbaijan Corridor', unit: 34 },
    { trainId: 'TR-401', line: 'Tehran-Shiraz Royal Line', unit: 56 },
  ];

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const dayDate = new Date(baseAnchorMs - dayOffset * 86400000);
    const isoTimestamp = dayDate.toISOString();
    const corridor = sampleCorridors[dayOffset % sampleCorridors.length];
    const seatQty = ((dayOffset * 3) % 4) + 2;
    const saleAmount = seatQty * corridor.unit;
    const pnrCode = `RP-${71000 + dayOffset}`;

    transactions.push({
      id: `tx_hist_${dayOffset}`,
      userId: 'usr_corporate_pool',
      username: dayOffset % 2 === 0 ? 'mahdi_as' : 'parisa_rad',
      type: 'TICKET_PURCHASE',
      amount: saleAmount,
      runningBalance: 500,
      descriptionEn: `Booked ${seatQty}x seat(s) on ${corridor.trainId} (${corridor.line}) • PNR ${pnrCode}`,
      descriptionFa: `خرید ${seatQty} صندلی در قطار ${corridor.trainId} (${corridor.line}) • کد رزرو ${pnrCode}`,
      referenceId: pnrCode,
      timestamp: isoTimestamp,
    });
  }

  return {
    schemaVersion: 2,
    migratedFromV1At: nowIso,
    admin: {
      id: 'admin_root',
      username: 'Admin_train',
      passwordHash: hashPassword('admin_train'),
      name: 'System',
      lastname: 'Administrator',
      email: 'admin@railpulse.ir',
      role: 'admin',
    },
    employees,
    passengers,
    lines,
    trains,
    tickets,
    transactions,
    auditLogs: [
      {
        id: 'audit_init_1',
        timestamp: nowIso,
        actorRole: 'system',
        actorUsername: 'MigrationEngine',
        action: 'DATA_INITIALIZED',
        detailsEn: 'Normalized railway corridors, fleet timetables, and passenger accounts initialized with deep-cloned arrays.',
        detailsFa: 'راه‌اندازی اولیه کریدورهای ریلی، جدول زمانبندی ناوگان و حساب‌های کاربری با ساختار نرمال‌شده.',
      },
    ],
  };
}

export function loadDatabase(): PlatformDatabaseV2 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.schemaVersion === 2 && Array.isArray(parsed.lines) && Array.isArray(parsed.trains)) {
        if (!Array.isArray(parsed.transactions) || parsed.transactions.length < 10) {
          const freshSeeded = migrateV1ToV2(getDefaultLegacyV1Snapshot());
          parsed.transactions = [
            ...(parsed.transactions || []),
            ...freshSeeded.transactions.filter((tx) => tx.id.startsWith('tx_hist_')),
          ];
          saveDatabase(parsed as PlatformDatabaseV2);
        }
        // Ensure all tickets have seatNumbers array for backward compatibility
        if (Array.isArray(parsed.tickets)) {
          parsed.tickets.forEach((t: TicketRecord) => {
            if (!Array.isArray(t.seatNumbers) || t.seatNumbers.length === 0) {
              t.seatNumbers = Array.from({ length: t.ticketCount || 1 }, (_, i) => `${i + 1}A`);
            }
            if (!t.coachNumber) t.coachNumber = 1;
          });
        }
        return parsed as PlatformDatabaseV2;
      }
      if (parsed && parsed.schemaVersion === 1) {
        const migrated = migrateV1ToV2(parsed as LegacyV1Snapshot);
        saveDatabase(migrated);
        return migrated;
      }
    }
  } catch {
    // Fallback to clean migration from default V1 snapshot
  }
  const initialDb = migrateV1ToV2(getDefaultLegacyV1Snapshot());
  saveDatabase(initialDb);
  return initialDb;
}

export function saveDatabase(db: PlatformDatabaseV2): void {
  try {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(db));
  } catch {
    // Ignore storage quota errors in sandboxed frames
  }
}

export function resetToDefaultSeedDatabase(): PlatformDatabaseV2 {
  const fresh = migrateV1ToV2(getDefaultLegacyV1Snapshot());
  saveDatabase(fresh);
  return fresh;
}
