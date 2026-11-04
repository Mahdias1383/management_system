import {
  CommandCategory,
  CommandItem,
  ShortcutGuideItem,
} from '../types/shortcuts';

/**
 * Checks whether an event target is an active editable input control
 * (e.g., input, textarea, select, or contenteditable) to avoid capturing
 * non-modified single-letter shortcut keys while the user is typing.
 */
export function isEditableElement(target: unknown): boolean {
  if (!target || typeof target !== 'object') {
    return false;
  }
  const el = target as { tagName?: unknown; isContentEditable?: unknown };
  const tagName = typeof el.tagName === 'string' ? el.tagName.toUpperCase() : '';
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }
  if (el.isContentEditable === true) {
    return true;
  }
  return false;
}

/**
 * Normalizes strings by lowercasing, trimming, and replacing Persian Arabic letters
 * (ي to ی, ك to ک) for resilient fuzzy search.
 */
export function normalizeSearchTerm(term: string): string {
  return term
    .toLowerCase()
    .trim()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ـ\s]+/g, ' ');
}

/**
 * Filters command palette items by search query and category.
 * If query has multiple whitespace-separated tokens, all tokens must match.
 */
export function filterCommands(
  commands: CommandItem[],
  query: string,
  category: CommandCategory = 'ALL',
  lang: 'fa' | 'en' = 'fa'
): CommandItem[] {
  const normQuery = normalizeSearchTerm(query);
  const tokens = normQuery ? normQuery.split(/\s+/).filter(Boolean) : [];

  return commands.filter((cmd) => {
    // 1. Category filter
    if (category !== 'ALL' && cmd.category !== category) {
      return false;
    }

    // If no query, include all in category
    if (tokens.length === 0) {
      return true;
    }

    // 2. Multi-token text matching across titles, descriptions, keywords, shortcuts, and badge
    const searchCorpus = [
      normalizeSearchTerm(cmd.titleFa),
      normalizeSearchTerm(cmd.titleEn),
      normalizeSearchTerm(cmd.descriptionFa),
      normalizeSearchTerm(cmd.descriptionEn),
      ...(cmd.keywords || []).map(normalizeSearchTerm),
      ...(cmd.shortcut || []).map(normalizeSearchTerm),
      cmd.badge ? normalizeSearchTerm(cmd.badge) : '',
    ].join(' ');

    return tokens.every((token) => searchCorpus.includes(token));
  });
}

/**
 * Formats a key combo into clean glyphs suitable for display on Mac or Windows/Linux.
 */
export function formatShortcutForPlatform(
  keys: string[],
  isMac: boolean = false
): string {
  if (!keys || keys.length === 0) return '';
  return keys
    .map((k) => {
      if (k === 'Ctrl' && isMac) return '⌘';
      if (k === 'Alt' && isMac) return '⌥';
      if (k === 'Shift' && isMac) return '⇧';
      return k;
    })
    .join(isMac ? '' : '+');
}

/**
 * Returns localized category labels and descriptions.
 */
export function getCategoryLabel(
  category: CommandCategory,
  lang: 'fa' | 'en'
): string {
  const isFa = lang === 'fa';
  switch (category) {
    case 'NAVIGATION':
      return isFa ? 'بخش‌ها و صفحات' : 'Navigation & Screens';
    case 'ACTIONS':
      return isFa ? 'عملیات و دستورات' : 'Quick Actions';
    case 'REPORTS':
      return isFa ? 'گزارش‌ها و ممیزی' : 'Reports & Audit';
    case 'SYSTEM':
      return isFa ? 'سامانه و تنظیمات' : 'System & Settings';
    case 'ALL':
    default:
      return isFa ? 'همه دستورات' : 'All Commands';
  }
}

/**
 * Default shortcuts reference list for the shortcuts cheatsheet modal.
 */
export function getDefaultShortcutsCatalog(
  lang: 'fa' | 'en'
): ShortcutGuideItem[] {
  const isFa = lang === 'fa';
  return [
    {
      keys: ['Ctrl', 'K'],
      descriptionFa: 'باز کردن پالت جامع دستورات و جستجوی سریع',
      descriptionEn: 'Open Command Palette & instant search',
      category: 'SYSTEM',
    },
    {
      keys: ['?'],
      descriptionFa: 'مشاهده راهنمای کلیدهای میانبر سیستم',
      descriptionEn: 'Show keyboard shortcuts reference',
      category: 'SYSTEM',
    },
    {
      keys: ['Esc'],
      descriptionFa: 'بستن پالت دستورات یا پنجره‌های فعال',
      descriptionEn: 'Close command palette or active modals',
      category: 'SYSTEM',
    },
    {
      keys: ['G', 'O'],
      descriptionFa: 'رفتن به داشبورد کلان و تحلیل درآمد',
      descriptionEn: 'Go to Executive & Revenue Analytics',
      category: 'NAVIGATION',
    },
    {
      keys: ['G', 'S'],
      descriptionFa: 'رفتن به مدیریت کارشناسان و پرسنل',
      descriptionEn: 'Go to Operations Staff Directory',
      category: 'NAVIGATION',
    },
    {
      keys: ['G', 'L'],
      descriptionFa: 'رفتن به پایشگر هوشمند فعالیت‌ها و لاگ‌ها',
      descriptionEn: 'Go to Activity Monitor & Audit Logs',
      category: 'NAVIGATION',
    },
    {
      keys: ['G', 'C'],
      descriptionFa: 'رفتن به مرکز هشدارهای آنی و رادار',
      descriptionEn: 'Go to Real-Time Alert Center',
      category: 'NAVIGATION',
    },
    {
      keys: ['G', 'Q'],
      descriptionFa: 'رفتن به آزمون‌های خودکار ۵ مرحله‌ای QA',
      descriptionEn: 'Go to 5-Phase Automated QA Suite',
      category: 'NAVIGATION',
    },
    {
      keys: ['Alt', 'E'],
      descriptionFa: 'خروجی سریع گزارش ممیزی انطباق (CSV)',
      descriptionEn: 'Quick export compliance audit report (CSV)',
      category: 'REPORTS',
    },
    {
      keys: ['Alt', 'R'],
      descriptionFa: 'همگام‌سازی و بروزرسانی داده‌های بخش فعال',
      descriptionEn: 'Sync and refresh active screen data',
      category: 'ACTIONS',
    },
    {
      keys: ['Alt', 'N'],
      descriptionFa: 'ایجاد کارشناس جدید (رفتن به فرم پرسنل)',
      descriptionEn: 'Provision new specialist (open staff form)',
      category: 'ACTIONS',
    },
    {
      keys: ['Alt', 'L'],
      descriptionFa: 'تغییر زبان سیستم (فارسی / انگلیسی)',
      descriptionEn: 'Toggle system language (Persian / English)',
      category: 'SYSTEM',
    },
    {
      keys: ['Alt', 'T'],
      descriptionFa: 'تغییر تم دیداری (روشن / تاریک)',
      descriptionEn: 'Toggle visual theme (Light / Dark)',
      category: 'SYSTEM',
    },
  ];
}
