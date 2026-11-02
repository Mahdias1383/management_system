import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Sun,
  Train,
} from 'lucide-react';
import { ActiveSession, Language, ThemeMode } from '../types/domain';

export interface SidebarNavItem {
  id: string;
  labelFa: string;
  labelEn: string;
  icon: React.ReactNode;
  badgeCount?: number;
}

interface EnterpriseBackofficeLayoutProps {
  lang: Language;
  theme: ThemeMode;
  session: ActiveSession;
  portalTitleFa: string;
  portalTitleEn: string;
  portalSubtitleFa: string;
  portalSubtitleEn: string;
  navItems: SidebarNavItem[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onLogout: () => void;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  children: React.ReactNode;
}

export const EnterpriseBackofficeLayout: React.FC<EnterpriseBackofficeLayoutProps> = ({
  lang,
  theme,
  session,
  portalTitleFa,
  portalTitleEn,
  portalSubtitleFa,
  portalSubtitleEn,
  navItems,
  activeTabId,
  onSelectTab,
  onLogout,
  onToggleLang,
  onToggleTheme,
  children,
}) => {
  const isFa = lang === 'fa';
  const [collapsed, setCollapsed] = useState(false);

  const activeNavObj = navItems.find((item) => item.id === activeTabId) || navItems[0];

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Persistent Vertical Sidebar Navigation (260px expanded, 72px collapsed) */}
      <aside
        className={`${
          collapsed ? 'w-[72px]' : 'w-[272px]'
        } shrink-0 bg-slate-900 text-slate-100 border-e border-slate-800 flex flex-col justify-between transition-all duration-150`}
      >
        <div>
          {/* Brand Lockup */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                {session.role === 'admin' ? (
                  <Shield className="w-5 h-5" />
                ) : (
                  <Train className="w-5 h-5" />
                )}
              </div>
              {!collapsed && (
                <div className="truncate">
                  <div className="text-sm font-bold tracking-tight text-white truncate">
                    RailPulse Backoffice
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {isFa ? portalTitleFa : portalTitleEn}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title={isFa ? 'جمع‌کردن / بازکردن منو' : 'Toggle Sidebar'}
            >
              {collapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Vertical Navigation Items */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const isActive = item.id === activeTabId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                  title={isFa ? item.labelFa : item.labelEn}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <span className="truncate">{isFa ? item.labelFa : item.labelEn}</span>
                    )}
                  </div>
                  {!collapsed && item.badgeCount !== undefined && (
                    <span
                      className={`font-mono text-[11px] px-1.5 py-0.5 rounded-md ${
                        isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Authenticated Operator Profile & Sign Out */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {!collapsed && (
            <div className="px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="text-xs font-semibold text-white truncate">
                {session.displayName}
              </div>
              <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                @{session.username} ·{' '}
                {session.role === 'admin'
                  ? isFa
                    ? 'مدیر کل سیستم'
                    : 'System Admin'
                  : isFa
                  ? 'مهندس عملیات ریلی'
                  : 'Operations Staff'}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{isFa ? 'خروج از میز کار سازمانی' : 'Sign Out of Backoffice'}</span>}
          </button>
        </div>
      </aside>

      {/* Main Right/Left Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Operational Command Header (Breadcrumb + Primary Actions) */}
        <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          {/* Breadcrumb Trail */}
          <div className="flex items-center gap-2 text-xs min-w-0">
            <span className="font-semibold text-slate-500 dark:text-slate-400 truncate">
              {isFa ? portalTitleFa : portalTitleEn}
            </span>
            {isFa ? (
              <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span className="font-bold text-slate-900 dark:text-white truncate text-sm">
              {isFa ? activeNavObj?.labelFa : activeNavObj?.labelEn}
            </span>
          </div>

          {/* Right Controls: Language, Theme, Operator Pill */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="hidden lg:inline text-xs text-slate-500 dark:text-slate-400">
              {isFa ? portalSubtitleFa : portalSubtitleEn}
            </span>

            <button
              type="button"
              onClick={onToggleLang}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'fa' ? 'English (LTR)' : 'فارسی (RTL)'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
              title={isFa ? 'تغییر حالت شب/روز' : 'Toggle Theme'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Scrollable Workspace Canvas */}
        <main className="flex-1 p-6 overflow-y-auto max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
