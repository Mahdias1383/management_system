import {
  ExecutiveAlert,
  PlatformDatabaseV2,
  SafetyConflict,
  TicketRecord,
} from '../types/domain';
import { formatCurrency, localizeText } from './authService';

export const HIGH_REVENUE_THRESHOLD_RIAL = 15_000_000;
const ALERT_STORAGE_KEY = 'railpulse_executive_alerts_v3';
export const ALERT_CENTER_EVENT = 'railpulse:executive-alert';

interface AlertCenterEventDetail {
  alerts: ExecutiveAlert[];
  pushedAlert?: ExecutiveAlert;
}

export function isHighRevenueTicket(
  ticket: Pick<TicketRecord, 'totalPrice' | 'ticketCount' | 'quality'>,
  thresholdRial: number = HIGH_REVENUE_THRESHOLD_RIAL
): boolean {
  return (
    ticket.totalPrice >= thresholdRial ||
    (ticket.quality === 'VIP 5-Star' && ticket.ticketCount >= 2)
  );
}

function buildSeedExecutiveAlerts(db?: PlatformDatabaseV2): ExecutiveAlert[] {
  const now = Date.now();
  const confirmedTickets = (db?.tickets || []).filter((t) => t.status === 'Confirmed');
  const topTicket =
    confirmedTickets.sort((a, b) => b.totalPrice - a.totalPrice)[0] || null;

  const seedHighRevAmount = topTicket
    ? Math.max(topTicket.totalPrice, 38_000_000)
    : 38_000_000;
  const seedPnr = topTicket?.pnr || 'RP-89412';
  const seedTrainId = topTicket?.id_train || 'FDK-101';
  const seedLine = topTicket?.name_line || 'Tehran-Mashhad-Express';
  const seedPassenger = topTicket?.passengerName || 'Ali Rezaei';

  return [
    {
      id: 'exec_alert_seed_conflict_1',
      category: 'SAFETY_RADAR_CONFLICT',
      severity: 'CRITICAL',
      titleFa: 'هشدار رادار ایمنی: تداخل سکوی ایستگاهی',
      titleEn: 'Safety Radar Conflict: Station Platform Overlap',
      messageFa:
        'رادار ضدبرخورد تداخل زمانی در ایستگاه «سمنان» بین قطار اعزامی FDK-105 و سرویس سریع‌السیر FDK-101 در بازه ۰۹:۴۵ تا ۱۰:۰۰ شناسایی و مسدود کرد (پیشنهاد زمان ایمن: ۰۸:۲۰).',
      messageEn:
        'Automated Collision Radar detected and blocked a station platform overlap at "Semnan" between candidate FDK-105 and FDK-101 during 09:45 – 10:00 (Safe slot: 08:20).',
      timestamp: new Date(now - 4 * 60 * 1000).toISOString(),
      read: false,
      trainId: 'FDK-105',
      lineName: 'Tehran-Mashhad-Express',
      locationLabel: 'Semnan',
      conflictType: 'STATION_PLATFORM_OVERLAP',
      overlapWindow: '09:45 – 10:00',
      suggestedSafeDeparture: '08:20',
    },
    {
      id: 'exec_alert_seed_booking_1',
      category: 'HIGH_REVENUE_BOOKING',
      severity: 'HIGH',
      titleFa: 'ثبت رزرو کلان و ویژه (درآمد بالا)',
      titleEn: 'New High-Revenue VIP Booking Confirmed',
      messageFa: `رزرو گروهی کوپه ویژه ۵ ستاره با کد پیگیری ${seedPnr} توسط «${localizeText(seedPassenger, 'fa')}» در قطار ${seedTrainId} به ارزش ${formatCurrency(seedHighRevAmount, 'Rial')} ثبت و تسویه شد.`,
      messageEn: `High-value VIP 5-Star booking (${seedPnr}) by ${localizeText(seedPassenger, 'en')} on train ${seedTrainId} (${localizeText(seedLine, 'en')}) settled for ${formatCurrency(seedHighRevAmount, 'USD')}.`,
      timestamp: new Date(now - 14 * 60 * 1000).toISOString(),
      read: false,
      amountIrr: seedHighRevAmount,
      pnr: seedPnr,
      trainId: seedTrainId,
      lineName: seedLine,
      locationLabel: 'Tehran → Mashhad',
    },
    {
      id: 'exec_alert_seed_conflict_2',
      category: 'SAFETY_RADAR_CONFLICT',
      severity: 'CRITICAL',
      titleFa: 'هشدار رادار ایمنی: نقض سرفاصله بلاک ریلی',
      titleEn: 'Safety Radar Conflict: Track Headway Violation',
      messageFa:
        'تلاش برای ثبت سرویس GZ-209 در بلاک «قم ← کاشان» به دلیل نقض سرفاصله ایمنی ۵ دقیقه‌ای با قطار GZ-204 توسط رادار متوقف شد.',
      messageEn:
        'Track segment overtake / 5-minute headway violation on "Qom → Kashan" between candidate GZ-209 and GZ-204 intercepted by dispatch radar.',
      timestamp: new Date(now - 38 * 60 * 1000).toISOString(),
      read: false,
      trainId: 'GZ-209',
      lineName: 'Tehran-Isfahan-HighSpeed',
      locationLabel: 'Qom → Kashan',
      conflictType: 'TRACK_SEGMENT_OVERTAKE',
      overlapWindow: '11:10 – 12:05',
      suggestedSafeDeparture: '10:50',
    },
    {
      id: 'exec_alert_seed_booking_2',
      category: 'HIGH_REVENUE_BOOKING',
      severity: 'INFO',
      titleFa: 'تراکنش فروش بلیط سازمانی با ارزش بالا',
      titleEn: 'High-Value Corporate Ticket Settlement',
      messageFa: `خرید ۶ صندلی بیزینس در مسیر تهران - اصفهان (قطار GZ-204) با کد رزرو RP-77320 به مبلغ ${formatCurrency(27_000_000, 'Rial')} با موفقیت انجام شد.`,
      messageEn: `Corporate booking of 6 Business Class seats on GZ-204 (Tehran → Isfahan, PNR RP-77320) settled for ${formatCurrency(27_000_000, 'USD')}.`,
      timestamp: new Date(now - 95 * 60 * 1000).toISOString(),
      read: true,
      amountIrr: 27_000_000,
      pnr: 'RP-77320',
      trainId: 'GZ-204',
      lineName: 'Tehran-Isfahan-HighSpeed',
      locationLabel: 'Tehran → Isfahan',
    },
  ];
}

