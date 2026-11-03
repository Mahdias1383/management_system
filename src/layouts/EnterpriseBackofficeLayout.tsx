import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { formatDateTime, formatNumber, localizeText } from '../services/authService';
import { BUTTON_HOVER_PROPS } from '../components/ui/motionPrimitives';
import { RailPulseLogo } from '../components/ui/RailPulseLogo';

export interface SidebarNavItem {
  id: string;
  labelFa: string;
  labelEn: string;
  icon: React.ReactNode;
  badgeCount?: number;
  badgeTone?: 'default' | 'critical' | 'live';
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
  sidebarAlertSlot?: React.ReactNode;
  sidebarCollapsedSlot?: React.ReactNode;
  headerActionSlot?: React.ReactNode;
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
  sidebarAlertSlot,
  sidebarCollapsedSlot,
  headerActionSlot,
  children,
}) => {
  const isFa = lang === 'fa';
  const [collapsed, setCollapsed] = useState(false);

  const activeNavObj = navItems.find((item) => item.id === activeTabId) || navItems[0];

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Persistent Vertical Sidebar Navigation (288px expanded when Alert Center present, 72px collapsed) */}
      <aside
        className={`${
          collapsed ? 'w-[72px]' : sidebarAlertSlot ? 'w-[300px]' : 'w-[272px]'
        } shrink-0 bg-slate-900 text-slate-100 border-e border-slate-800 flex flex-col justify-between transition-all duration-150`}
      >
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Brand Lockup with Vector SVG RailPulse Logo */}
          <div className="h-16 px-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              <RailPulseLogo
                size={collapsed ? 'sm' : 'md'}
                variant={collapsed ? 'icon' : 'lockup'}
                lang={lang}
                showBadge={!collapsed}
              />
            </div>

            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={isFa ? 'جمع‌کردن / بازکردن منو' : 'Toggle Sidebar'}
              aria-label={
                collapsed
                  ? isFa
                    ? 'گسترش منوی عمودی'
                    : 'Expand sidebar navigation'
                  : isFa
                  ? 'جمع کردن منوی عمودی'
                  : 'Collapse sidebar navigation'
              }
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Vertical Navigation Items */}
          <nav className="p-3 space-y-1.5 shrink-0">
            {navItems.map((item) => {
              const isActive = item.id === activeTabId;
              const isCriticalBadge = item.badgeTone === 'critical' && (item.badgeCount || 0) > 0;
              const isLiveBadge = item.badgeTone === 'live' && (item.badgeCount || 0) > 0;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  {...BUTTON_HOVER_PROPS}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                  title={isFa ? item.labelFa : item.labelEn}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 relative">
                      {item.icon}
                      {collapsed && (item.badgeCount || 0) > 0 && isCriticalBadge && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      )}
                    </span>
                    {!collapsed && (
                      <span className="truncate">{isFa ? item.labelFa : item.labelEn}</span>
                    )}
                  </div>
                  {!collapsed && item.badgeCount !== undefined && (
                    <span
                      className={`font-mono text-[11px] px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 ${
                        isActive
                          ? 'bg-blue-700 text-white'
                          : isCriticalBadge
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : isLiveBadge
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {(isCriticalBadge || isLiveBadge) && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                            isCriticalBadge ? 'bg-rose-400' : 'bg-emerald-400'
                          }`}
                        />
                      )}
                      {formatNumber(item.badgeCount, lang)}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </nav>

          {/* Real-Time Sidebar Alert Center Feed Slot */}
          {!collapsed && sidebarAlertSlot && (
            <div className="px-3 pb-3 flex-1 flex flex-col min-h-0">
              {sidebarAlertSlot}
            </div>
          )}

          {collapsed && sidebarCollapsedSlot && (
            <div className="px-2 pb-3 flex flex-col items-center">
              {sidebarCollapsedSlot}
            </div>
          )}
        </div>

        {/* Bottom Authenticated Operator Profile & Sign Out */}
        <div className="p-3 border-t border-slate-800 space-y-2 shrink-0">
          {!collapsed && (
            <div className="px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="text-xs font-semibold text-white truncate">
                {localizeText(session.displayName, lang)}
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                <span dir="ltr">@{session.username}</span> ·{' '}
                {session.role === 'admin'
                  ? isFa
                    ? 'مدیر کل سازمان'
                    : 'System Admin'
                  : isFa
                  ? 'مهندس عملیات ریلی'
                  : 'Operations Staff'}
              </div>
            </div>
          )}

          <motion.button
            type="button"
            onClick={onLogout}
            {...BUTTON_HOVER_PROPS}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{isFa ? 'خروج از میز کار سازمانی' : 'Sign Out of Backoffice'}</span>}
          </motion.button>
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
            {headerActionSlot}
            <span className="hidden xl:inline text-xs font-mono text-slate-500 dark:text-slate-400">
              {formatDateTime(new Date(), lang, 'full')}
            </span>

            <span className="hidden lg:inline text-xs text-slate-500 dark:text-slate-400">
              {isFa ? portalSubtitleFa : portalSubtitleEn}
            </span>

            <motion.button
              type="button"
              onClick={onToggleLang}
              {...BUTTON_HOVER_PROPS}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'fa' ? 'English (LTR)' : 'فارسی (RTL)'}</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={onToggleTheme}
              {...BUTTON_HOVER_PROPS}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
              title={isFa ? 'تغییر حالت شب/روز' : 'Toggle Theme'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.button>
          </div>
        </header>

        {/* Scrollable Workspace Canvas with Framer Motion Section Transitions */}
        <main className="flex-1 p-6 overflow-y-auto max-w-[1440px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTabId}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
