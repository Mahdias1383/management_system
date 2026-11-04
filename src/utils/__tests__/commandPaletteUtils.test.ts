import { describe, expect, it } from 'vitest';
import {
  filterCommands,
  formatShortcutForPlatform,
  getCategoryLabel,
  getDefaultShortcutsCatalog,
  isEditableElement,
  normalizeSearchTerm,
} from '../commandPaletteUtils';
import { CommandItem } from '../../types/shortcuts';

describe('commandPaletteUtils — Filtering and Shortcut Helpers', () => {
  const dummyCommands: CommandItem[] = [
    {
      id: 'nav-overview',
      titleFa: 'داشبورد کلان و تحلیل درآمد',
      titleEn: 'Executive & Revenue Analytics',
      descriptionFa: 'نمودارهای ۱۲ ماهه و شاخص‌های مالی شبکه',
      descriptionEn: '12-month charts and network financial metrics',
      category: 'NAVIGATION',
      shortcut: ['G', 'O'],
      keywords: ['درآمد', 'فروش', 'مالی', 'revenue', 'sales', 'charts'],
      iconName: 'BarChart3',
      action: () => {},
    },
    {
      id: 'nav-staff',
      titleFa: 'مدیریت کارشناسان و پرسنل',
      titleEn: 'Operations Staff Directory',
      descriptionFa: 'ایجاد حساب کاربری و تعیین سطح دسترسی دیسپاچینگ',
      descriptionEn: 'Provision specialist accounts and dispatching roles',
      category: 'NAVIGATION',
      shortcut: ['G', 'S'],
      keywords: ['کارشناس', 'پرسنل', 'مهندس', 'کاربران', 'employees', 'users'],
      iconName: 'Users',
      action: () => {},
    },
    {
      id: 'act-export-audit',
      titleFa: 'خروجی کامل گزارش ممیزی (CSV)',
      titleEn: 'Export Full Compliance Audit CSV',
      descriptionFa: 'دانلود فایل اکسل/CSV دفتر کل لاگ‌های سامانه',
      descriptionEn: 'Download CSV file of all audit ledger entries',
      category: 'REPORTS',
      shortcut: ['Alt', 'E'],
      keywords: ['لاگ', 'گزارش', 'اکسل', 'csv', 'audit', 'logs'],
      iconName: 'FileSpreadsheet',
      action: () => {},
    },
    {
      id: 'sys-toggle-theme',
      titleFa: 'تغییر حالت تم (روشن / تاریک)',
      titleEn: 'Toggle Visual Theme (Light / Dark)',
      descriptionFa: 'جابجایی بین حالت تیره و روشن',
      descriptionEn: 'Switch between light and dark themes',
      category: 'SYSTEM',
      shortcut: ['Alt', 'T'],
      keywords: ['تم', 'روشن', 'تاریک', 'theme', 'dark', 'light'],
      iconName: 'Sun',
      action: () => {},
    },
  ];

  it('normalizes Persian and English search queries accurately', () => {
    expect(normalizeSearchTerm('  گزارش‌های مالي  ')).toBe('گزارش‌های مالی');
    expect(normalizeSearchTerm('  Revenue   CHARTS ')).toBe('revenue charts');
  });

  it('filters commands by query across titles, descriptions, and keywords', () => {
    const resPersian = filterCommands(dummyCommands, 'درآمد', 'ALL', 'fa');
    expect(resPersian.map((c) => c.id)).toContain('nav-overview');

    const resEnglish = filterCommands(dummyCommands, 'audit', 'ALL', 'en');
    expect(resEnglish.map((c) => c.id)).toContain('act-export-audit');

    const resKeyword = filterCommands(dummyCommands, 'کاربران', 'ALL', 'fa');
    expect(resKeyword.map((c) => c.id)).toContain('nav-staff');
  });

  it('filters commands by category', () => {
    const navItems = filterCommands(dummyCommands, '', 'NAVIGATION', 'fa');
    expect(navItems.length).toBe(2);
    expect(navItems.every((c) => c.category === 'NAVIGATION')).toBe(true);

    const reportItems = filterCommands(dummyCommands, '', 'REPORTS', 'en');
    expect(reportItems.length).toBe(1);
    expect(reportItems[0].id).toBe('act-export-audit');
  });

  it('handles empty query by returning all items matching active category', () => {
    const all = filterCommands(dummyCommands, '', 'ALL', 'fa');
    expect(all.length).toBe(dummyCommands.length);
  });

  it('formats shortcut key combinations with platform awareness', () => {
    expect(formatShortcutForPlatform(['Ctrl', 'K'], false)).toBe('Ctrl+K');
    expect(formatShortcutForPlatform(['Ctrl', 'K'], true)).toBe('⌘K');
    expect(formatShortcutForPlatform(['Alt', 'E'], false)).toBe('Alt+E');
    expect(formatShortcutForPlatform(['Alt', 'E'], true)).toBe('⌥E');
  });

  it('identifies editable DOM elements correctly to prevent shortcut clashes', () => {
    const inputMock = { tagName: 'INPUT' };
    const textareaMock = { tagName: 'TEXTAREA' };
    const selectMock = { tagName: 'select' };
    const contentEditableMock = { tagName: 'DIV', isContentEditable: true };
    const divMock = { tagName: 'DIV', isContentEditable: false };
    const buttonMock = { tagName: 'BUTTON' };

    expect(isEditableElement(inputMock)).toBe(true);
    expect(isEditableElement(textareaMock)).toBe(true);
    expect(isEditableElement(selectMock)).toBe(true);
    expect(isEditableElement(contentEditableMock)).toBe(true);
    expect(isEditableElement(divMock)).toBe(false);
    expect(isEditableElement(buttonMock)).toBe(false);
    expect(isEditableElement(null)).toBe(false);
    expect(isEditableElement(undefined)).toBe(false);
  });

  it('returns default shortcuts catalog with required keys and descriptions', () => {
    const catalogFa = getDefaultShortcutsCatalog('fa');
    const catalogEn = getDefaultShortcutsCatalog('en');

    expect(catalogFa.length).toBeGreaterThanOrEqual(8);
    expect(catalogEn.length).toBe(catalogFa.length);

    const ctrlK = catalogFa.find((s) => s.keys.includes('K'));
    expect(ctrlK).toBeDefined();
    expect(ctrlK?.descriptionFa).toContain('پالت جامع دستورات');

    const altE = catalogEn.find((s) => s.keys.includes('E'));
    expect(altE).toBeDefined();
    expect(altE?.descriptionEn).toContain('compliance audit report');
  });

  it('returns appropriate category labels in Persian and English', () => {
    expect(getCategoryLabel('NAVIGATION', 'fa')).toBe('بخش‌ها و صفحات');
    expect(getCategoryLabel('NAVIGATION', 'en')).toBe('Navigation & Screens');
    expect(getCategoryLabel('REPORTS', 'fa')).toBe('گزارش‌ها و ممیزی');
    expect(getCategoryLabel('REPORTS', 'en')).toBe('Reports & Audit');
  });
});