function saveExecutiveAlerts(
  alerts: ExecutiveAlert[],
  pushedAlert?: ExecutiveAlert
): ExecutiveAlert[] {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alerts));
    } catch {
      // Ignore storage quota errors
    }
    window.dispatchEvent(
      new CustomEvent<AlertCenterEventDetail>(ALERT_CENTER_EVENT, {
        detail: { alerts, pushedAlert },
      })
    );
  }
  return alerts;
}

export function getExecutiveAlerts(db?: PlatformDatabaseV2): ExecutiveAlert[] {
  if (typeof window === 'undefined') {
    return buildSeedExecutiveAlerts(db);
  }
  try {
    const raw = window.localStorage.getItem(ALERT_STORAGE_KEY);
    if (!raw) {
      const seeded = buildSeedExecutiveAlerts(db);
      window.localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as ExecutiveAlert[];
    }
  } catch {
    // Fallback to seed alerts
  }
  const fallback = buildSeedExecutiveAlerts(db);
  try {
    window.localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(fallback));
  } catch {
    // Ignore
  }
  return fallback;
}

export function pushExecutiveAlert(
  partial: Omit<ExecutiveAlert, 'id' | 'timestamp' | 'read'> & {
    id?: string;
    timestamp?: string;
    read?: boolean;
  }
): ExecutiveAlert {
  const current = getExecutiveAlerts();
  const newAlert: ExecutiveAlert = {
    ...partial,
    id:
      partial.id ||
      `exec_alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: partial.timestamp || new Date().toISOString(),
    read: partial.read ?? false,
  };

  // Deduplicate if identical alert ID or same conflict/booking within last 4 seconds
  const duplicateIdx = current.findIndex(
    (a) =>
      a.id === newAlert.id ||
      (a.category === newAlert.category &&
        a.pnr &&
        a.pnr === newAlert.pnr) ||
      (a.category === 'SAFETY_RADAR_CONFLICT' &&
        a.trainId === newAlert.trainId &&
        a.locationLabel === newAlert.locationLabel &&
        Math.abs(new Date(a.timestamp).getTime() - new Date(newAlert.timestamp).getTime()) < 4000)
  );

  let nextAlerts: ExecutiveAlert[];
  if (duplicateIdx !== -1) {
    const updated = { ...current[duplicateIdx], ...newAlert, read: false };
    nextAlerts = [
      updated,
      ...current.filter((_, idx) => idx !== duplicateIdx),
    ].slice(0, 40);
    saveExecutiveAlerts(nextAlerts, updated);
    return updated;
  }

  nextAlerts = [newAlert, ...current].slice(0, 40);
  saveExecutiveAlerts(nextAlerts, newAlert);
  return newAlert;
}

export function pushHighRevenueBookingAlert(ticket: TicketRecord): ExecutiveAlert {
  const originFa = localizeText(ticket.origin, 'fa');
  const destFa = localizeText(ticket.destination, 'fa');
  const passengerFa = localizeText(ticket.passengerName, 'fa');
  const originEn = localizeText(ticket.origin, 'en');
  const destEn = localizeText(ticket.destination, 'en');
  const passengerEn = localizeText(ticket.passengerName, 'en');

  return pushExecutiveAlert({
    category: 'HIGH_REVENUE_BOOKING',
    severity: ticket.totalPrice >= 30_000_000 ? 'CRITICAL' : 'HIGH',
    titleFa: 'ثبت رزرو جدید با درآمد بالا در شبکه',
    titleEn: 'New High-Revenue Ticket Booking Confirmed',
    messageFa: `رزرو ${ticket.ticketCount} صندلی (${ticket.seatNumbers.join('، ')}) در قطار ${ticket.id_train} (${originFa} به ${destFa}) توسط «${passengerFa}» با کد پیگیری ${ticket.pnr} به مبلغ ${formatCurrency(ticket.totalPrice, 'Rial')} ثبت شد.`,
    messageEn: `${passengerEn} booked ${ticket.ticketCount} seat(s) (${ticket.seatNumbers.join(', ')}) on ${ticket.id_train} (${originEn} → ${destEn}, PNR ${ticket.pnr}) for ${formatCurrency(ticket.totalPrice, 'USD')}.`,
    amountIrr: ticket.totalPrice,
    pnr: ticket.pnr,
    trainId: ticket.id_train,
    lineName: ticket.name_line,
    locationLabel: `${originEn} → ${destEn}`,
  });
}

export function pushSafetyRadarConflictAlert(conflict: SafetyConflict): ExecutiveAlert {
  const isPlatform = conflict.type === 'STATION_PLATFORM_OVERLAP';
  const locFa = localizeText(conflict.locationLabel, 'fa');

  return pushExecutiveAlert({
    category: 'SAFETY_RADAR_CONFLICT',
    severity: 'CRITICAL',
    titleFa: isPlatform
      ? `هشدار رادار ایمنی: تداخل سکوی ایستگاه «${locFa}»`
      : `هشدار رادار ایمنی: خطر برخورد در بلاک «${locFa}»`,
    titleEn: isPlatform
      ? `Safety Radar Alert: Platform Overlap at ${conflict.locationLabel}`
      : `Safety Radar Alert: Track Conflict on ${conflict.locationLabel}`,
    messageFa: `${conflict.descriptionFa}${
      conflict.suggestedSafeDepartureTime
        ? ` (پیشنهاد زمان اعزام ایمن: ${conflict.suggestedSafeDepartureTime})`
        : ''
    }`,
    messageEn: `${conflict.descriptionEn}${
      conflict.suggestedSafeDepartureTime
        ? ` (Suggested safe departure: ${conflict.suggestedSafeDepartureTime})`
        : ''
    }`,
    trainId: conflict.candidateTrainId,
    lineName: conflict.lineName,
    locationLabel: conflict.locationLabel,
    conflictType: conflict.type,
    overlapWindow: conflict.overlapWindowFormatted,
    suggestedSafeDeparture: conflict.suggestedSafeDepartureTime,
  });
}

export function markExecutiveAlertRead(id: string): ExecutiveAlert[] {
  const current = getExecutiveAlerts();
  const next = current.map((a) => (a.id === id ? { ...a, read: true } : a));
  return saveExecutiveAlerts(next);
}

export function markAllExecutiveAlertsRead(): ExecutiveAlert[] {
  const current = getExecutiveAlerts();
  const next = current.map((a) => ({ ...a, read: true }));
  return saveExecutiveAlerts(next);
}

export function dismissExecutiveAlert(id: string): ExecutiveAlert[] {
  const current = getExecutiveAlerts();
  const next = current.filter((a) => a.id !== id);
  return saveExecutiveAlerts(next);
}

export function simulateHighRevenueBookingPush(
  db: PlatformDatabaseV2
): ExecutiveAlert {
  const sampleTrains = db.trains.length > 0 ? db.trains : [];
  const pickedTrain =
    sampleTrains[Math.floor(Math.random() * sampleTrains.length)];
  const trainId = pickedTrain?.id_train || 'FDK-101';
  const lineName = pickedTrain?.name_line || 'Tehran-Mashhad-Express';
  const matchedLine = db.lines.find((l) => l.name_line === lineName);
  const origin = matchedLine?.origin || 'Tehran';
  const destination = matchedLine?.destination || 'Mashhad';

  const seatCounts = [4, 5, 6, 8];
  const seatsCount = seatCounts[Math.floor(Math.random() * seatCounts.length)];
  const unitPrice = Math.max(pickedTrain?.cost_ticket || 9_500_000, 8_500_000);
  const totalAmount = seatsCount * unitPrice;
  const randomPnr = `RP-${Math.floor(10000 + Math.random() * 89999)}`;

  const samplePassengers = [
    { en: 'Dr. Kambiz Tehrani (VIP Charter)', fa: 'دکتر کامبیز تهرانی (کوپه دربست ویژه)' },
    { en: 'Parsian Energy Executive Delegation', fa: 'هیئت اجرایی هلدینگ انرژی پارسیان' },
    { en: 'Negin Rahimi (First-Class Suite)', fa: 'نگین رحیمی (سوئیت فرست‌کلاس)' },
  ];
  const chosenPassenger =
    samplePassengers[Math.floor(Math.random() * samplePassengers.length)];

  return pushExecutiveAlert({
    category: 'HIGH_REVENUE_BOOKING',
    severity: totalAmount >= 35_000_000 ? 'CRITICAL' : 'HIGH',
    titleFa: 'اعلان آنی: ثبت رزرو کلان و ویژه',
    titleEn: 'Real-Time Push: High-Revenue VIP Booking',
    messageFa: `رزرو قطعی ${seatsCount} صندلی فرست‌کلاس در قطار ${trainId} (${localizeText(origin, 'fa')} ← ${localizeText(destination, 'fa')}) توسط «${chosenPassenger.fa}» با کد پیگیری ${randomPnr} به مبلغ ${formatCurrency(totalAmount, 'Rial')} ثبت شد.`,
    messageEn: `Instant settlement of ${seatsCount} First-Class seats on ${trainId} (${localizeText(origin, 'en')} → ${localizeText(destination, 'en')}) by ${chosenPassenger.en} (PNR ${randomPnr}) totaling ${formatCurrency(totalAmount, 'USD')}.`,
    amountIrr: totalAmount,
    pnr: randomPnr,
    trainId,
    lineName,
    locationLabel: `${localizeText(origin, 'en')} → ${localizeText(destination, 'en')}`,
  });
}

export function simulateSafetyRadarConflictPush(
  db: PlatformDatabaseV2
): ExecutiveAlert {
  const sampleLine = db.lines[0];
  const lineName = sampleLine?.name_line || 'Tehran-Mashhad-Express';
  const midStation = sampleLine?.list_state[0] || 'Semnan';
  const nextStation = sampleLine?.list_state[1] || sampleLine?.destination || 'Damghan';
  const existingTrain = db.trains[0]?.id_train || 'FDK-101';
  const simCode = `EXP-${Math.floor(301 + Math.random() * 590)}`;
  const isPlatform = Math.random() > 0.45;

  const conflict: SafetyConflict = isPlatform
    ? {
        id: `CONF-SIM-${Date.now()}`,
        type: 'STATION_PLATFORM_OVERLAP',
        severity: 'CRITICAL',
        candidateTrainId: simCode,
        conflictingTrainId: existingTrain,
        conflictingTrainName: 'Fadak 5-Star Express',
        lineName,
        locationLabel: midStation,
        overlapWindowFormatted: '09:42 – 09:57',
        descriptionEn: `Station Platform Collision at "${midStation}": Candidate ${simCode} (09:42–09:57) overlaps with active service ${existingTrain} on ${lineName}.`,
        descriptionFa: `تداخل سکوی ایستگاهی در ایستگاه «${localizeText(midStation, 'fa')}»: قطار آزمایشی ${simCode} (۰۹:۴۲ تا ۰۹:۵۷) با قطار فعال ${existingTrain} در مسیر ${localizeText(lineName, 'fa')} همپوشانی زمانی دارد.`,
        suggestedSafeDepartureTime: '08:15',
      }
    : {
        id: `CONF-SIM-${Date.now()}`,
        type: 'TRACK_SEGMENT_OVERTAKE',
        severity: 'CRITICAL',
        candidateTrainId: simCode,
        conflictingTrainId: existingTrain,
        conflictingTrainName: 'Fadak 5-Star Express',
        lineName,
        locationLabel: `${midStation} → ${nextStation}`,
        overlapWindowFormatted: '10:05 – 10:48',
        descriptionEn: `Track Segment Overtake / 5-min Headway Violation on "${midStation} → ${nextStation}": Candidate ${simCode} conflicts with ${existingTrain}.`,
        descriptionFa: `خطر سبقت غیرمجاز و نقض سرفاصله ایمنی ۵ دقیقه‌ای در بلاک «${localizeText(midStation, 'fa')} ← ${localizeText(nextStation, 'fa')}» بین قطار ${simCode} و سرویس ${existingTrain} شناسایی شد.`,
        suggestedSafeDepartureTime: '08:40',
      };

  return pushSafetyRadarConflictAlert(conflict);
}

export function subscribeToExecutiveAlerts(
  listener: (alerts: ExecutiveAlert[], pushedAlert?: ExecutiveAlert) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleCustomEvent = (event: Event) => {
    const custom = event as CustomEvent<AlertCenterEventDetail>;
    if (custom.detail?.alerts) {
      listener(custom.detail.alerts, custom.detail.pushedAlert);
    }
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === ALERT_STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue) as ExecutiveAlert[];
        if (Array.isArray(parsed)) {
          listener(parsed, parsed[0]);
        }
      } catch {
        // Ignore malformed storage payload
      }
    }
  };

  window.addEventListener(ALERT_CENTER_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(ALERT_CENTER_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
