import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Lock,
  Shield,
  Train,
  User,
  UserPlus,
} from 'lucide-react';
import { ActiveSession, Language, PlatformDatabaseV2, UserRole } from '../types/domain';
import {
  hashPassword,
  isValidEmail,
  normalizeIdentifier,
  verifyPassword,
} from '../services/authService';
import { deepClone } from '../services/storageAndMigration';

interface AuthPortalProps {
  db: PlatformDatabaseV2;
  onUpdateDb: (nextDb: PlatformDatabaseV2) => void;
  onLoginSuccess: (session: ActiveSession) => void;
  onBackToLanding?: () => void;
  initialRole?: UserRole;
  initialMode?: 'LOGIN' | 'REGISTER';
  lang: Language;
  notify: (msgEn: string, msgFa: string, type?: 'success' | 'error') => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  db,
  onUpdateDb,
  onLoginSuccess,
  onBackToLanding,
  initialRole = 'passenger',
  initialMode = 'LOGIN',
  lang,
  notify,
}) => {
  const isFa = lang === 'fa';
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);

  useEffect(() => {
    setSelectedRole(initialRole);
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
        });
        notify('Logged in as System Administrator.', 'ورود موفق به پنل مدیریت کل سازمان.');
      } else {
        notify(
          'Invalid Admin username or password (Default: Admin_train / admin_train).',
          'نام کاربری یا رمز عبور مدیر اشتباه است (پیش‌فرض: Admin_train / admin_train).',
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
        onLoginSuccess({
          role: 'staff',
          userId: emp.id,
          username: emp.username,
          displayName: `${emp.name} ${emp.lastname}`,
          email: emp.email,
        });
        notify(`Welcome back, ${emp.name}!`, `خوش آمدید، مهندس ${emp.name}!`);
      } else {
        notify(
          'Invalid Train Operations Staff credentials.',
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
      });
      notify(`Welcome, ${pass.name}!`, `خوش آمدید، ${pass.name}!`);
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
      notify('All registration fields are required.', 'پر کردن تمامی فیلدهای ثبت‌نام الزامی است.', 'error');
      return;
    }

    if (!isValidEmail(trimEmail)) {
      notify('Please enter a valid email address.', 'لطفاً یک آدرس ایمیل معتبر وارد کنید.', 'error');
      return;
    }

    const normUser = normalizeIdentifier(trimUser);
    const normEmail = normalizeIdentifier(trimEmail);

    if (
      db.passengers.some((u) => normalizeIdentifier(u.username) === normUser) ||
      db.employees.some((e) => normalizeIdentifier(e.username) === normUser) ||
      normalizeIdentifier(db.admin.username) === normUser
    ) {
      notify('Username is already taken!', 'این نام کاربری قبلاً ثبت شده است!', 'error');
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
      balance: 100, // Welcome bonus credit for smooth evaluation
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
      descriptionEn: 'New Passenger Registration Welcome Wallet Credit',
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
    });
    notify(
      `Account created for ${newPassenger.name} with $100.00 welcome wallet balance!`,
      `حساب کاربری ${newPassenger.name} با موفقیت ایجاد و ۱۰۰ دلار اعتبار اولیه شارژ شد!`
    );
  };

  const fillAndLoginInstantly = (role: UserRole, usernameStr: string, passwordStr: string) => {
    setMode('LOGIN');
    setSelectedRole(role);
    setLoginUsername(usernameStr);
    setLoginPassword(passwordStr);
  };

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-4">
      {onBackToLanding && (
        <div>
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
          >
            {isFa ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{isFa ? 'بازگشت به صفحه اصلی پلتفرم (Landing Page)' : 'Back to Platform Landing Page'}</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Auth Form */}
        <div className="md:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
              <button
                type="button"
                onClick={() => setMode('LOGIN')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                  mode === 'LOGIN'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                {isFa ? 'ورود به سامانه (Sign In)' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setSelectedRole('passenger');
                }}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                  mode === 'REGISTER'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                {isFa ? 'ثبت‌نام مسافر جدید (Register)' : 'Passenger Registration'}
              </button>
            </div>
          </div>

          {mode === 'LOGIN' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {isFa ? 'انتخاب درگاه و نقش کاربری (Select User Role):' : 'Select Portal Role:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('admin')}
                    className={`flex flex-col items-center p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                      selectedRole === 'admin'
                        ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Shield className="w-4 h-4 mb-1" />
                    <span>{isFa ? 'مدیر کل سیستم' : 'System Admin'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('staff')}
                    className={`flex flex-col items-center p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                      selectedRole === 'staff'
                        ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Train className="w-4 h-4 mb-1" />
                    <span>{isFa ? 'کارشناس ریلی' : 'Train Staff'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('passenger')}
                    className={`flex flex-col items-center p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                      selectedRole === 'passenger'
                        ? 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <User className="w-4 h-4 mb-1" />
                    <span>{isFa ? 'مسافر عادی' : 'Passenger'}</span>
                  </button>
                </div>
              </div>

              {/* Role Capability Preview Banner */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                {selectedRole === 'admin' && (
                  <span>
                    {isFa
                      ? 'امکانات پنل مدیر کل: داشبورد تحلیل درآمد ۳۰ روزه، مدیریت کارمندان عملیات ریلی (افزودن/ویرایش/حذف) و ممیزی سیستم.'
                      : 'Admin Capabilities: 30-day revenue analytics, employee CRUD provisioning, and system audit logs.'}
                  </span>
                )}
                {selectedRole === 'staff' && (
                  <span>
                    {isFa
                      ? 'امکانات پنل کارشناس ریلی: تعریف خطوط و ایستگاه‌ها، زمانبندی ناوگان قطارها، موتور تشخیص برخورد (checkAccident) و گراف ماری.'
                      : 'Staff Capabilities: Railway line topology CRUD, train scheduling, checkAccident collision guard, and Marey chart.'}
                  </span>
                )}
                {selectedRole === 'passenger' && (
                  <span>
                    {isFa
                      ? 'امکانات پنل مسافر: جستجو و رزرو آنلاین قطار، دریافت کارت سوارشدن QR، کیف پول دیجیتال (شارژ/برداشت) و ویرایش پروفایل.'
                      : 'Passenger Capabilities: Smart train search & ticket booking, QR boarding pass, digital wallet, and profile settings.'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'نام کاربری (username)' : 'Username'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Admin_train / sara_ahmadi / mahdi_as"
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'رمز عبور (password)' : 'Password'}
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {isFa
                    ? `ورود به پنل ${
                        selectedRole === 'admin'
                          ? 'مدیریت کل'
                          : selectedRole === 'staff'
                          ? 'عملیات ریلی'
                          : 'مسافر'
                      }`
                    : `Sign In to ${selectedRole.toUpperCase()} Portal`}
                </span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterPassenger} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'نام و نام خانوادگی (name)' : 'Full Name'}
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder={isFa ? 'مثال: آرش کمالی' : 'e.g. Arash Kamali'}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'نام کاربری یکتا (username)' : 'Username'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="arash_k"
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'ایمیل معتبر (email)' : 'Email Address'}
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="arash@example.com"
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'رمز عبور (password)' : 'Password'}
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isFa ? 'ثبت‌نام و ورود به پنل مسافر (+۱۰۰$ هدیه)' : 'Register & Enter Passenger Portal'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Pre-Seeded Accounts Helper Card */}
        <div className="md:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-3">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-sm font-bold">
                {isFa ? 'حساب‌های کاربری آماده جهت تست (Demo Accounts)' : 'Pre-Seeded Role Accounts'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              {isFa
                ? 'با کلیک روی هر یک از نقش‌های زیر، نام کاربری و رمز عبور آن نقش در فرم قرار می‌گیرد:'
                : 'Click any account below to auto-fill credentials for that role:'}
            </p>

            <div className="space-y-2.5 text-xs">
              <button
                type="button"
                onClick={() => fillAndLoginInstantly('admin', 'Admin_train', 'admin_train')}
                className="w-full text-start p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {isFa ? '۱. مدیر کل سیستم (System Admin)' : '1. System Administrator'}
                </div>
                <div className="font-mono text-slate-500 mt-1">
                  user: <strong className="text-blue-600 dark:text-blue-400">Admin_train</strong> · pass:{' '}
                  <strong>admin_train</strong>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  fillAndLoginInstantly('staff', db.employees[0]?.username || 'sara_ahmadi', 'staff123')
                }
                className="w-full text-start p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {isFa ? '۲. کارشناس عملیات ریلی (Train Staff)' : '2. Railway Operations Staff'}
                </div>
                <div className="font-mono text-slate-500 mt-1">
                  user:{' '}
                  <strong className="text-blue-600 dark:text-blue-400">
                    {db.employees[0]?.username || 'sara_ahmadi'}
                  </strong>{' '}
                  · pass: <strong>staff123</strong>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  fillAndLoginInstantly('passenger', db.passengers[0]?.username || 'mahdi_as', 'user123')
                }
                className="w-full text-start p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {isFa ? '۳. مسافر اول (مهدی اسدی — موجودی ۴۸۰$)' : '3. Passenger A ($480 Balance)'}
                </div>
                <div className="font-mono text-slate-500 mt-1">
                  user:{' '}
                  <strong className="text-blue-600 dark:text-blue-400">
                    {db.passengers[0]?.username || 'mahdi_as'}
                  </strong>{' '}
                  · pass: <strong>user123</strong>
                </div>
              </button>

              {db.passengers[1] && (
                <button
                  type="button"
                  onClick={() =>
                    fillAndLoginInstantly('passenger', db.passengers[1].username, 'user123')
                  }
                  className="w-full text-start p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors cursor-pointer"
                >
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {isFa ? '۴. مسافر دوم (پریسا راد — موجودی ۲۱۵$)' : '4. Passenger B ($215 Balance)'}
                  </div>
                  <div className="font-mono text-slate-500 mt-1">
                    user:{' '}
                    <strong className="text-blue-600 dark:text-blue-400">
                      {db.passengers[1].username}
                    </strong>{' '}
                    · pass: <strong>user123</strong>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
