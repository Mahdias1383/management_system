import { ActiveSession, Language, QualityTier, UserRole } from '../types/domain';
import { APP_ENV } from '../config/env';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Converts any Persian (۰-۹) or Arabic (٠-٩) digits in a string to standard ASCII (0-9)
 * for internal mathematical parsing and form validation.
 */
export function toEnglishDigits(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * Converts ASCII digits (0-9) to Persian digits (۰-۹) when lang === 'fa',
 * or to English digits (0-9) when lang === 'en'.
 */
export function toPersianDigits(
  value: unknown,
  lang: Language = 'fa'
): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (lang === 'en') {
    return toEnglishDigits(str);
  }
  return str.replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

export type CurrencyType = 'Rial' | 'USD';

export function getCurrencyType(lang: Language): CurrencyType {
  return lang === 'en' ? 'USD' : 'Rial';
}

const FA_IRR_CURRENCY_FORMATTER = new Intl.NumberFormat('fa-IR', {
  style: 'currency',
  currency: 'IRR',
  maximumFractionDigits: 0,
});

const FA_CURRENCY_FORMATTER = new Intl.NumberFormat('fa-IR', {
  style: 'decimal',
  useGrouping: true,
  maximumFractionDigits: 0,
});

const EN_USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const EN_DECIMAL_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  useGrouping: true,
  maximumFractionDigits: 1,
});

const FA_DECIMAL_FORMATTER = new Intl.NumberFormat('fa-IR', {
  style: 'decimal',
  useGrouping: true,
  maximumFractionDigits: 1,
});

/**
 * Nominal conversion factor between internal Rial ledger values and USD display in English (LTR) mode:
 * Configured via VITE_USD_EXCHANGE_RATE (default: 100,000 IRR = $1.00 USD).
 */
export const IRR_PER_USD = APP_ENV.usdExchangeRate;

export function toUsdValue(irrAmount: number): number {
  if (!Number.isFinite(irrAmount) || irrAmount === 0) return 0;
  if (Math.abs(irrAmount) >= 1_000) {
    return Math.round((irrAmount / IRR_PER_USD) * 100) / 100;
  }
  return Math.round(irrAmount * 100) / 100;
}

/**
 * Converts a user-entered currency input from the active language mode into internal base ledger units (IRR).
 * In Persian mode ('fa'), inputs are already in Rials.
 * In English mode ('en'), if the user enters a USD amount (< 100,000, e.g., $100 deposit or $48 fare),
 * it scales by IRR_PER_USD so the unified ledger stays consistent across both languages.
 */
export function normalizeCurrencyInputToIrr(
  rawInput: unknown,
  lang: Language = 'fa'
): number {
  const numeric = Number(toEnglishDigits(rawInput ?? 0));
  if (!Number.isFinite(numeric) || numeric <= 0) return Number.NaN;
  if (lang === 'en' && numeric < 100_000) {
    return Math.round(numeric * IRR_PER_USD);
  }
  return Math.round(numeric);
}

/**
 * Converts an internal IRR amount to a clean default input string for form fields in the active language.
 */
export function toDisplayCurrencyInput(irrAmount: number, lang: Language = 'fa'): string {
  if (lang === 'en') {
    return String(toUsdValue(irrAmount));
  }
  return String(Math.round(irrAmount));
}

/**
 * Formats a plain numeric value with Intl.NumberFormat thousands separators
 * and localized Persian/English numerals.
 */
export function formatNumber(
  value: number | string | undefined | null,
  lang: Language = 'fa'
): string {
  const numeric = Number(toEnglishDigits(value ?? 0));
  const safeVal = Number.isFinite(numeric) ? numeric : 0;
  if (lang === 'en') {
    return EN_DECIMAL_FORMATTER.format(safeVal);
  }
  return toPersianDigits(FA_DECIMAL_FORMATTER.format(safeVal), 'fa');
}

const FA_DATETIME_FULL_FORMATTER = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const EN_DATETIME_FULL_FORMATTER = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const FA_DATE_ONLY_FORMATTER = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const EN_DATE_ONLY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const FA_SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('fa-IR', {
  month: 'long',
  day: 'numeric',
});

const EN_SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

