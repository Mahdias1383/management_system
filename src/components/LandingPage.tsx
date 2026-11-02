import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Lock,
  MapPin,
  Search,
  Shield,
  ShieldCheck,
  Train,
  User,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { Language, PlatformDatabaseV2, UserRole } from '../types/domain';
import { normalizeIdentifier } from '../services/authService';
import { computeTrainStationTimings } from '../services/collisionEngine';

interface LandingPageProps {
  db: PlatformDatabaseV2;
  lang: Language;
  onNavigateToLogin: (role?: UserRole, mode?: 'LOGIN' | 'REGISTER') => void;
  onQuickDemoLogin: (target: 'ADMIN' | 'STAFF' | 'PASSENGER_1' | 'PASSENGER_2') => void;
  onOpenQA: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  db,
  lang,
  onNavigateToLogin,
  onQuickDemoLogin,
  onOpenQA,
}) => {
  const isFa = lang === 'fa';
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const filteredSchedules = db.trains.filter((t) => {
    if (
      selectedLineFilter !== 'ALL' &&
      normalizeIdentifier(t.name_line) !== normalizeIdentifier(selectedLineFilter)
    ) {
      return false;
    }
    if (searchKeyword.trim()) {
      const q = searchKeyword.trim().toLowerCase();
      const line = db.lines.find(
        (l) => normalizeIdentifier(l.name_line) === normalizeIdentifier(t.name_line)
      );
      const hay = `${t.id_train} ${t.name_train} ${t.name_line} ${line?.origin || ''} ${line?.destination || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const totalDistanceKm = db.lines.reduce(
    (sum, l) => sum + (l.segmentDistancesKm || []).reduce((a, b) => a + b, 0),
    0
  );

  const totalAvailableSeats = db.trains.reduce((sum, t) => sum + t.capacity, 0);

  return (
    <div className="space-y-16 pb-12">
      {/* 1. HERO SECTION (2-Column Split + Full-Width KPI Strip Below) */}
      <section className="pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Hero Narrative & CTAs */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10">
            <div>
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-3">
                {isFa
                  ? 'سامانه یکپارچه فرماندهی سیر و حرکت، ایمنی بلاک ریلی و رزرواسیون آنلاین بلیط'
                  : 'Integrated National Railway Dispatch, Block Safety & Online Ticketing Platform'}
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-slate-900 dark:text-white leading-[1.2] text-balance">
                {isFa
                  ? 'مدیریت هوشمند شبکه خطوط ریلی و رزرواسیون آنلاین قطارهای مسافربری'
                  : 'Precision Railway Corridor Operations & Passenger Reservation Platform'}
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-4 leading-relaxed max-w-2xl">
                {isFa
                  ? 'پلتفرم سازمانی RailPulse Enterprise سه درگاه اختصاصی برای مدیران ارشد سازمان، مهندسان مرکز کنترل ترافیک ریلی (مجهز به الگوریتم ریاضی تشخیص برخورد و نمودار زمان-مسافت ماری) و مسافران (خرید آنی بلیط با کیف پول دیجیتال و کارت سوارشدن QR) فراهم می‌کند.'
                  : 'RailPulse Enterprise unifies three dedicated role-based portals: Executive System Administration, Railway Operations & Safety Dispatch (powered by the mathematical checkAccident engine and Marey Time-Distance diagrams), and Passenger Reservation with atomic digital wallets.'}
              </p>
            </div>

            <div className="pt-8 mt-8 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigateToLogin('passenger', 'LOGIN')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Lock className="w-4 h-4" />
                <span>{isFa ? 'ورود به حساب کاربری' : 'Sign In to Portal'}</span>
                {isFa ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => onNavigateToLogin('passenger', 'REGISTER')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isFa ? 'ثبت‌نام مسافر جدید (+۱۰۰$ هدیه)' : 'Register Passenger (+$100 Credit)'}</span>
              </button>

              <a
                href="#live-timetable"
                className="inline-flex items-center gap-1.5 px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
              >
                <span>{isFa ? 'مشاهده جدول حرکت قطارها' : 'Explore Live Timetables'}</span>
              </a>
            </div>
          </div>

          {/* Right Column: Interactive Architectural Railway Schematic Visual Container */}
          <div className="lg:col-span-5 bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-4">
                <span>CORRIDOR TELEMETRY SCHEMATIC</span>
                <span>SCHEMA v2.0</span>
              </div>

              <h3 className="text-lg font-bold text-white">
                {isFa
                  ? 'توپولوژی زنده کریدورهای سریع‌السیر کشور'
                  : 'National High-Speed Corridor Network'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isFa
                  ? 'محاسبه دقیق زمان ورود، توقف و خروج در تمامی ایستگاه‌های میانی با حاشیه ایمنی ۵ دقیقه‌ای'
                  : 'Real-time station arrival, dwell, and block headway verification across all active lines'}
              </p>

              {/* High-Craft SVG Railway Network Illustration */}
              <div className="my-6 p-4 rounded-xl bg-slate-950/90 border border-slate-800" dir="ltr">
                <svg viewBox="0 0 400 185" className="w-full h-auto select-none">
                  <defs>
                    <linearGradient id="lineGradBlue" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>

                  {/* Grid lines */}
                  <line x1="20" y1="40" x2="380" y2="40" stroke="#1E293B" strokeDasharray="3 3" />
                  <line x1="20" y1="95" x2="380" y2="95" stroke="#1E293B" strokeDasharray="3 3" />
                  <line x1="20" y1="150" x2="380" y2="150" stroke="#1E293B" strokeDasharray="3 3" />

                  {/* Corridor 1: Tehran - Mashhad HSR */}
                  <path
                    d="M 35 40 L 130 40 L 245 40 L 365 40"
                    stroke="url(#lineGradBlue)"
                    strokeWidth="3.5"
                    fill="none"
                  />
                  {[
                    { x: 35, label: 'Tehran' },
                    { x: 130, label: 'Semnan' },
                    { x: 245, label: 'Shahroud' },
                    { x: 365, label: 'Mashhad' },
                  ].map((node, i) => (
                    <g key={`c1-${i}`}>
                      <circle cx={node.x} cy={40} r={5} fill="#0F172A" stroke="#3B82F6" strokeWidth={2.5} />
                      <text x={node.x} y={26} textAnchor="middle" fill="#CBD5E1" fontSize="9" fontFamily="JetBrains Mono">
                        {node.label}
                      </text>
                    </g>
                  ))}

                  {/* Corridor 2: Tehran - Isfahan Express */}
                  <path
                    d="M 35 95 L 145 95 L 255 95 L 365 95"
                    stroke="#8B5CF6"
                    strokeWidth="2.5"
                    fill="none"
                  />
                  {[
                    { x: 35, label: 'Tehran' },
                    { x: 145, label: 'Qom' },
                    { x: 255, label: 'Kashan' },
                    { x: 365, label: 'Isfahan' },
                  ].map((node, i) => (
                    <g key={`c2-${i}`}>
                      <circle cx={node.x} cy={95} r={4.5} fill="#0F172A" stroke="#8B5CF6" strokeWidth={2} />
                      <text x={node.x} y={82} textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="JetBrains Mono">
                        {node.label}
                      </text>
                    </g>
                  ))}

                  {/* Corridor 3: Tabriz - Tehran */}
                  <path
                    d="M 35 150 L 145 150 L 255 150 L 365 150"
                    stroke="#F59E0B"
                    strokeWidth="2.5"
                    fill="none"
                  />
                  {[
                    { x: 35, label: 'Tabriz' },
                    { x: 145, label: 'Zanjan' },
                    { x: 255, label: 'Qazvin' },
                    { x: 365, label: 'Tehran' },
                  ].map((node, i) => (
                    <g key={`c3-${i}`}>
                      <circle cx={node.x} cy={150} r={4.5} fill="#0F172A" stroke="#F59E0B" strokeWidth={2} />
                      <text x={node.x} y={137} textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="JetBrains Mono">
                        {node.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <span>
                {isFa ? 'موتور جلوگیری از تصادف (checkAccident):' : 'Collision Prevention Engine:'}
              </span>
              <span className="font-mono text-emerald-400 font-semibold">ACTIVE · 5m HEADWAY</span>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Quantitative KPI Strip Below Hero Split */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {isFa ? 'کریدورهای ریلی سراسری' : 'Active Railway Corridors'}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {db.lines.length} {isFa ? 'خط اصلی' : 'Corridors'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
              {totalDistanceKm} km {isFa ? 'شبکه ریلی' : 'monitored track'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {isFa ? 'ناوگان قطارهای فعال' : 'Scheduled Train Fleet'}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {db.trains.length} {isFa ? 'رام قطار' : 'Active Trains'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
              {totalAvailableSeats} {isFa ? 'صندلی آماده رزرو' : 'available seats'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {isFa ? 'ایمنی سیر و حرکت (checkAccident)' : 'Dispatch Safety Compliance'}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              100%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isFa ? 'کنترل ریاضی تداخل ایستگاه و بلاک' : 'Zero platform or block overlaps'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {isFa ? 'تست‌های خودکار تضمین کیفیت' : 'Automated QA Verification'}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-1">
              11 / 11 Suites
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isFa ? 'پوشش ۵ فاز تست مهندسی' : 'Unit, Integration, Migration & E2E'}
            </div>
          </div>
        </div>
      </section>

      {/* 2. ROLE-BASED PORTALS GATEWAY (ورود به درگاه‌های تخصصی بر اساس نقش کاربر) */}
      <section id="role-portals" className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isFa
                ? 'درگاه‌های اختصاصی سامانه بر اساس نقش کاربر (Role-Based Portals)'
                : 'Role-Based Enterprise Portals & Capabilities'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {isFa
                ? 'هر کاربر پس از احراز هویت، مستقیماً وارد میز کار تخصصی متناسب با سطح دسترسی و اختیارات سازمانی خود می‌شود.'
                : 'Each user authenticates into a strictly isolated workspace tailored to their operational permissions.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Role Card 1: System Administrator */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                  01. SYSTEM ADMIN PORTAL
                </span>
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isFa ? 'پنل مدیریت کل سازمان (مدیر سیستم)' : 'System Administrator Portal'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {isFa
                  ? 'نظارت کلان بر عملکرد مالی شبکه ریلی، مدیریت کارمندان عملیات و ممیزی رخدادهای سیستم.'
                  : 'Executive oversight of platform revenue, operations staff provisioning, and system audit logs.'}
              </p>

              <ul className="mt-5 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                <li>
                  • {isFa ? 'داشبورد شاخص‌های کلیدی (KPI) و نمودار ۳۰ روزه درآمد فروش بلیط' : '30-Day Recharts ticket sales revenue analytics & KPIs'}
                </li>
                <li>
                  • {isFa ? 'ثبت، جستجو، ویرایش و حذف ایمن مهندسان و کارمندان عملیات ریلی' : 'Full CRUD directory for railway operations staff'}
                </li>
                <li>
                  • {isFa ? 'لاگ ممیزی (Audit Log)، پشتیبان‌گیری JSON و بازنشانی داده‌ها' : 'Immutable system audit trail & JSON snapshot management'}
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-[11px] font-mono text-slate-400">
                {isFa ? 'حساب پیش‌فرض:' : 'Default Admin:'} Admin_train / admin_train
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateToLogin('admin', 'LOGIN')}
                  className="py-2 px-3 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isFa ? 'فرم ورود مدیر' : 'Admin Login'}
                </button>
                <button
                  type="button"
                  onClick={() => onQuickDemoLogin('ADMIN')}
                  className="py-2 px-3 rounded-lg border border-blue-600/40 bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isFa ? 'ورود سریع دمو' : 'Instant Demo'}
                </button>
              </div>
            </div>
          </div>

          {/* Role Card 2: Railway Operations & Dispatch Staff */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  02. DISPATCH & SAFETY PORTAL
                </span>
                <Train className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isFa
                  ? 'پنل مهندسی عملیات و ایمنی خطوط ریلی'
                  : 'Railway Operations & Safety Staff Portal'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {isFa
                  ? 'طراحی توپولوژی خطوط ریلی، زمانبندی ناوگان قطارها و پیشگیری ریاضی از برخورد قطارها.'
                  : 'Corridor route topology management, fleet timetable scheduling, and collision prevention.'}
              </p>

              <ul className="mt-5 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                <li>
                  • {isFa ? 'تعریف و ویرایش خطوط ریلی، ایستگاه‌های میانی و فواصل بلاک‌ها' : 'Create & reorder railway lines and intermediate station distances'}
                </li>
                <li>
                  • {isFa ? 'الگوریتم ریاضی checkAccident جهت تشخیص تداخل ایستگاه و سبقت در بلاک' : 'Mathematical checkAccident guard blocking platform & segment collisions'}
                </li>
                <li>
                  • {isFa ? 'شبیه‌ساز زنده نمودار زمان-مسافت ماری (Marey Chart) و پیشنهاد ساعت ایمن' : 'Interactive Marey Time-Distance schedule graph & safe slot recommender'}
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-[11px] font-mono text-slate-400">
                {isFa ? 'حساب پیش‌فرض:' : 'Default Staff:'} sara_ahmadi / staff123
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateToLogin('staff', 'LOGIN')}
                  className="py-2 px-3 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isFa ? 'فرم ورود کارشناس' : 'Staff Login'}
                </button>
                <button
                  type="button"
                  onClick={() => onQuickDemoLogin('STAFF')}
                  className="py-2 px-3 rounded-lg border border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/20 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isFa ? 'ورود سریع دمو' : 'Instant Demo'}
                </button>
              </div>
            </div>
          </div>

          {/* Role Card 3: Regular Passenger Portal */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">
                  03. PASSENGER RESERVATION PORTAL
                </span>
                <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isFa
                  ? 'پنل مسافر، رزرواسیون بلیط و کیف پول دیجیتال'
                  : 'Passenger Booking & Digital Wallet Portal'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {isFa
                  ? 'جستجوی هوشمند قطارها، خرید آنی بلیط با کیف پول اختصاصی و دریافت کارت سوارشدن دیجیتال.'
                  : 'Smart timetable search, atomic ticket booking, QR boarding passes, and personal wallet ledger.'}
              </p>

              <ul className="mt-5 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                <li>
                  • {isFa ? 'جستجو و فیلتر قطارها بر اساس خط، کیفیت سالن و ظرفیت صندلی' : 'Filter trains by corridor, service quality tier, and seat capacity'}
                </li>
                <li>
                  • {isFa ? 'صدور آنی بلیط با کد PNR و بارکد QR به همراه قابلیت استرداد آنلاین' : 'Verifiable PNR & QR boarding pass with 1-click refund to wallet'}
                </li>
                <li>
                  • {isFa ? 'کیف پول دیجیتال ایزوله (شارژ، برداشت و دفتر کل تراکنش‌ها) و ویرایش پروفایل' : 'Session-isolated digital wallet (top-up, withdraw, ledger) & profile'}
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-[11px] font-mono text-slate-400">
                {isFa ? 'حساب پیش‌فرض:' : 'Default Passenger:'} mahdi_as / user123
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateToLogin('passenger', 'LOGIN')}
                  className="py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isFa ? 'ورود / ثبت‌نام مسافر' : 'Passenger Login'}
                </button>
                <button
                  type="button"
                  onClick={() => onQuickDemoLogin('PASSENGER_1')}
                  className="py-2 px-3 rounded-lg border border-amber-600/40 bg-amber-600/10 text-amber-700 dark:text-amber-400 hover:bg-amber-600/20 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isFa ? 'ورود سریع دمو' : 'Instant Demo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PUBLIC LIVE TRAIN TIMETABLE & CORRIDOR EXPLORER */}
      <section id="live-timetable" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isFa
                ? 'تابلوی اعلانات زنده قطارها و کریدورهای ریلی کشور'
                : 'Live National Train Timetable & Available Corridors'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              {isFa
                ? 'مشاهده وضعیت ظرفیت صندلی‌ها و زمانبندی حرکت قطارها قبل از ورود به پنل خرید بلیط'
                : 'Inspect real-time departure schedules, intermediate stops, and seat availability'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder={isFa ? 'جستجوی شهر، قطار...' : 'Search station, train...'}
                className="ps-9 pe-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <select
              value={selectedLineFilter}
              onChange={(e) => setSelectedLineFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="ALL">{isFa ? 'همه کریدورهای ریلی' : 'All Railway Corridors'}</option>
              {db.lines.map((l) => (
                <option key={l.id} value={l.name_line}>
                  {l.name_line}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchedules.map((train) => {
            const line = db.lines.find(
              (l) => normalizeIdentifier(l.name_line) === normalizeIdentifier(train.name_line)
            );
            const timings = line ? computeTrainStationTimings(train, line) : [];
            const arrivalFormatted =
              timings.length > 0 ? timings[timings.length - 1].arrivalFormatted : '--:--';

            return (
              <div
                key={train.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {train.id_train} · {train.quality}
                    </span>
                    <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                      ${train.cost_ticket.toFixed(2)}
                    </span>
                  </div>

                  <h4 className="text-base font-semibold text-slate-900 dark:text-white mt-1">
                    {train.name_train}
                  </h4>

                  {line && (
                    <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs">
                      <div className="flex items-center justify-between font-medium text-slate-900 dark:text-slate-100">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" />
                          {line.origin}
                        </span>
                        <span>→</span>
                        <span>{line.destination}</span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 mt-1.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {train.departureTime}
                        </span>
                        <span>{train.speed} km/h</span>
                        <span>
                          {isFa ? 'ورود:' : 'Arr:'} {arrivalFormatted}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-mono">
                    {isFa
                      ? `ظرفیت موجود: ${train.capacity} صندلی`
                      : `Available: ${train.capacity} seats`}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigateToLogin('passenger', 'LOGIN')}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {isFa ? 'ورود و رزرو بلیط' : 'Sign In to Book'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. ENGINEERING ARCHITECTURE & AUTOMATED QA CALLOUT */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isFa
                ? 'تضمین کیفیت مهندسی و مهاجرت خودکار از نسخه پایتون به نسخه ۲ سازمانی'
                : 'Enterprise Architecture & 5-Phase Automated QA Suite'}
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isFa
              ? 'مجهز به پنل اجرای زنده ۱۱ سناریوی تست خودکار (Unit, Integration, Migration, E2E, UI Isolation)'
              : 'Built-In Live Execution of 11 Automated Test Suites Across 5 Engineering Phases'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {isFa
              ? 'بدون نیاز به ورود نیز می‌توانید پنل تست‌های خودکار مهندسی را باز کرده و صحت الگوریتم برخورد قطارها، تراکنش‌های کیف پول و مهاجرت داده‌ها را به صورت زنده بررسی کنید.'
              : 'Inspect and execute programmatic assertions verifying wallet math, collision geometry, schema migration, and session isolation.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenQA}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
        >
          {isFa ? 'مشاهده و اجرای پنل تست‌های خودکار (QA)' : 'Launch 5-Phase QA Test Runner'}
        </button>
      </section>
    </div>
  );
};
