export type AdminSidebarSection =
  | 'OVERVIEW'
  | 'ALERT_CENTER'
  | 'STAFF_HR'
  | 'AUDIT'
  | 'QA_SUITE';

export type CommandCategory =
  | 'ALL'
  | 'NAVIGATION'
  | 'ACTIONS'
  | 'REPORTS'
  | 'SYSTEM';

export type CommandIconName =
  | 'BarChart3'
  | 'Users'
  | 'Activity'
  | 'BellRing'
  | 'FileCode2'
  | 'FileSpreadsheet'
  | 'Download'
  | 'RotateCcw'
  | 'UserPlus'
  | 'Ticket'
  | 'Train'
  | 'ShieldCheck'
  | 'PlayCircle'
  | 'Globe'
  | 'Sun'
  | 'Moon'
  | 'Keyboard'
  | 'TrendingUp'
  | 'Search'
  | 'CheckCheck'
  | 'Filter';

export interface CommandItem {
  id: string;
  titleFa: string;
  titleEn: string;
  descriptionFa: string;
  descriptionEn: string;
  category: 'NAVIGATION' | 'ACTIONS' | 'REPORTS' | 'SYSTEM';
  shortcut?: string[];
  keywords: string[];
  iconName: CommandIconName;
  badge?: string;
  badgeColor?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose';
  targetSection?: AdminSidebarSection;
  action: () => void;
}

export interface ShortcutGuideItem {
  keys: string[];
  descriptionFa: string;
  descriptionEn: string;
  category: 'NAVIGATION' | 'ACTIONS' | 'REPORTS' | 'SYSTEM';
}