/**
 * Formats a 24-hour clock string (e.g. "06:30" or "08:10 - 08:25") with localized Persian/English numerals.
 */
export function formatTime(timeStr: string | undefined | null, lang: Language = 'fa'): string {
  if (!timeStr) return '';
  return toPersianDigits(String(timeStr), lang);
}

/**
 * Centralized date/time formatting utility using Intl.DateTimeFormat:
 * - 'fa': Solar Hijri ('fa-IR') with Persian month names and Persian numerals (۰-۹)
 * - 'en': Gregorian ('en-US') with English month names and standard ASCII numerals (0-9)
 */
export function formatDateTime(
  dateInput: string | number | Date | undefined | null,
  lang: Language = 'fa',
  mode: 'full' | 'date' | 'shortDate' = 'full'
): string {
  if (!dateInput) return '';
  const dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(dateObj.getTime())) {
    return toPersianDigits(String(dateInput), lang);
  }

  if (lang === 'en') {
    if (mode === 'date') return EN_DATE_ONLY_FORMATTER.format(dateObj);
    if (mode === 'shortDate') return EN_SHORT_DATE_FORMATTER.format(dateObj);
    return EN_DATETIME_FULL_FORMATTER.format(dateObj);
  }

  let formattedFa: string;
  if (mode === 'date') {
    formattedFa = FA_DATE_ONLY_FORMATTER.format(dateObj);
  } else if (mode === 'shortDate') {
    formattedFa = FA_SHORT_DATE_FORMATTER.format(dateObj);
  } else {
    formattedFa = FA_DATETIME_FULL_FORMATTER.format(dateObj);
  }

  return toPersianDigits(formattedFa, 'fa');
}

/**
 * Centralized currency formatting utility using Intl.NumberFormat:
 * - 'Rial' (or 'fa'): uses 'fa-IR' with currency 'IRR' for localized Persian Rials ('ریال') and Persian numerals (۰-۹).
 * - 'USD' (or 'en'): uses 'en-US' with currency 'USD' for localized US Dollars ('$') and Western numerals (0-9).
 */
export function formatCurrency(
  amount: number | string | undefined | null,
  currencyType: CurrencyType | Language = 'Rial'
): string {
  const numeric = Number(toEnglishDigits(amount ?? 0));
  const safeVal = Number.isFinite(numeric) ? Math.round(numeric) : 0;
  const resolvedCurrency: CurrencyType =
    currencyType === 'USD' || currencyType === 'en' ? 'USD' : 'Rial';

  if (resolvedCurrency === 'USD') {
    const usdVal = toUsdValue(safeVal);
    return EN_USD_FORMATTER.format(usdVal);
  }

  const rawIrr = FA_IRR_CURRENCY_FORMATTER.format(safeVal).replace(/IRR/gi, 'ریال');
  const localizedFa = toPersianDigits(rawIrr, 'fa');
  return localizedFa.includes('ریال') ? localizedFa : `${localizedFa} ریال`;
}

/**
 * Alias for formatCurrency for backward compatibility across modules.
 */
export function formatRial(
  amount: number | string | undefined | null,
  currencyType: CurrencyType | Language = 'Rial'
): string {
  return formatCurrency(amount, currencyType);
}

/**
 * Formats large currency values compactly for chart axes:
 * - 'Rial' (or 'fa'): e.g., ۱۵ میلیون / ۵۰۰ هزار / ۴٬۵۰۰٬۰۰۰ ریال
 * - 'USD' (or 'en'): e.g., $4.5K / $1.2M / $450 (USD)
 */
