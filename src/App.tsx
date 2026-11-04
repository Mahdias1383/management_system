import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import {
  ActiveSession,
  Language,
  PlatformDatabaseV2,
  ThemeMode,
  TrainSchedule,
  UserRole,
} from './types';
import { APP_ENV } from './config';
import { loadDatabase, saveDatabase, localizeText } from './services';
import { RoleGuard } from './guards';
import { CustomerStorefrontLayout } from './layouts';
import { ToastNotificationBanner, ToastNotificationItem } from './components/ui';
import { PublicHomePage, AuthPage } from './pages/public';
import { PassengerDashboard } from './pages/passenger';
import { StaffOperationsPortal } from './pages/staff';
import { AdminExecutivePortal } from './pages/admin';
import { syncAdaptiveSplashScreensInDom } from './utils/pwaSplashGenerator';

type AppRoute =
  | 'HOME'
  | 'AUTH'
  | 'PASSENGER_PORTAL'
  | 'STAFF_PORTAL'
  | 'ADMIN_PORTAL';

const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 16,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 1, 1],
    },
  },
};

export default function App() {
  const [db, setDb] = useState<PlatformDatabaseV2>(() => loadDatabase());
  const [lang, setLang] = useState<Language>(APP_ENV.defaultLocale);
  const [theme, setTheme] = useState<ThemeMode>(APP_ENV.defaultTheme);

  const [session, setSession] = useState<ActiveSession | null>(() => {
    try {
      const stored = localStorage.getItem(APP_ENV.sessionStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as ActiveSession;
        if (parsed && parsed.userId && parsed.role) return parsed;
      }
    } catch {
      // fallback
    }
    return null;
  });

  const [route, setRoute] = useState<AppRoute>(() => {
    try {
      const stored = localStorage.getItem(APP_ENV.sessionStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as ActiveSession;
        if (parsed?.role === 'admin') return 'ADMIN_PORTAL';
        if (parsed?.role === 'staff') return 'STAFF_PORTAL';
        if (parsed?.role === 'passenger') return 'PASSENGER_PORTAL';
      }
    } catch {
      // fallback
    }
    return 'HOME';
  });

  useEffect(() => {
    try {
      if (session) {
        localStorage.setItem(APP_ENV.sessionStorageKey, JSON.stringify(session));
      } else {
        localStorage.removeItem(APP_ENV.sessionStorageKey);
      }
    } catch {
      // ignore
    }
  }, [session]);

  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('passenger');
  const [authInitialMode, setAuthInitialMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [passengerInitialTab, setPassengerInitialTab] = useState<
    'BOOKING' | 'TICKETS' | 'WALLET' | 'PROFILE'
  >('BOOKING');
  const [preselectedTrain, setPreselectedTrain] = useState<TrainSchedule | null>(null);
  const [toast, setToast] = useState<ToastNotificationItem | null>(null);

  const isFa = lang === 'fa';

  // Synchronize HTML dir/lang attributes for Persian RTL / English LTR
  useEffect(() => {
    document.documentElement.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  // Synchronize Dark/Light Mode class on <html> & adaptive PWA splash metadata
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    syncAdaptiveSplashScreensInDom(theme, lang);
  }, [theme, lang]);

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
        `Please sign in to your passenger account to reserve seats on ${localizeText(train.name_train, 'en')}.`,
        `برای انتخاب صندلی و خرید بلیط «${localizeText(train.name_train, 'fa')}»، لطفاً وارد حساب مسافری شوید.`
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
      {/* Global Toast Notification with Framer Motion */}
      <ToastNotificationBanner
        toast={toast}
        lang={lang}
        onDismiss={() => setToast(null)}
      />

      <AnimatePresence mode="wait">
        {/* =====================================================================
            LAYOUT 2: ENTERPRISE BACKOFFICE WORKSPACE (STAFF & ADMIN PORTALS)
            Protected strictly by RoleGuard
            ===================================================================== */}
        {route === 'STAFF_PORTAL' && (
          <motion.div
            key="route-staff-portal"
            variants={pageTransitionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
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
          </motion.div>
        )}

        {route === 'ADMIN_PORTAL' && (
          <motion.div
            key="route-admin-portal"
            variants={pageTransitionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
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
          </motion.div>
        )}

        {/* =====================================================================
            LAYOUT 1: B2C CUSTOMER STOREFRONT & PASSENGER RESERVATION PORTAL
            ===================================================================== */}
        {(route === 'HOME' || route === 'AUTH' || route === 'PASSENGER_PORTAL') && (
          <motion.div
            key="layout-customer-storefront"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
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
              <AnimatePresence mode="wait">
                {route === 'HOME' && (
                  <motion.div
                    key="route-home"
                    variants={pageTransitionVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <PublicHomePage
                      db={db}
                      lang={lang}
                      onSelectTrainForBooking={handleSelectTrainFromStorefront}
                    />
                  </motion.div>
                )}

                {route === 'AUTH' && (
                  <motion.div
                    key={`route-auth-${authInitialRole}-${authInitialMode}`}
                    variants={pageTransitionVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
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
                  </motion.div>
                )}

                {route === 'PASSENGER_PORTAL' && (
                  <motion.div
                    key="route-passenger-portal"
                    variants={pageTransitionVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>
            </CustomerStorefrontLayout>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
