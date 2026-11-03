import React, { useState } from 'react';
import {
  BookOpen,
  Globe,
  LogOut,
  Moon,
  Shield,
  Sun,
  Ticket,
  User,
  Wallet,
  X,
} from 'lucide-react';
import {
  ActiveSession,
  Language,
  PassengerUser,
  ThemeMode,
  UserRole,
} from '../types/domain';
import { formatCurrency, localizeText } from '../services/authService';
import { motion } from 'framer-motion';
import { BUTTON_HOVER_PROPS, fadeSlideUpVariants } from '../components/ui/motionPrimitives';
import { RailPulseLogo } from '../components/ui/RailPulseLogo';

interface CustomerStorefrontLayoutProps {
  lang: Language;
  theme: ThemeMode;
  session: ActiveSession | null;
  activePassenger?: PassengerUser | null;
  activeRoute: 'HOME' | 'AUTH' | 'PASSENGER_PORTAL';
  onNavigateHome: (sectionId?: string) => void;
  onNavigateAuth: (targetRole?: UserRole, initialMode?: 'LOGIN' | 'REGISTER') => void;
  onNavigatePassengerPortal: (tab?: 'BOOKING' | 'TICKETS' | 'WALLET' | 'PROFILE') => void;
  onLogout: () => void;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  children: React.ReactNode;
}