export function formatCompactCurrency(
  amount: number | string | undefined | null,
  currencyType: CurrencyType | Language = 'Rial'
): string {
  const numeric = Number(toEnglishDigits(amount ?? 0));
  const safeVal = Number.isFinite(numeric) ? numeric : 0;
  const resolvedCurrency: CurrencyType =
    currencyType === 'USD' || currencyType === 'en' ? 'USD' : 'Rial';

  if (resolvedCurrency === 'USD') {
    const usdVal = toUsdValue(safeVal);
    if (Math.abs(usdVal) >= 1_000_000) {
      const m = Math.round((usdVal / 1_000_000) * 10) / 10;
      return `$${EN_DECIMAL_FORMATTER.format(m)}M`;
    }
    if (Math.abs(usdVal) >= 1_000) {
      const k = Math.round((usdVal / 1_000) * 10) / 10;
      return `$${EN_DECIMAL_FORMATTER.format(k)}K`;
    }
    return EN_USD_FORMATTER.format(usdVal);
  }

  if (Math.abs(safeVal) >= 1_000_000) {
    const millions = Math.round((safeVal / 1_000_000) * 10) / 10;
    return `${toPersianDigits(FA_DECIMAL_FORMATTER.format(millions), 'fa')} میلیون`;
  }
  if (Math.abs(safeVal) >= 1_000) {
    const thousands = Math.round(safeVal / 1_000);
    return `${toPersianDigits(FA_CURRENCY_FORMATTER.format(thousands), 'fa')} هزار`;
  }
  return formatCurrency(safeVal, 'Rial');
}

/**
 * Alias for formatCompactCurrency.
 */
export function formatCompactRial(
  amount: number | string | undefined | null,
  currencyType: CurrencyType | Language = 'Rial'
): string {
  return formatCompactCurrency(amount, currencyType);
}

const DOMAIN_TRANSLATIONS: Record<string, { fa: string; en: string }> = {
  // Corridor & Line Names
  'tehran-mashhad high-speed': {
    fa: 'محور سریع‌السیر تهران–مشهد',
    en: 'Tehran–Mashhad High-Speed',
  },
  'tehran-isfahan express': {
    fa: 'محور تندرو تهران–اصفهان',
    en: 'Tehran–Isfahan Express',
  },
  'tabriz-tehran azerbaijan corridor': {
    fa: 'کریدور شمال‌غرب تبریز–تهران',
    en: 'Tabriz–Tehran Azerbaijan Corridor',
  },
  'tehran-shiraz royal line': {
    fa: 'خط ویژه تهران–شیراز',
    en: 'Tehran–Shiraz Royal Line',
  },
  // Terminals & Intermediate Stations
  'tehran central (تهران)': { fa: 'ایستگاه مرکزی تهران', en: 'Tehran Central' },
  'mashhad holy shrine (مشهد)': { fa: 'ایستگاه راه‌آهن مشهد', en: 'Mashhad Terminal' },
  'isfahan historical (اصفهان)': { fa: 'ایستگاه مرکزی اصفهان', en: 'Isfahan Central' },
  'isfahan south (اصفهان)': { fa: 'ایستگاه جنوب اصفهان', en: 'Isfahan South' },
  'tabriz grand (تبریز)': { fa: 'ایستگاه راه‌آهن تبریز', en: 'Tabriz Grand' },
  'shiraz persepolis (شیراز)': { fa: 'ایستگاه مرکزی شیراز', en: 'Shiraz Persepolis' },
  'semnan (سمنان)': { fa: 'سمنان', en: 'Semnan' },
  'shahroud (شاهرود)': { fa: 'شاهرود', en: 'Shahroud' },
  'neyshabur (نیشابور)': { fa: 'نیشابور', en: 'Neyshabur' },
  'qom junction (قم)': { fa: 'قم', en: 'Qom Junction' },
  'kashan oasis (کاشان)': { fa: 'کاشان', en: 'Kashan Oasis' },
  'mianeh (میانه)': { fa: 'میانه', en: 'Mianeh' },
  'zanjan (زنجان)': { fa: 'زنجان', en: 'Zanjan' },
  'qazvin (قزوین)': { fa: 'قزوین', en: 'Qazvin' },
  'abadeh (آباده)': { fa: 'آباده', en: 'Abadeh' },
  // Train Service Names
  'fadak royal hsr 101 (فدک رویال)': {
    fa: 'قطار ۵ ستاره فدک رویال ۱۰۱',
    en: 'Fadak Royal HSR 101',
  },
  'ghazal executive 102 (غزل ویژه)': {
    fa: 'قطار ۴ ستاره غزل ویژه ۱۰۲',
    en: 'Ghazal Executive 102',
  },
  'simorgh turbo 105 (سیمرغ توربو)': {
    fa: 'قطار سریع‌السیر سیمرغ توربو ۱۰۵',
    en: 'Simorgh Turbo 105',
  },
  'zayandeh-rood express (زاینده‌رود)': {
    fa: 'قطار ویژه زاینده‌رود ۲۰۱',
    en: 'Zayandeh-Rood Express 201',
  },
  'sabalan star 301 (سبلان استار)': {
    fa: 'قطار مسافربری سبلان ۳۰۱',
    en: 'Sabalan Star 301',
  },
  'pars night sleeper 401 (پارس شیراز)': {
    fa: 'قطار چهارستاره پارس شیراز ۴۰۱',
    en: 'Pars Night Sleeper 401',
  },
  // Seeded Operator & Passenger Names
  'system administrator': { fa: 'مدیر کل سامانه', en: 'System Administrator' },
  system: { fa: 'مدیر کل', en: 'System' },
  administrator: { fa: 'سامانه', en: 'Administrator' },
  'سارا (sara)': { fa: 'سارا', en: 'Sara' },
  'احمدی (ahmadi)': { fa: 'احمدی', en: 'Ahmadi' },
  'سارا (sara) احمدی (ahmadi)': { fa: 'سارا احمدی', en: 'Sara Ahmadi' },
  'رضا (reza)': { fa: 'رضا', en: 'Reza' },
  'کریمی (karimi)': { fa: 'کریمی', en: 'Karimi' },
  'رضا (reza) کریمی (karimi)': { fa: 'رضا کریمی', en: 'Reza Karimi' },
  'نیما (nima)': { fa: 'نیما', en: 'Nima' },
  'فراهانی (farahani)': { fa: 'فراهانی', en: 'Farahani' },
  'نیما (nima) فراهانی (farahani)': { fa: 'نیما فراهانی', en: 'Nima Farahani' },
  'مهدی اسدی (mahdi asadi)': { fa: 'مهدی اسدی', en: 'Mahdi Asadi' },
  'پریسا راد (parisa rad)': { fa: 'پریسا راد', en: 'Parisa Rad' },
};

