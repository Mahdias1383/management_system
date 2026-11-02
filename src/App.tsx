import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import {
  ActiveSession,
  Language,
  PlatformDatabaseV2,
  ThemeMode,
  TrainSchedule,
  UserRole,
} from './types/domain';
import { loadDatabase, saveDatabase } from './services/storageAndMigration';
import { RoleGuard } from './guards/RoleGuard';
import { CustomerStorefrontLayout } from './layouts/CustomerStorefrontLayout';
import { PublicHomePage } from './pages/PublicHomePage';
import { AuthPage } from './pages/AuthPage';
import { PassengerDashboard } from './pages/PassengerDashboard';
import { StaffOperationsPortal } from './pages/StaffOperationsPortal';
import { AdminExecutivePortal } from './pages/AdminExecutivePortal';

type AppRoute =
  | 'HOME'
  | 'AUTH'
  | 'PASSENGER_PORTAL'
  | 'STAFF_PORTAL'
  | 'ADMIN_PORTAL';

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

  const [route, setRoute] = useState<AppRoute>('HOME');
  const [session, setSession] = useState<ActiveSession | null>(null);

  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('passenger');
  const [authInitialMode, setAuthInitialMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [passengerInitialTab, setPassengerInitialTab] = useState<
    'BOOKING' | 'TICKETS' | 'WALLET' | 'PROFILE'
  >('BOOKING');
  const [preselectedTrain, setPreselectedTrain] = useState<TrainSchedule | null>(null);
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

  const notify = (
    msgEn: string,
    msgFa: string,
    type: 'success' | 'error' = 'success'
  ) => {
    setToast({ id: Date.now(), msgEn, msgFa, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleNavigateHome = (sectionId?: string) => {
    setRoute('HOME');
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNavigateAuth = (
    targetRole: UserRole = 'passenger',
    initialMode: 'LOGIN' | 'REGISTER' = 'LOGIN'
  ) => {
    setAuthInitialRole(targetRole);
    setAuthInitialMode(initialMode);
    setRoute('AUTH');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigatePassengerPortal = (
    tab: 'BOOKING' | 'TICKETS' | 'WALLET' | 'PROFILE' = 'BOOKING'
  ) => {
    setPassengerInitialTab(tab);
    setRoute('PASSENGER_PORTAL');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setSession(null);
    setPreselectedTrain(null);
    setRoute('HOME');
    notify(
      'Signed out cleanly. Your session token has been revoked.',
      'با موفقیت از حساب کاربری خارج شدید.'
    );
  };

  const handleLoginSuccess = (newSession: ActiveSession) => {
    setSession(newSession);
    if (newSession.role === 'admin') {
      setRoute('ADMIN_PORTAL');
    } else if (newSession.role === 'staff') {
      setRoute('STAFF_PORTAL');
    } else {
      setRoute('PASSENGER_PORTAL');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTrainFromStorefront = (train: TrainSchedule) => {
    setPreselectedTrain(train);
    if (session && session.role === 'passenger') {
      setPassengerInitialTab('BOOKING');
      setRoute('PASSENGER_PORTAL');
    } else {
      notify(
        `Please sign in to your passenger account to reserve seats on ${train.name_train}.`,
        `برای انتخاب صندلی و خرید بلیط قطار «${train.name_train}»، لطفاً وارد حساب مسافری شوید.`
      );
      handleNavigateAuth('passenger', 'LOGIN');
    }
  };

  const activePassengerObj =
    session?.role === 'passenger'
      ? db.passengers.find((p) => p.id === session.userId) || null
      : null;

  return (
    <>
      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 end-5 z-50 max-w-md bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-3 shadow-xl flex items-center gap-3 text-xs">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="leading-relaxed">
            {isFa ? toast.msgFa : toast.msgEn}
          </span>
        </div>
      )}

      {/* =====================================================================
          LAYOUT 2: ENTERPRISE BACKOFFICE WORKSPACE (STAFF & ADMIN PORTALS)
          Protected strictly by RoleGuard
          ===================================================================== */}
      {route === 'STAFF_PORTAL' && (
        <RoleGuard
          session={session}
          allowedRoles={['staff']}
          lang={lang}
          onRedirectToLogin={(role) => handleNavigateAuth(role || 'staff', 'LOGIN')}
          onReturnHome={() => handleNavigateHome()}
        >
          {session && (
            <StaffOperationsPortal
              db={db}
              onUpdateDb={handleUpdateDb}
              session={session}
              lang={lang}
              theme={theme}
              onToggleLang={() => setLang(lang === 'fa' ? 'en' : 'fa')}
              onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              onLogout={handleLogout}
            />
          )}
        </RoleGuard>
      )}

      {route === 'ADMIN_PORTAL' && (
        <RoleGuard
          session={session}
          allowedRoles={['admin']}
          lang={lang}
          onRedirectToLogin={(role) => handleNavigateAuth(role || 'admin', 'LOGIN')}
          onReturnHome={() => handleNavigateHome()}
        >
          {session && (
            <AdminExecutivePortal
              db={db}
              onUpdateDb={handleUpdateDb}
              session={session}
              lang={lang}
              theme={theme}
              onToggleLang={() => setLang(lang === 'fa' ? 'en' : 'fa')}
              onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              onLogout={handleLogout}
            />
          )}
        </RoleGuard>
      )}

      {/* =====================================================================
          LAYOUT 1: B2C CUSTOMER STOREFRONT & PASSENGER RESERVATION PORTAL
          ===================================================================== */}
      {(route === 'HOME' || route === 'AUTH' || route === 'PASSENGER_PORTAL') && (
        <CustomerStorefrontLayout
          lang={lang}
          theme={theme}
          session={session}
          activePassenger={activePassengerObj}
          activeRoute={route}
          onNavigateHome={handleNavigateHome}
          onNavigateAuth={handleNavigateAuth}
          onNavigatePassengerPortal={handleNavigatePassengerPortal}
          onLogout={handleLogout}
          onToggleLang={() => setLang(lang === 'fa' ? 'en' : 'fa')}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {route === 'HOME' && (
            <PublicHomePage
              db={db}
              lang={lang}
              onSelectTrainForBooking={handleSelectTrainFromStorefront}
            />
          )}

          {route === 'AUTH' && (
            <AuthPage
              db={db}
              onUpdateDb={handleUpdateDb}
              onLoginSuccess={handleLoginSuccess}
              onBackToHome={() => handleNavigateHome()}
              initialRole={authInitialRole}
              initialMode={authInitialMode}
              lang={lang}
              notify={notify}
            />
          )}

          {route === 'PASSENGER_PORTAL' && (
            <RoleGuard
              session={session}
              allowedRoles={['passenger']}
              lang={lang}
              onRedirectToLogin={() => handleNavigateAuth('passenger', 'LOGIN')}
              onReturnHome={() => handleNavigateHome()}
            >
              {activePassengerObj && session && (
                <PassengerDashboard
                  db={db}
                  onUpdateDb={handleUpdateDb}
                  currentUser={activePassengerObj}
                  initialTab={passengerInitialTab}
                  preselectedTrain={preselectedTrain}
                  onClearPreselectedTrain={() => setPreselectedTrain(null)}
                  onUpdateSessionUsername={(
                    newUsername,
                    newDisplayName,
                    newEmail
                  ) =>
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
            </RoleGuard>
          )}
        </CustomerStorefrontLayout>
      )}
    </>
  );
}
