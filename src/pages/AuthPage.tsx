import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Lock,
  Shield,
  Train,
  User,
  UserPlus,
} from 'lucide-react';
import { ActiveSession, Language, PlatformDatabaseV2, UserRole } from '../types/domain';
import {
  hashPassword,
  issueSessionToken,
  isValidEmail,
  localizeText,
  normalizeIdentifier,
  verifyPassword,
} from '../services/authService';
import { deepClone } from '../services/storageAndMigration';
import { motion } from 'framer-motion';
import {
  BUTTON_HOVER_PROPS,
  fadeSlideUpVariants,
  interactiveCardVariants,
} from '../components/ui/motionPrimitives';
import { RailPulseLogo } from '../components/ui/RailPulseLogo';

interface AuthPageProps {
  db: PlatformDatabaseV2;
  onUpdateDb: (nextDb: PlatformDatabaseV2) => void;
  onLoginSuccess: (session: ActiveSession) => void;
  onBackToHome: () => void;
  initialRole?: UserRole;
  initialMode?: 'LOGIN' | 'REGISTER';
  lang: Language;
  notify: (msgEn: string, msgFa: string, type?: 'success' | 'error') => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  db,
  onUpdateDb,
  onLoginSuccess,
  onBackToHome,
  initialRole = 'passenger',
  initialMode = 'LOGIN',
  lang,
  notify,
}) => {
  const isFa = lang === 'fa';
  const [portalCategory, setPortalCategory] = useState<'PASSENGER' | 'CORPORATE'>(
    initialRole === 'passenger' ? 'PASSENGER' : 'CORPORATE'
  );
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);

  useEffect(() => {
    setSelectedRole(initialRole);
    setPortalCategory(initialRole === 'passenger' ? 'PASSENGER' : 'CORPORATE');
  }, [initialRole]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Login inputs
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Passenger Registration inputs
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const normUser = normalizeIdentifier(loginUsername);

    if (selectedRole === 'admin') {
      if (
        normUser === normalizeIdentifier(db.admin.username) &&
        verifyPassword(loginPassword, db.admin.passwordHash)
      ) {
        onLoginSuccess({
          role: 'admin',
          userId: db.admin.id,
          username: db.admin.username,
          displayName: `${db.admin.name} ${db.admin.lastname}`,
          email: db.admin.email,
          sessionToken: issueSessionToken(db.admin.id, 'admin'),
        });
        notify(
          'Signed in to System Administrator Backoffice.',
          'ورود موفق به میز کار مدیریت کل سازمان.'
        );
      } else {
        notify(
          'Invalid Administrator username or password.',
          'نام کاربری یا رمز عبور مدیر کل اشتباه است.',
          'error'
        );
      }
      return;
    }

    if (selectedRole === 'staff') {
      const emp = db.employees.find(
        (item) =>
          normalizeIdentifier(item.username) === normUser &&
          verifyPassword(loginPassword, item.passwordHash)
      );
      if (emp) {
        if (emp.status === 'Suspended') {
          notify(
            'This staff account is currently suspended.',
            'حساب کاربری این کارشناس در حال حاضر تعلیق شده است.',
            'error'
          );
          return;
        }
        onLoginSuccess({
          role: 'staff',
          userId: emp.id,
          username: emp.username,
          displayName: `${localizeText(emp.name, lang)} ${localizeText(emp.lastname, lang)}`,
          email: emp.email,
          sessionToken: issueSessionToken(emp.id, 'staff'),
        });
        notify(
          `Signed in to Railway Operations Portal as ${localizeText(emp.name, 'en')}.`,
          `ورود موفق به پنل مهندسی و عملیات خطوط ریلی (${localizeText(emp.name, 'fa')} ${localizeText(emp.lastname, 'fa')}).`
        );
      } else {
        notify(
          'Invalid Railway Operations Staff username or password.',
          'نام کاربری یا رمز عبور کارشناس عملیات ریلی اشتباه است.',
          'error'
        );
      }
      return;
    }

    // Passenger login
    const pass = db.passengers.find(
      (item) =>
        normalizeIdentifier(item.username) === normUser &&
        verifyPassword(loginPassword, item.passwordHash)
    );
    if (pass) {
      onLoginSuccess({
        role: 'passenger',
        userId: pass.id,
        username: pass.username,
        displayName: localizeText(pass.name, lang),
        email: pass.email,
        sessionToken: issueSessionToken(pass.id, 'passenger'),
      });
      notify(
        `Welcome back, ${localizeText(pass.name, 'en')}!`,
        `خوش آمدید، ${localizeText(pass.name, 'fa')}!`
      );
    } else {
      notify(
        'Invalid Passenger username or password.',
        'نام کاربری یا رمز عبور مسافر اشتباه است.',
        'error'
      );
    }
  };

  const handleRegisterPassenger = (e: React.FormEvent) => {
    e.preventDefault();
    const trimName = regName.trim();
    const trimUser = regUsername.trim();
    const trimEmail = regEmail.trim();

    if (!trimName || !trimUser || !trimEmail || !regPassword) {
      notify(
        'All registration fields are required.',
        'تکمیل تمامی فیلدهای ثبت‌نام الزامی است.',
        'error'
      );
      return;
    }

    if (!isValidEmail(trimEmail)) {
      notify(
        'Please enter a valid email address.',
        'لطفاً یک آدرس ایمیل معتبر وارد کنید.',
        'error'
      );
      return;
    }

    const normUser = normalizeIdentifier(trimUser);
    const normEmail = normalizeIdentifier(trimEmail);

    if (
      db.passengers.some((u) => normalizeIdentifier(u.username) === normUser) ||
      db.employees.some((e) => normalizeIdentifier(e.username) === normUser) ||
      normalizeIdentifier(db.admin.username) === normUser
    ) {
      notify('Username is already taken!', 'این نام کاربری قبلاً انتخاب شده است!', 'error');
      return;
    }

    if (db.passengers.some((u) => normalizeIdentifier(u.email) === normEmail)) {
      notify('Email is already registered!', 'این ایمیل قبلاً ثبت شده است!', 'error');
      return;
    }

    const nextDb = deepClone(db);
    const newPassenger = {
      id: `usr_${Date.now()}`,
      name: trimName,
      username: trimUser,
      email: trimEmail.toLowerCase(),
      passwordHash: hashPassword(regPassword),
      balance: 10000000,
      createdAt: new Date().toISOString(),
    };

    nextDb.passengers.push(newPassenger);
    nextDb.transactions.unshift({
      id: `tx_${Date.now()}`,
      userId: newPassenger.id,
      username: newPassenger.username,
      type: 'DEPOSIT',
      amount: 10000000,
      runningBalance: 10000000,
      descriptionEn: 'New Passenger Welcome Wallet Credit (10,000,000 IRR)',
      descriptionFa: 'اعتبار هدیه خوش‌آمدگویی ثبت‌نام مسافر جدید (۱۰,۰۰۰,۰۰۰ ریال)',
      timestamp: newPassenger.createdAt,
    });

    onUpdateDb(nextDb);
    onLoginSuccess({
      role: 'passenger',
      userId: newPassenger.id,
      username: newPassenger.username,
      displayName: newPassenger.name,
      email: newPassenger.email,
      sessionToken: issueSessionToken(newPassenger.id, 'passenger'),
    });
    notify(
      `Account created for ${newPassenger.name}!`,
      `حساب کاربری ${newPassenger.name} با موفقیت ایجاد شد!`
    );
  };

  return (
    <motion.div
      variants={fadeSlideUpVariants}
      initial="hidden"
      animate="visible"
      className="max-w-lg mx-auto py-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <motion.button
          type="button"
          onClick={onBackToHome}
          {...BUTTON_HOVER_PROPS}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          {isFa ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{isFa ? 'بازگشت به صفحه اصلی' : 'Back to Home'}</span>
        </motion.button>

        {/* Clean Toggle between Passenger Login and Corporate Staff/Admin Login */}
        <motion.button
          type="button"
          onClick={() => {
            if (portalCategory === 'PASSENGER') {
              setPortalCategory('CORPORATE');
              setSelectedRole('staff');
              setMode('LOGIN');
            } else {
              setPortalCategory('PASSENGER');
              setSelectedRole('passenger');
            }
          }}
          {...BUTTON_HOVER_PROPS}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>
            {portalCategory === 'PASSENGER'
              ? isFa
                ? 'ورود پرسنل و مدیران سازمان'
                : 'Corporate Staff & Admin Login'
              : isFa
              ? 'بازگشت به ورود مسافران'
              : 'Switch to Passenger Login'}
          </span>
        </motion.button>
      </div>

      <motion.div
        variants={interactiveCardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-md"
      >
        <div className="flex justify-center mb-6 pb-5 border-b border-slate-200 dark:border-slate-800">
          <RailPulseLogo size="lg" variant="lockup" lang={lang} />
        </div>

        {portalCategory === 'PASSENGER' ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {mode === 'LOGIN'
                    ? isFa
                      ? 'ورود به حساب کاربری مسافر'
                      : 'Passenger Sign In'
                    : isFa
                    ? 'ثبت‌نام مسافر جدید'
                    : 'Create Passenger Account'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isFa
                    ? 'دسترسی به رزرو بلیط، کارت سوارشدن دیجیتال و کیف پول شخصی'
                    : 'Manage your train bookings, QR boarding passes, and digital wallet'}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 shadow-xs">
                <User className="w-5 h-5" />
              </div>
            </div>

            {/* Sign In / Register Switch */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl mb-5 border border-slate-200/70 dark:border-slate-800/70">
              <motion.button
                type="button"
                onClick={() => setMode('LOGIN')}
                {...BUTTON_HOVER_PROPS}
                className={`py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all duration-150 ${
                  mode === 'LOGIN'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                {isFa ? 'ورود به حساب' : 'Sign In'}
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setMode('REGISTER')}
                {...BUTTON_HOVER_PROPS}
                className={`py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all duration-150 ${
                  mode === 'REGISTER'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                {isFa ? 'ثبت‌نام مسافر جدید' : 'Create Account'}
              </motion.button>
            </div>

            {mode === 'LOGIN' ? (
              <form onSubmit={handleLogin} className="space-y-4 rp-animate-in">
                <div className="group">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                    {isFa ? 'نام کاربری' : 'Username'}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder={isFa ? 'نام کاربری خود را وارد کنید' : 'Enter your username'}
                    className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                    {isFa ? 'رمز عبور' : 'Password'}
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <motion.button
                  type="submit"
                  {...BUTTON_HOVER_PROPS}
                  className="rp-btn-primary w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-sm font-semibold cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isFa ? 'ورود به پنل مسافر' : 'Sign In'}</span>
                </motion.button>
              </form>
            ) : (
              <form onSubmit={handleRegisterPassenger} className="space-y-3.5 rp-animate-in">
                <div className="group">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                    {isFa ? 'نام و نام خانوادگی' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder={isFa ? 'مثال: آرش کمالی' : 'e.g. Arash Kamali'}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                    {isFa ? 'نام کاربری یکتا' : 'Username'}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="arash_k"
                    className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                    {isFa ? 'پست الکترونیک' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div className="group">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                    {isFa ? 'رمز عبور' : 'Password'}
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <motion.button
                  type="submit"
                  {...BUTTON_HOVER_PROPS}
                  className="rp-btn-emerald w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-sm font-semibold cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isFa ? 'ایجاد حساب کاربری مسافر' : 'Create Passenger Account'}</span>
                </motion.button>
              </form>
            )}
          </div>
        ) : (
          /* Corporate Staff & System Admin Authentication */
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isFa
                    ? 'درگاه ورود پرسنل عملیات و مدیریت سازمان'
                    : 'Corporate Operations & Executive Sign In'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isFa
                    ? 'ورود ایزوله ویژه مهندسان مرکز کنترل ترافیک ریلی و مدیران ارشد سیستم'
                    : 'Strictly isolated backoffice access for authorized railway staff and administrators'}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white shadow-xs">
                <Shield className="w-5 h-5" />
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  {isFa ? 'انتخاب سطح دسترسی سازمانی:' : 'Select Backoffice Department:'}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <motion.button
                    type="button"
                    onClick={() => setSelectedRole('staff')}
                    {...BUTTON_HOVER_PROPS}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-150 ${
                      selectedRole === 'staff'
                        ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <Train className="w-4 h-4" />
                    <span>{isFa ? 'کارشناس عملیات ریلی' : 'Operations Staff'}</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setSelectedRole('admin')}
                    {...BUTTON_HOVER_PROPS}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-150 ${
                      selectedRole === 'admin'
                        ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>{isFa ? 'مدیر کل سازمان' : 'System Admin'}</span>
                  </motion.button>
                </div>
              </div>

              <div className="group">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                  {isFa ? 'نام کاربری سازمانی' : 'Corporate Username'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder={isFa ? 'شناسه کاربری پرسنلی' : 'Enter staff or admin username'}
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="group">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                  {isFa ? 'رمز عبور سازمانی' : 'Password'}
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <motion.button
                type="submit"
                {...BUTTON_HOVER_PROPS}
                className="rp-btn-primary w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-sm font-semibold cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {selectedRole === 'admin'
                    ? isFa
                      ? 'ورود به میز کار مدیریت کل'
                      : 'Sign In to Admin Backoffice'
                    : isFa
                    ? 'ورود به میز کار مهندسی و عملیات ریلی'
                    : 'Sign In to Operations Backoffice'}
                </span>
              </motion.button>
            </form>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