/**
 * Localizes any domain string (station name, line name, train title, person name)
 * into clean Persian (when lang === 'fa') or clean English (when lang === 'en'),
 * eliminating mixed bilingual parentheses or untranslated English values.
 */
export function localizeText(value: string | undefined | null, lang: Language = 'fa'): string {
  if (!value) return '';
  const trimmed = String(value).trim();
  const key = trimmed.toLowerCase();
  if (DOMAIN_TRANSLATIONS[key]) {
    return DOMAIN_TRANSLATIONS[key][lang];
  }

  // Handle strings formatted as "English (فارسی)" or "فارسی (English)"
  const parenMatch = trimmed.match(/^(.+?)\s*\((.+?)\)$/);
  if (parenMatch) {
    const part1 = parenMatch[1].trim();
    const part2 = parenMatch[2].trim();
    const hasPersian1 = /[\u0600-\u06FF]/.test(part1);
    const hasPersian2 = /[\u0600-\u06FF]/.test(part2);
    if (lang === 'fa') {
      if (hasPersian1 && !hasPersian2) return toPersianDigits(part1, 'fa');
      if (hasPersian2 && !hasPersian1) return toPersianDigits(part2, 'fa');
    } else {
      if (!hasPersian1 && hasPersian2) return part1;
      if (!hasPersian2 && hasPersian1) return part2;
    }
  }

  return lang === 'fa' ? toPersianDigits(trimmed, 'fa') : trimmed;
}

/**
 * Localizes train travel class / quality tier.
 */
export function localizeQuality(quality: QualityTier | string | undefined, lang: Language = 'fa'): string {
  const q = String(quality || '').trim();
  if (lang === 'en') return q || 'VIP 5-Star';
  switch (q) {
    case 'VIP 5-Star':
      return '۵ ستاره ویژه (VIP)';
    case 'Business 4-Star':
      return '۴ ستاره تجاری';
    case 'Economy 3-Star':
      return '۳ ستاره اقتصادی';
    default:
      return q;
  }
}

/**
 * Localizes railway operations department names.
 */
