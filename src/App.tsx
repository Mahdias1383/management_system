import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  FlaskConical,
  Globe,
  Home,
  LogIn,
  LogOut,
  Moon,
  Shield,
  Sun,
  Train,
  User,
  XCircle,
} from 'lucide-react';
import {
  ActiveSession,
  Language,
  PlatformDatabaseV2,
  ThemeMode,
  UserRole,
} from './types/domain';
import { loadDatabase, saveDatabase } from './services/storageAndMigration';
import { AdminPortal } from './components/AdminPortal';
import { StaffPortal } from './components/StaffPortal';
import { PassengerPortal } from './components/PassengerPortal';
import { QATestSuitePanel } from './components/QATestSuitePanel';
import { AuthPortal } from './components/AuthPortal';
import { LandingPage } from './components/LandingPage';

type TopView = 'LANDING' | 'AUTH' | 'PORTAL' | 'QA_SUITE';

interface ToastNotification {
  id: number;
  msgEn: string;
  msgFa: string;
  type: 'success' | 'error';
}

export default function App() {
  const [db, setDb] = useState<PlatformDatabaseV2>(() => loadDatabase());
  const [lang, setLang] = useState<Language>('fa');
  const [theme, setTheme] = useState<ThemeMode>('dark');

  // Start on the Enterprise Landing Page by default so users experience a real multi-role platform flow
  const [activeView, setActiveView] = useState<TopView>('LANDING');
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('passenger');
  const [authInitialMode, setAuthInitialMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const isFa = lang === 'fa';

  // Synchronize HTML dir/lang attributes for Persian RTL / English LTR
  useEffect(() => {
    document.documentElement.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  // Synchronize Dark/Light Mode class on <html>
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleUpdateDb = (nextDb: PlatformDatabaseV2) => {
    setDb(nextDb);
    saveDatabase(nextDb);
  };

  const notify = (msgEn: string, msgFa: string, type: 'success' | 'error' = 'success') => {
    setToast({ id: Date.now(), msgEn, msgFa, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const openLoginForRole = (role: UserRole = 'passenger', mode: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    setAuthInitialRole(role);
    setAuthInitialMode(mode);
    setActiveView('AUTH');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setSession(null);
    setActiveView('LANDING');
    notify(
      'You have been logged out and returned to the Landing Page.',
      'با موفقیت از حساب کاربری خارج شدید و به صفحه اصلی بازگشتید.'
    );
  };

  // One-Click Quick Persona Switcher for instant evaluation alongside full authentication
  const switchPersona = (target: 'ADMIN' | 'STAFF' | 'PASSENGER_1' | 'PASSENGER_2') => {
    if (target === 'ADMIN') {
      setSession({
        role: 'admin',
        userId: db.admin.id,
        username: db.admin.username,
        displayName: 'System Administrator',
        email: db.admin.email,
      });
      setActiveView('PORTAL');
      notify('Entered System Administrator Portal.', 'وارد پنل مدیریت کل سازمان شدید.');
    } else if (target === 'STAFF') {
      const emp = db.employees[0] || {
        id: 'emp_default',
        username: 'sara_ahmadi',
        name: 'Sara',
        lastname: 'Ahmadi',
        email: 'sara@railpulse.ir',
      };
      setSession({
        role: 'staff',
        userId: emp.id,
        username: emp.username,
        displayName: `${emp.name} ${emp.lastname}`,
        email: emp.email,
      });
      setActiveView('PORTAL');
      notify('Entered Railway Operations & Safety Staff Portal.', 'وارد پنل مهندسی و عملیات خطوط ریلی شدید.');
    } else if (target === 'PASSENGER_1') {
      const p1 = db.passengers[0];
      if (p1) {
        setSession({
          role: 'passenger',
          userId: p1.id,
          username: p1.username,
          displayName: p1.name,
          email: p1.email,
        });
        setActiveView('PORTAL');
        notify(`Entered Passenger Portal as ${p1.name}.`, `وارد پنل مسافر (${p1.name}) شدید.`);
      }
    } else if (target === 'PASSENGER_2') {
      const p2 = db.passengers[1] || db.passengers[0];
      if (p2) {
        setSession({
          role: 'passenger',
          userId: p2.id,
          username: p2.username,
          displayName: p2.name,
          email: p2.email,
        });
        setActiveView('PORTAL');
        notify(`Entered Passenger Portal as ${p2.name}.`, `وارد پنل مسافر (${p2.name}) شدید.`);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activePassengerObj =
    session?.role === 'passenger'
      ? db.passengers.find((p) => p.id === session.userId) || db.passengers[0]
      : db.passengers[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Primary Header (Strict 3-Zone Top Bar Contract) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('LANDING');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          RailPulse Enterprise
        </a>

        {/* Zone 2: 4–5 Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setActiveView('LANDING')}
            className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeView === 'LANDING' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : ''
            }`}
          >
            {isFa ? 'صفحه اصلی (خانه)' : 'Home'}
          </button>

          {session ? (
            <button
              type="button"
              onClick={() => setActiveView('PORTAL')}
              className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeView === 'PORTAL' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : ''
              }`}
            >
              {session.role === 'admin'
                ? isFa
                  ? 'پنل مدیریت کل سازمان'
                  : 'Admin Workspace'
                : session.role === 'staff'
                ? isFa
                  ? 'پنل مهندسی و عملیات ریلی'
                  : 'Dispatch Workspace'
                : isFa
                ? 'پنل کاربری و رزرو بلیط'
                : 'Passenger Workspace'}
            </button>
          ) : (
            <>
              <a
                href="#role-portals"
                onClick={() => setActiveView('LANDING')}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0"
              >
                {isFa ? 'درگاه‌های سازمانی' : 'Role Portals'}
              </a>
              <a
                href="#live-timetable"
                onClick={() => setActiveView('LANDING')}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0"
              >
                {isFa ? 'جدول حرکت قطارها' : 'Live Timetables'}
              </a>
            </>
          )}

          <button
            type="button"
            onClick={() => setActiveView('QA_SUITE')}
            className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeView === 'QA_SUITE' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : ''
            }`}
          >
            {isFa ? 'پنل تست ۵ مرحله‌ای (QA)' : 'QA Test Suite'}
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {session ? (
            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isFa ? `خروج (${session.username})` : `Sign Out (${session.username})`}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openLoginForRole('passenger', 'LOGIN')}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isFa ? 'ورود / ثبت‌نام در سامانه' : 'Sign In / Register'}
            </button>
          )}
        </div>
      </header>

      {/* Secondary Workspace & Demo Persona Bar */}
      <div className="bg-slate-100/90 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 px-6 py-2">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium me-1">
              {isFa ? 'تغییر سریع نقش (Quick Role Switcher):' : 'Quick Role Switcher:'}
            </span>

            <button
              type="button"
              onClick={() => setActiveView('LANDING')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeView === 'LANDING'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>{isFa ? 'صفحه اصلی (Landing)' : 'Landing Page'}</span>
            </button>

            <button
              type="button"
              onClick={() => switchPersona('ADMIN')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeView === 'PORTAL' && session?.role === 'admin'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isFa ? 'مدیر کل (Admin)' : 'System Admin'}</span>
            </button>

            <button
              type="button"
              onClick={() => switchPersona('STAFF')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeView === 'PORTAL' && session?.role === 'staff'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Train className="w-3.5 h-3.5" />
              <span>{isFa ? 'کارشناس ریلی (Staff)' : 'Train Staff'}</span>
            </button>

            <button
              type="button"
              onClick={() => switchPersona('PASSENGER_1')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeView === 'PORTAL' &&
                session?.role === 'passenger' &&
                session?.username === db.passengers[0]?.username
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>
                {isFa
                  ? `مسافر ۱ (${db.passengers[0]?.username || 'mahdi_as'})`
                  : `Passenger A (${db.passengers[0]?.username || 'mahdi_as'})`}
              </span>
            </button>

            {db.passengers[1] && (
              <button
                type="button"
                onClick={() => switchPersona('PASSENGER_2')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeView === 'PORTAL' &&
                  session?.role === 'passenger' &&
                  session?.username === db.passengers[1]?.username
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>
                  {isFa
                    ? `مسافر ۲ (${db.passengers[1].username})`
                    : `Passenger B (${db.passengers[1].username})`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveView('QA_SUITE')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeView === 'QA_SUITE'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>{isFa ? 'پنل تست (QA Suite)' : 'QA Suite'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {session ? (
              <div className="hidden sm:flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-mono bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                <span>{session.displayName}</span>
                <span className="text-slate-400">·</span>
                <span className="text-blue-600 dark:text-blue-400 uppercase font-semibold">
                  {session.role}
                </span>
              </div>
            ) : (
              <span className="hidden sm:inline text-slate-400">
                {isFa ? 'وضعیت: کاربر مهمان (وارد نشده)' : 'Status: Guest (Not Signed In)'}
              </span>
            )}

            <button
              type="button"
              onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer font-medium"
            >
              {lang === 'fa' ? 'EN (LTR)' : 'فارسی (RTL)'}
            </button>

            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              title={isFa ? 'تغییر حالت شب/روز' : 'Toggle Dark/Light Theme'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {session ? (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isFa ? 'خروج' : 'Logout'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openLoginForRole('passenger', 'LOGIN')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isFa ? 'فرم ورود' : 'Sign In'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Role Context Header Banner when inside a Role Portal */}
      {activeView === 'PORTAL' && session && (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3">
          <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
                {session.role === 'admin' ? (
                  <Shield className="w-5 h-5" />
                ) : session.role === 'staff' ? (
                  <Train className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {session.role === 'admin'
                    ? isFa
                      ? 'پنل مدیریت کل سازمان (System Administrator Workspace)'
                      : 'System Administrator Portal'
                    : session.role === 'staff'
                    ? isFa
                      ? 'پنل مهندسی عملیات، خطوط و ایمنی سیر و حرکت (Railway Operations & Safety Portal)'
                      : 'Train Operations & Safety Dispatch Portal'
                    : isFa
                    ? 'پنل مسافر، رزرواسیون بلیط و کیف پول دیجیتال (Passenger Booking & Wallet Portal)'
                    : 'Passenger Booking & Digital Wallet Portal'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {isFa ? 'کاربر فعال:' : 'Authenticated User:'} {session.displayName} (@{session.username}) ·{' '}
                  {session.email}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveView('LANDING')}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {isFa ? 'مشاهده صفحه اصلی (Landing)' : 'View Landing Page'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                {isFa ? 'خروج از حساب کاربری' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-5 end-5 z-50 max-w-md bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-3 shadow-xl flex items-center gap-3 text-xs">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="leading-relaxed">{isFa ? toast.msgFa : toast.msgEn}</span>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
        {activeView === 'LANDING' && (
          <LandingPage
            db={db}
            lang={lang}
            onNavigateToLogin={(role, mode) => openLoginForRole(role, mode)}
            onQuickDemoLogin={(target) => switchPersona(target)}
            onOpenQA={() => setActiveView('QA_SUITE')}
          />
        )}

        {activeView === 'AUTH' && (
          <AuthPortal
            db={db}
            onUpdateDb={handleUpdateDb}
            initialRole={authInitialRole}
            initialMode={authInitialMode}
            onBackToLanding={() => setActiveView('LANDING')}
            onLoginSuccess={(newSession) => {
              setSession(newSession);
              setActiveView('PORTAL');
            }}
            lang={lang}
            notify={notify}
          />
        )}

        {activeView === 'PORTAL' && session?.role === 'admin' && (
          <AdminPortal db={db} onUpdateDb={handleUpdateDb} lang={lang} notify={notify} />
        )}

        {activeView === 'PORTAL' && session?.role === 'staff' && (
          <StaffPortal
            db={db}
            onUpdateDb={handleUpdateDb}
            lang={lang}
            actorUsername={session.username}
            notify={notify}
          />
        )}

        {activeView === 'PORTAL' && session?.role === 'passenger' && activePassengerObj && (
          <PassengerPortal
            db={db}
            onUpdateDb={handleUpdateDb}
            currentUser={activePassengerObj}
            onUpdateSessionUsername={(newUsername, newDisplayName, newEmail) =>
              setSession({
                ...session,
                username: newUsername,
                displayName: newDisplayName,
                email: newEmail,
              })
            }
            lang={lang}
            notify={notify}
          />
        )}

        {activeView === 'QA_SUITE' && <QATestSuitePanel lang={lang} />}
      </main>

      {/* Quiet Enterprise Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 px-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            {isFa
              ? 'پلتفرم جامع مدیریت هوشمند خطوط ریلی، ایمنی سیر و حرکت و رزرواسیون بلیط — RailPulse Enterprise'
              : 'RailPulse Enterprise — Integrated Railway Operations, Collision Safety & Passenger Reservation Platform'}
          </div>
          <div className="flex items-center gap-4 font-mono">
            <span>Schema v{db.schemaVersion}.0</span>
            <span>·</span>
            <button
              type="button"
              onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
              className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'fa' ? 'Switch to English' : 'تغییر به زبان فارسی'}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