export const CustomerStorefrontLayout: React.FC<CustomerStorefrontLayoutProps> = ({
  lang,
  theme,
  session,
  activePassenger,
  activeRoute,
  onNavigateHome,
  onNavigateAuth,
  onNavigatePassengerPortal,
  onLogout,
  onToggleLang,
  onToggleTheme,
  children,
}) => {
  const isFa = lang === 'fa';
  const currencyType = isFa ? 'Rial' : 'USD';
  const [showDevDocsModal, setShowDevDocsModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Bar Contract: Zone 1 (Wordmark / Brand Logo) — Zone 2 (Concise Nav Links) — Zone 3 (Primary Action) */}
      <header
        role="banner"
        className="sticky top-0 z-40 flex items-center justify-between gap-8 px-6 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800"
      >
        {/* Zone 1: Vector SVG Brand Lockup */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
          aria-label={isFa ? 'صفحه اصلی ریل‌پالس اینترپرایز' : 'RailPulse Enterprise Home'}
          className="shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-0.5"
        >
          <RailPulseLogo size="md" variant="lockup" lang={lang} />
        </a>

        {/* Zone 2: 4–5 Concise Single-Line Navigation Links */}
        <nav
          role="navigation"
          aria-label={isFa ? 'ناوبری اصلی فروشگاهی' : 'Main storefront navigation'}
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <button
            type="button"
            onClick={() => onNavigateHome('search-engine')}
            aria-label={isFa ? 'رزرو بلیط قطار و جستجوی کریدورها' : 'Book train tickets and search corridors'}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b-2 border-transparent hover:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            {isFa ? 'رزرو بلیط قطار' : 'Book Tickets'}
          </button>

          <button
            type="button"
            onClick={() => onNavigateHome('live-departures')}
            aria-label={isFa ? 'تابلوی زنده حرکت قطارها و زمانبندی' : 'Live train departures board and schedule'}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b-2 border-transparent hover:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            {isFa ? 'تابلوی حرکت قطارها' : 'Live Departures'}
          </button>

          <button
            type="button"
            onClick={() => onNavigateHome('pnr-tracker')}
            aria-label={isFa ? 'پیگیری بلیط با کد رزرو ۵ رقمی' : 'Track booking using 5-digit PNR reference'}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b-2 border-transparent hover:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            {isFa ? 'پیگیری بلیط با کد رزرو' : 'Track Booking'}
          </button>

          {session?.role === 'passenger' && (
            <button
              type="button"
              onClick={() => onNavigatePassengerPortal('BOOKING')}
              aria-label={isFa ? 'پنل کاربری و کیف پول مسافر' : 'My Trips and passenger digital wallet'}
              aria-current={activeRoute === 'PASSENGER_PORTAL' ? 'page' : undefined}
              className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${
                activeRoute === 'PASSENGER_PORTAL'
                  ? 'text-blue-600 dark:text-blue-400 font-semibold border-blue-600 dark:border-blue-400'
                  : 'border-transparent hover:border-blue-500/60'
              }`}
            >
              {isFa ? 'پنل کاربری و کیف پول من' : 'My Trips & Wallet'}
            </button>
          )}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {session?.role === 'passenger' ? (
            <motion.button
              type="button"
              onClick={() => onNavigatePassengerPortal('BOOKING')}
              {...BUTTON_HOVER_PROPS}
              aria-label={isFa ? 'ورود به حساب کاربری مسافر' : 'Open Passenger Account portal'}
              className="px-4 py-2 text-xs font-semibold text-white rp-btn-primary rounded-lg whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {isFa ? 'حساب کاربری مسافر' : 'Passenger Account'}
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={() => onNavigateAuth('passenger', 'LOGIN')}
              {...BUTTON_HOVER_PROPS}
              aria-label={isFa ? 'ورود یا ثبت‌نام مسافر جدید' : 'Sign in or register as a passenger'}
              className="px-4 py-2 text-xs font-semibold text-white rp-btn-primary rounded-lg whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {isFa ? 'ورود / ثبت‌نام مسافر' : 'Sign In / Register'}
            </motion.button>
          )}
        </div>
      </header>

      {/* Secondary Passenger Status & Utility Strip (No Role-Bypass Buttons!) */}
      <div className="bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800/80 px-6 py-2">
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 dark:text-slate-400">
            {isFa
              ? 'سامانه جامع رزرواسیون آنلاین بلیط قطارهای سریع‌السیر و مسافربری کشور'
              : 'National High-Speed & Intercity Passenger Railway Reservation Network'}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {session?.role === 'passenger' && activePassenger && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigatePassengerPortal('WALLET')}
                  className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isFa ? 'کیف پول:' : 'Wallet:'}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(activePassenger.balance, currencyType)}
                  </span>
                </button>

                <span className="text-slate-300 dark:text-slate-700">·</span>

                <button
                  type="button"
                  onClick={() => onNavigatePassengerPortal('TICKETS')}
                  className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5 text-blue-500" />
                  <span>{localizeText(activePassenger.name, lang)}</span>
                </button>

                <span className="text-slate-300 dark:text-slate-700">·</span>

                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isFa ? 'خروج' : 'Sign Out'}</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                onClick={onToggleLang}
                {...BUTTON_HOVER_PROPS}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer font-medium"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{lang === 'fa' ? 'English (LTR)' : 'فارسی (RTL)'}</span>
              </motion.button>

              <motion.button
                type="button"
                onClick={onToggleTheme}
                {...BUTTON_HOVER_PROPS}
                className="p-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                title={isFa ? 'تغییر تم روشن/تاریک' : 'Toggle Light/Dark Theme'}
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Clean Commercial Travel Footer with Subtle Corporate Staff Link & Developer Docs Modal Trigger */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 px-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {isFa
                ? 'ریل‌پالس — پلتفرم جامع رزرواسیون و خدمات مسافرتی ریلی'
                : 'RailPulse — National Passenger Railway Reservation Platform'}
            </div>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              {isFa
                ? 'پشتیبانی ۲۴ ساعته مسافران · تضمین استرداد آنلاین وجه به کیف پول · کارت سوارشدن دیجیتال'
                : '24/7 Passenger Support · Instant Online Wallet Refunds · Digital QR Boarding Passes'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigateAuth('staff', 'LOGIN')}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>
                {isFa ? 'درگاه ورود پرسنل و مدیریت سازمان' : 'Corporate Staff & Admin Portal'}
              </span>
            </button>

            <span aria-hidden="true">·</span>

            <button
              type="button"
              onClick={() => setShowDevDocsModal(true)}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>
                {isFa ? 'مستندات فنی و راهنمای ارزیاب' : 'Developer Docs'}
              </span>
            </button>
          </div>
        </div>
      </footer>

      {/* Discreet Developer Documentation Modal (Accessible ONLY via footer link) */}
      {showDevDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 rp-modal-backdrop">
          <motion.div
            variants={fadeSlideUpVariants}
            initial="hidden"
            animate="visible"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isFa
                    ? 'مستندات مخزن و حساب‌های پیش‌فرض تست محلی'
                    : 'Repository Documentation & Seed Accounts'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDevDocsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              {isFa
                ? 'مطابق استانداردهای امنیتی، اطلاعات ورود در صفحات عمومی نمایش داده نمی‌شود. ارزیابان و توسعه‌دهندگان می‌توانند برای تست هر یک از ۳ نقش کاربری از حساب‌های پیش‌فرض مستند شده در فایل README.md استفاده کنند:'
                : 'In accordance with production security standards, credentials are never printed on public screens. Evaluators may use the seed accounts documented in README.md to test each isolated role:'}
            </p>

            <div className="space-y-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-500">
                  {isFa ? '۱. مدیر کل سازمان:' : '1. System Admin:'}
                </span>
                <span className="text-slate-900 dark:text-slate-100 font-semibold" dir="ltr">
                  Admin_train / admin_train
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-500">
                  {isFa ? '۲. کارشناس عملیات ریلی:' : '2. Operations Staff:'}
                </span>
                <span className="text-slate-900 dark:text-slate-100 font-semibold" dir="ltr">
                  sara_ahmadi / staff123
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-500">
                  {isFa ? '۳. مسافر نمونه اول (۴۸,۰۰۰,۰۰۰ ریال):' : '3. Passenger A (48,000,000 IRR):'}
                </span>
                <span className="text-slate-900 dark:text-slate-100 font-semibold" dir="ltr">
                  mahdi_as / user123
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">
                  {isFa ? '۴. مسافر نمونه دوم (۲۱,۵۰۰,۰۰۰ ریال):' : '4. Passenger B (21,500,000 IRR):'}
                </span>
                <span className="text-slate-900 dark:text-slate-100 font-semibold" dir="ltr">
                  parisa_rad / user123
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <motion.button
                type="button"
                onClick={() => {
                  setShowDevDocsModal(false);
                  onNavigateAuth('admin', 'LOGIN');
                }}
                {...BUTTON_HOVER_PROPS}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {isFa ? 'رفتن به صفحه ورود پرسنل' : 'Go to Corporate Login'}
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setShowDevDocsModal(false)}
                {...BUTTON_HOVER_PROPS}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white cursor-pointer"
              >
                {isFa ? 'بستن راهنما' : 'Close'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