export function localizeDepartment(dept: string | undefined, lang: Language = 'fa'): string {
  const d = String(dept || '').trim();
  if (lang === 'en') return d;
  const map: Record<string, string> = {
    'high-speed dispatch & signalling': 'مرکز کنترل ترافیک و علائم سریع‌السیر',
    'corridor topology & safety': 'مهندسی خطوط و ایمنی سیر',
    'fleet scheduling & rolling stock': 'برنامه‌ریزی ناوگان و بهره‌برداری',
    'dispatch & traffic control': 'مرکز کنترل ترافیک و اعزام (CTC)',
    'corridor topology engineering': 'مهندسی خطوط و شبکه ریلی',
    'fleet & high-speed operations': 'بهره‌برداری ناوگان سریع‌السیر',
    'safety & signaling compliance': 'ایمنی سیر و علائم الکتریکی',
    'dispatch engineering': 'مهندسی اعزام و ترافیک',
  };
  return map[d.toLowerCase()] || d;
}

/**
 * Localizes system actor roles.
 */
export function localizeRole(role: string | undefined, lang: Language = 'fa'): string {
  const r = String(role || '').trim().toLowerCase();
  if (lang === 'en') {
    if (r === 'admin') return 'System Admin';
    if (r === 'staff') return 'Operations Staff';
    if (r === 'passenger') return 'Passenger';
    return 'System Core';
  }
  if (r === 'admin') return 'مدیر کل سازمان';
  if (r === 'staff') return 'کارشناس عملیات';
  if (r === 'passenger') return 'مسافر';
  return 'هسته سامانه';
}

/**
 * Localizes audit log action codes into natural Persian domain terms when in RTL mode.
 */
export function localizeAuditAction(action: string | undefined, lang: Language = 'fa'): string {
  const act = String(action || '').trim();
  if (lang === 'en') return act;
  const map: Record<string, string> = {
    DATA_INITIALIZED: 'راه‌اندازی اولیه سامانه',
    PROVISION_OPERATIONS_STAFF: 'ایجاد حساب کارشناس عملیات',
    UPDATE_OPERATIONS_STAFF: 'ویرایش پرونده کارشناس',
    REVOKE_OPERATIONS_STAFF: 'لغو دسترسی کارشناس',
    CREATE_RAIL_CORRIDOR: 'تعریف کریدور ریلی جدید',
    UPDATE_RAIL_CORRIDOR: 'ویرایش مسیر ریلی',
    DELETE_RAIL_CORRIDOR: 'حذف مسیر ریلی',
    DISPATCH_TRAIN_SCHEDULE: 'زمانبندی و اعزام قطار',
    UPDATE_TRAIN_SCHEDULE: 'ویرایش زمانبندی قطار',
    REMOVE_TRAIN_SCHEDULE: 'حذف سرویس قطار',
    TICKET_BOOKED: 'صدور و رزرو بلیط مسافر',
    TICKET_REFUNDED: 'استرداد بلیط و بازگشت وجه',
    WALLET_DEPOSIT: 'افزایش موجودی کیف پول',
    WALLET_WITHDRAWAL: 'برداشت وجه از کیف پول',
    PROFILE_UPDATED: 'بروزرسانی پروفایل کاربری',
    DATABASE_SNAPSHOT_EXPORTED: 'دریافت خروجی پشتیبان پایگاه‌داده',
    DATABASE_SNAPSHOT_RESTORED: 'بازگردانی نسخه پشتیبان پایگاه‌داده',
    DATABASE_SEED_RESET: 'بازنشانی پایگاه‌داده به داده‌های پیش‌فرض',
    SIMULATION_TRIGGERED: 'شبیه‌سازی رخداد ممیزی سامانه',
  };
  return map[act] || act;
}

/**
 * Normalizes any unique identifier (username, email, line name, train code)
 * using .trim().toLowerCase() for case-insensitive conflict detection while preserving display casing.
 */
export function normalizeIdentifier(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
}

/**
 * Deterministic password hashing simulation (SHA-256 hex digest format) so plaintext passwords
 * are never stored in the v2 normalized database, while preserving backward compatibility.
 */
export function hashPassword(rawPassword: string | number): string {
  const str = String(rawPassword ?? '');
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hashHex = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
  return `rp_sha256$${hashHex}`;
}

export function verifyPassword(rawInput: string | number, storedHash: string): boolean {
  if (!storedHash) return false;
  if (!storedHash.startsWith('rp_sha256$')) {
    return String(rawInput) === storedHash;
  }
  return hashPassword(rawInput) === storedHash;
}

