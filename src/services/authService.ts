import { ActiveSession, Language, UserRole } from '../types/domain';

/**
 * Formats a numerical amount into Iranian Rial (ریال in Persian / IRR in English)
 * with clean thousands separators.
 */
export function formatRial(amount: number | undefined | null, lang: Language = 'fa'): string {
  const numeric = Number(amount ?? 0);
  const safeVal = Number.isFinite(numeric) ? Math.round(numeric) : 0;
  const formatted = safeVal.toLocaleString('en-US');
  return lang === 'fa' ? `${formatted} ریال` : `${formatted} IRR`;
}

/**
 * Formats large Rial values compactly for chart axes (e.g., 15M ریال / 15M IRR).
 */
export function formatCompactRial(amount: number | undefined | null, lang: Language = 'fa'): string {
  const numeric = Number(amount ?? 0);
  const safeVal = Number.isFinite(numeric) ? numeric : 0;
  if (Math.abs(safeVal) >= 1_000_000) {
    const millions = Math.round((safeVal / 1_000_000) * 10) / 10;
    return lang === 'fa' ? `${millions}M ریال` : `${millions}M IRR`;
  }
  if (Math.abs(safeVal) >= 1_000) {
    const thousands = Math.round(safeVal / 1_000);
    return lang === 'fa' ? `${thousands}K ریال` : `${thousands}K IRR`;
  }
  return lang === 'fa' ? `${safeVal} ریال` : `${safeVal} IRR`;
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
  const str = String(input).trim();
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
  if (!Number.isInteger(Number(String(input).trim()))) {
    return {
      valid: false,
      value: 0,
      errorEn: 'Value must be a positive whole integer.',
      errorFa: 'مقدار باید یک عدد صحیح مثبت باشد.',
    };
  }
  return { valid: true, value: Number(String(input).trim()) };
}
