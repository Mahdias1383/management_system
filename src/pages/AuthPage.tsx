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
  normalizeIdentifier,
  verifyPassword,
} from '../services/authService';
import { deepClone } from '../services/storageAndMigration';

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
          displayName: `${emp.name} ${emp.lastname}`,
          email: emp.email,
          sessionToken: issueSessionToken(emp.id, 'staff'),
        });
        notify(
          `Signed in to Railway Operations Portal as ${emp.name}.`,
          `ورود موفق به پنل مهندسی و عملیات خطوط ریلی (${emp.name}).`
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
        displayName: pass.name,
        email: pass.email,
        sessionToken: issueSessionToken(pass.id, 'passenger'),
      });
      notify(`Welcome back, ${pass.name}!`, `خوش آمدید، ${pass.name}!`);
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
      balance: 100,
      createdAt: new Date().toISOString(),
    };

    nextDb.passengers.push(newPassenger);
    nextDb.transactions.unshift({
      id: `tx_${Date.now()}`,
      userId: newPassenger.id,
      username: newPassenger.username,
      type: 'DEPOSIT',
      amount: 100,
      runningBalance: 100,
      descriptionEn: 'New Passenger Welcome Wallet Credit',
      descriptionFa: 'اعتبار هدیه خوش‌آمدگویی ثبت‌نام مسافر جدید',
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
    <div className="max-w-lg mx-auto py-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
        >
          {isFa ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{isFa ? 'بازگشت به صفحه اصلی' : 'Back to Home'}</span>
        </button>

        {/* Clean Toggle between Passenger Login and Corporate Staff/Admin Login */}
        <button
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
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
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
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        {portalCategory === 'PASSENGER' ? (
          <>
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
              <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
                <User className="w-5 h-5" />
              </div>
            </div>

            {/* Sign In / Register Switch */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => setMode('LOGIN')}
                className={`py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                  mode === 'LOGIN'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                {isFa ? 'ورود به حساب' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => setMode('REGISTER')}
                className={`py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                  mode === 'REGISTER'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                {isFa ? 'ثبت‌نام مسافر جدید' : 'Create Account'}
              </button>
            </div>

            {mode === 'LOGIN' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
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

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
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

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isFa ? 'ورود به پنل مسافر' : 'Sign In'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterPassenger} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
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

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
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

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
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

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
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

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isFa ? 'ایجاد حساب کاربری مسافر' : 'Create Passenger Account'}</span>
                </button>
              </form>
            )}
          </>
        ) : (
          /* Corporate Staff & System Admin Authentication */
          <>
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
              <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white">
                <Shield className="w-5 h-5" />
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {isFa ? 'انتخاب سطح دسترسی سازمانی:' : 'Select Backoffice Department:'}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('staff')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                      selectedRole === 'staff'
                        ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Train className="w-4 h-4" />
                    <span>{isFa ? 'کارشناس عملیات ریلی' : 'Operations Staff'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('admin')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                      selectedRole === 'admin'
                        ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>{isFa ? 'مدیر کل سازمان' : 'System Admin'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
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

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
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

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer"
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
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