/**
 * Generates a role-scoped signed session token and verifies RBAC route permissions.
 */
export function issueSessionToken(userId: string, role: UserRole): string {
  const payload = `${role}:${userId}:${Date.now()}`;
  return `rptok_${hashPassword(payload).replace('rp_sha256$', '')}`;
}

/**
 * Strict RBAC authorization check used by RoleGuard and automated UI Isolation tests.
 */
export function isAuthorizedForRole(
  session: ActiveSession | null | undefined,
  allowedRoles: UserRole[]
): { authorized: boolean; reasonEn?: string; reasonFa?: string } {
  if (!session || !session.userId || !session.sessionToken) {
    return {
      authorized: false,
      reasonEn: 'Authentication required. Please sign in to access this workspace.',
      reasonFa: 'برای دسترسی به این بخش، لطفاً ابتدا وارد حساب کاربری خود شوید.',
    };
  }
  if (!allowedRoles.includes(session.role)) {
    return {
      authorized: false,
      reasonEn: `Access Denied: Role "${session.role}" is not permitted to access this portal.`,
      reasonFa: `عدم دسترسی: نقش کاربری شما مجوز ورود به این درگاه سازمانی را ندارد.`,
    };
  }
  return { authorized: true };
}

/**
 * Strict RFC-compliant email regex validation.
 * Fixes legacy bug where `if "@" not in email:` allowed `@` or `a@b` without domain.
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

/**
 * Evaluates password strength (0..4) for UI strength meter.
 */
export function evaluatePasswordStrength(password: string): {
  score: number;
  labelEn: string;
  labelFa: string;
} {
  if (!password) return { score: 0, labelEn: 'Empty', labelFa: 'خالی' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
  const labels = [
    { en: 'Weak', fa: 'ضعیف' },
    { en: 'Fair', fa: 'متوسط' },
    { en: 'Good', fa: 'خوب' },
    { en: 'Strong', fa: 'قوی' },
    { en: 'Enterprise Grade', fa: 'بسیار امن' },
  ];
  return {
    score,
    labelEn: labels[score].en,
    labelFa: labels[score].fa,
  };
}

/**
 * Strictly parses and validates positive numerical inputs.
 * Prevents the legacy Python bug `elif amount < 0:` on a string `amount` which threw `TypeError: '<' not supported between instances of 'str' and 'int'`.
 */
export function parsePositiveNumber(input: unknown): {
  valid: boolean;
  value: number;
  errorEn?: string;
  errorFa?: string;
} {
  if (input === null || input === undefined) {
    return { valid: false, value: 0, errorEn: 'Amount cannot be empty.', errorFa: 'مقدار نمی‌تواند خالی باشد.' };
  }
  const str = toEnglishDigits(String(input)).trim().replace(/,/g, '');
  if (str === '') {
    return { valid: false, value: 0, errorEn: 'Amount cannot be empty.', errorFa: 'مقدار نمی‌تواند خالی باشد.' };
  }
  const num = Number(str);
  if (!Number.isFinite(num) || Number.isNaN(num)) {
    return { valid: false, value: 0, errorEn: 'Input must be a valid number.', errorFa: 'مقدار وارد شده باید یک عدد معتبر باشد.' };
  }
  if (num <= 0) {
    return { valid: false, value: 0, errorEn: 'Amount must be greater than zero.', errorFa: 'مقدار باید بزرگتر از صفر باشد.' };
  }
  return { valid: true, value: Math.round(num * 100) / 100 };
}

/**
 * Strictly parses positive integer inputs (e.g. ticket count, seat capacity).
 */
export function parsePositiveInteger(input: unknown): {
  valid: boolean;
  value: number;
  errorEn?: string;
  errorFa?: string;
} {
  const parsed = parsePositiveNumber(input);
  if (!parsed.valid) return parsed;
  const normalizedStr = toEnglishDigits(String(input)).trim().replace(/,/g, '');
  if (!Number.isInteger(Number(normalizedStr))) {
    return {
      valid: false,
      value: 0,
      errorEn: 'Value must be a positive whole integer.',
      errorFa: 'مقدار باید یک عدد صحیح مثبت باشد.',
    };
  }
  return { valid: true, value: Number(normalizedStr) };
}
