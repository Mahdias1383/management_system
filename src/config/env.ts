import { Language, ThemeMode } from '../types/domain';

export interface AppEnvironmentConfig {
  appTitle: string;
  appNameFa: string;
  appVersion: string;
  appEnv: string;
  repositoryUrl: string;
  defaultLocale: Language;
  defaultTheme: ThemeMode;
  storageKey: string;
  sessionStorageKey: string;
  enableAutoMigration: boolean;
  usdExchangeRate: number;
  sessionTtlHours: number;
  enableAuditLog: boolean;
  collisionSafetyBufferMinutes: number;
  defaultStationDwellMinutes: number;
  pnrPrefix: string;
}

function getRawEnv(key: string, fallback: string): string {
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env;
    if (metaEnv && typeof metaEnv[key] === 'string' && metaEnv[key]!.trim().length > 0) {
      return metaEnv[key]!.trim();
    }
  } catch {
    // Fallback if import.meta is unavailable
  }
  return fallback;
}

function parseLocale(val: string): Language {
  return val === 'en' ? 'en' : 'fa';
}

function parseTheme(val: string): ThemeMode {
  return val === 'light' ? 'light' : 'dark';
}

function parsePositiveNumber(val: string, fallback: number): number {
  const num = Number(val);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}

export const APP_ENV: Readonly<AppEnvironmentConfig> = Object.freeze({
  appTitle: getRawEnv('VITE_APP_TITLE', 'RailPulse Enterprise'),
  appNameFa: getRawEnv(
    'VITE_APP_NAME_FA',
    'سامانه جامع مدیریت حمل‌ونقل ریلی و فروش بلیط'
  ),
  appVersion: getRawEnv('VITE_APP_VERSION', '2.4.0'),
  appEnv: getRawEnv('VITE_APP_ENV', 'development'),
  repositoryUrl: getRawEnv(
    'VITE_REPOSITORY_URL',
    'https://github.com/Mahdias1383/management_system'
  ),
  defaultLocale: parseLocale(getRawEnv('VITE_DEFAULT_LOCALE', 'fa')),
  defaultTheme: parseTheme(getRawEnv('VITE_DEFAULT_THEME', 'dark')),
  storageKey: getRawEnv('VITE_STORAGE_KEY', 'railpulse_enterprise_db_v2_irr'),
  sessionStorageKey: getRawEnv('VITE_SESSION_STORAGE_KEY', 'railpulse_active_session_v2'),
  enableAutoMigration: getRawEnv('VITE_ENABLE_AUTO_MIGRATION', 'true') !== 'false',
  usdExchangeRate:
    parsePositiveNumber(getRawEnv('VITE_USD_EXCHANGE_RATE', '100000'), 100000) || 100000,
  sessionTtlHours: parsePositiveNumber(getRawEnv('VITE_SESSION_TTL_HOURS', '8'), 8) || 8,
  enableAuditLog: getRawEnv('VITE_ENABLE_AUDIT_LOG', 'true') !== 'false',
  collisionSafetyBufferMinutes: parsePositiveNumber(
    getRawEnv('VITE_COLLISION_SAFETY_BUFFER_MINUTES', '5'),
    5
  ),
  defaultStationDwellMinutes:
    parsePositiveNumber(getRawEnv('VITE_DEFAULT_STATION_DWELL_MINUTES', '20'), 20) || 20,
  pnrPrefix: getRawEnv('VITE_PNR_PREFIX', 'RP'),
});
