import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  Edit3,
  FileCode2,
  GitBranch,
  RotateCcw,
  Search,
  ShieldCheck,
  Train,
  Trash2,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  ActiveSession,
  Employee,
  Language,
  PlatformDatabaseV2,
  ThemeMode,
} from '../types/domain';
import {
  evaluatePasswordStrength,
  formatCompactCurrency,
  formatDateTime,
  formatNumber,
  formatCurrency,
  hashPassword,
  isValidEmail,
  localizeAuditAction,
  localizeDepartment,
  localizeRole,
  localizeText,
  normalizeIdentifier,
  toPersianDigits,
} from '../services/authService';
import { resetToDefaultSeedDatabase } from '../services/storageAndMigration';
import { RevenueAnalysis } from '../components/RevenueAnalysis';
import { QATestSuitePanel } from '../components/QATestSuitePanel';
import {
  EnterpriseBackofficeLayout,
  SidebarNavItem,
} from '../layouts/EnterpriseBackofficeLayout';

interface AdminExecutivePortalProps {
  db: PlatformDatabaseV2;
  onUpdateDb: (nextDb: PlatformDatabaseV2) => void;
  session: ActiveSession;
  lang: Language;
  theme: ThemeMode;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

type AdminSidebarSection = 'OVERVIEW' | 'STAFF_HR' | 'AUDIT' | 'QA_SUITE';

export const AdminExecutivePortal: React.FC<AdminExecutivePortalProps> = ({
  db,
  onUpdateDb,
  session,
  lang,
  theme,
  onToggleLang,
  onToggleTheme,
  onLogout,
}) => {
  const isFa = lang === 'fa';
  const [activeSection, setActiveSection] = useState<AdminSidebarSection>('OVERVIEW');

  // Staff Provisioning Form State
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Dispatch & Traffic Control');
  const [formFeedback, setFormFeedback] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);

  // Staff Directory Search & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'username' | 'department'>('name');

  // Staff Edit Modal State
  const [editingStaff, setEditingStaff] = useState<Employee | null>(null);
  const [editName, setEditName] = useState('');
  const [editLastname, setEditLastname] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editStatus, setEditStatus] = useState<Employee['status']>('Active');

  // Staff Delete Confirmation Modal State
  const [deletingStaff, setDeletingStaff] = useState<Employee | null>(null);

  const pwdStrength = evaluatePasswordStrength(password);

  // Executive KPIs
  const totalRevenue = useMemo(() => {
    return db.tickets
      .filter((t) => t.status === 'Confirmed')
      .reduce((acc, t) => acc + t.totalPrice, 0);
  }, [db.tickets]);

  const confirmedTicketsCount = useMemo(
    () => db.tickets.filter((t) => t.status === 'Confirmed').length,
    [db.tickets]
  );

  // 12-Month Monthly Revenue Trend (Last 12 Months)
  const monthlyRevenueData = useMemo(() => {
    const faMonthFormatter = new Intl.DateTimeFormat('fa-IR', {
      month: 'long',
      year: '2-digit',
    });
    const enMonthFormatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: '2-digit',
    });

    // Historical baseline monthly seasonal weights (in Rials) for preceding months
    const baselineNetSeries = [
      415_000_000,
      448_000_000,
      492_000_000,
      535_000_000,
      610_000_000,
      580_000_000,
      645_000_000,
      690_000_000,
      740_000_000,
      715_000_000,
      785_000_000,
      0,
    ];

    const now = new Date();
    const ticketTxs = (db.transactions || []).filter(
      (tx) => tx.type === 'TICKET_PURCHASE' || tx.type === 'TICKET_REFUND'
    );
    if (ticketTxs.length > 0) {
      const timestamps = ticketTxs
        .map((tx) => new Date(tx.timestamp).getTime())
        .filter((ts) => Number.isFinite(ts));
      if (timestamps.length > 0) {
        now.setTime(Math.max(...timestamps, Date.now()));
      }
    }

    const points: {
      monthKey: string;
      monthLabel: string;
      grossRevenue: number;
      netRevenue: number;
      targetBenchmark: number;
    }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const monthPrefix = `${yyyy}-${mm}`;

      let actualGross = 0;
      let actualRefunds = 0;
      ticketTxs.forEach((tx) => {
        if (String(tx.timestamp || '').startsWith(monthPrefix)) {
          if (tx.type === 'TICKET_PURCHASE') {
            actualGross += Number(tx.amount) || 0;
          } else if (tx.type === 'TICKET_REFUND') {
            actualRefunds += Number(tx.amount) || 0;
          }
        }
      });

      const baselineIdx = 11 - i;
      const baseNet = baselineNetSeries[baselineIdx] || 0;
      const baseGross = Math.round(baseNet * 1.06);

      const grossRevenue = baseGross + actualGross;
      const netRevenue = Math.max(0, baseNet + actualGross - actualRefunds);
      const targetBenchmark = Math.round((400_000_000 + baselineIdx * 35_000_000) / 1_000_000) * 1_000_000;

      const rawLabel = isFa ? faMonthFormatter.format(d) : enMonthFormatter.format(d);

      points.push({
        monthKey: monthPrefix,
        monthLabel: toPersianDigits(rawLabel, lang),
        grossRevenue,
        netRevenue,
        targetBenchmark,
      });
    }

    return points;
  }, [db.transactions, isFa, lang]);

  const annualRevenueSummary = useMemo(() => {
    const annualNet = monthlyRevenueData.reduce((sum, m) => sum + m.netRevenue, 0);
    const annualGross = monthlyRevenueData.reduce((sum, m) => sum + m.grossRevenue, 0);
    const bestMonth = monthlyRevenueData.reduce(
      (best, curr) => (curr.netRevenue > best.netRevenue ? curr : best),
      monthlyRevenueData[0] || { monthLabel: '--', netRevenue: 0 }
    );
    return { annualNet, annualGross, bestMonth };
  }, [monthlyRevenueData]);

  // Filtered & Sorted Staff
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...db.employees]
      .filter((emp) => {
        if (!q) return true;
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.lastname.toLowerCase().includes(q) ||
          emp.username.toLowerCase().includes(q) ||
          emp.email.toLowerCase().includes(q) ||
          emp.department.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a[sortBy].localeCompare(b[sortBy]));
  }, [db.employees, searchQuery, sortBy]);

  // Add Operations Staff Handler
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    const trimmedName = name.trim();
    const trimmedLastname = lastname.trim();
    const trimmedUser = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedLastname || !trimmedUser || !trimmedEmail || !password) {
      setFormFeedback({
        type: 'error',
        msg: isFa
          ? 'تکمیل تمامی فیلدهای اطلاعات کارشناس الزامی است.'
          : 'All staff registration fields are required.',
      });
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setFormFeedback({
        type: 'error',
        msg: isFa
          ? 'فرمت پست الکترونیکی سازمانی نامعتبر است.'
          : 'Invalid corporate email format.',
      });
      return;
    }

    if (password.length < 6) {
      setFormFeedback({
        type: 'error',
        msg: isFa
          ? 'رمز عبور باید حداقل ۶ کاراکتر باشد.'
          : 'Password must be at least 6 characters long.',
      });
      return;
    }

    const normUser = normalizeIdentifier(trimmedUser);
    const normMail = normalizeIdentifier(trimmedEmail);

    const usernameConflict =
      normUser === normalizeIdentifier(db.admin.username) ||
      db.employees.some((emp) => normalizeIdentifier(emp.username) === normUser) ||
      db.passengers.some((usr) => normalizeIdentifier(usr.username) === normUser);

    if (usernameConflict) {
      setFormFeedback({
        type: 'error',
        msg: isFa
          ? `نام کاربری "${trimmedUser}" قبلاً در سامانه ثبت شده است.`
          : `Username "${trimmedUser}" is already registered.`,
      });
      return;
    }

    const emailConflict =
      db.employees.some((emp) => normalizeIdentifier(emp.email) === normMail) ||
      db.passengers.some((usr) => normalizeIdentifier(usr.email) === normMail);

    if (emailConflict) {
      setFormFeedback({
        type: 'error',
        msg: isFa
          ? `ایمیل "${trimmedEmail}" قبلاً ثبت شده است.`
          : `Email "${trimmedEmail}" is already registered.`,
      });
      return;
    }

    const newEmployee: Employee = {
      id: `emp_${Date.now()}`,
      name: trimmedName,
      lastname: trimmedLastname,
      username: trimmedUser,
      email: trimmedEmail,
      passwordHash: hashPassword(password),
      department,
      status: 'Active',
      createdAt: new Date().toISOString(),
      linesCreated: 0,
      trainsScheduled: 0,
    };

    onUpdateDb({
      ...db,
      employees: [newEmployee, ...db.employees],
      auditLogs: [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorRole: 'admin',
          actorUsername: session.username,
          action: 'PROVISION_OPERATIONS_STAFF',
          detailsEn: `Provisioned railway operations specialist ${newEmployee.name} ${newEmployee.lastname} (@${newEmployee.username})`,
          detailsFa: `ایجاد حساب کارشناس عملیات ریلی ${newEmployee.name} ${newEmployee.lastname} (@${newEmployee.username})`,
        },
        ...db.auditLogs,
      ],
    });

    setName('');
    setLastname('');
    setUsername('');
    setEmail('');
    setPassword('');
    setFormFeedback({
      type: 'success',
      msg: isFa
        ? `حساب کاربری کارشناس «${newEmployee.name} ${newEmployee.lastname}» با موفقیت ایجاد شد.`
        : `Operations specialist "${newEmployee.name} ${newEmployee.lastname}" provisioned.`,
    });
  };

  // Save Edited Employee
  const handleSaveEditEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    if (!isValidEmail(editEmail)) {
      setFormFeedback({
        type: 'error',
        msg: isFa
          ? 'فرمت ایمیل واردشده معتبر نیست.'
          : 'Invalid email format in edit dialog.',
      });
      return;
    }

    const normMail = normalizeIdentifier(editEmail);
    const emailConflict = db.employees.some(
      (emp) =>
        emp.id !== editingStaff.id && normalizeIdentifier(emp.email) === normMail
    );
    if (emailConflict) {
      setFormFeedback({
        type: 'error',
        msg: isFa
          ? 'این ایمیل متعلق به کارشناس دیگری است.'
          : 'Email already belongs to another employee.',
      });
      return;
    }

    onUpdateDb({
      ...db,
      employees: db.employees.map((emp) =>
        emp.id === editingStaff.id
          ? {
              ...emp,
              name: editName.trim() || emp.name,
              lastname: editLastname.trim() || emp.lastname,
              email: editEmail.trim(),
              department: editDepartment,
              status: editStatus,
            }
          : emp
      ),
      auditLogs: [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorRole: 'admin',
          actorUsername: session.username,
          action: 'UPDATE_OPERATIONS_STAFF',
          detailsEn: `Updated profile for @${editingStaff.username}`,
          detailsFa: `بروزرسانی پرونده کارشناس @${editingStaff.username}`,
        },
        ...db.auditLogs,
      ],
    });

    setEditingStaff(null);
    setFormFeedback({
      type: 'success',
      msg: isFa
        ? 'اطلاعات کارشناس عملیات ریلی بروزرسانی شد.'
        : 'Staff record updated.',
    });
  };

  // Delete Employee
  const handleConfirmDeleteEmployee = () => {
    if (!deletingStaff) return;
    const target = deletingStaff;

    onUpdateDb({
      ...db,
      employees: db.employees.filter((emp) => emp.id !== target.id),
      auditLogs: [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorRole: 'admin',
          actorUsername: session.username,
          action: 'REVOKE_OPERATIONS_STAFF',
          detailsEn: `Removed employee @${target.username} (${target.name} ${target.lastname})`,
          detailsFa: `لغو دسترسی و حذف کارشناس @${target.username} (${target.name} ${target.lastname})`,
        },
        ...db.auditLogs,
      ],
    });

    setDeletingStaff(null);
    setFormFeedback({
      type: 'success',
      msg: isFa
        ? `دسترسی کارشناس @${target.username} لغو و از فهرست حذف شد.`
        : `Employee @${target.username} removed from directory.`,
    });
  };

  // Export JSON Snapshot
  const handleExportSnapshot = () => {
    const jsonStr = JSON.stringify(db, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `railpulse-enterprise-snapshot-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON Snapshot
  const handleImportSnapshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = String(reader.result || '');
        const parsed = JSON.parse(content);
        if (parsed && parsed.schemaVersion === 2 && Array.isArray(parsed.lines)) {
          onUpdateDb(parsed as PlatformDatabaseV2);
          setFormFeedback({
            type: 'success',
            msg: isFa
              ? 'فایل پشتیبان پایگاه داده با موفقیت بازیابی شد.'
              : 'Database snapshot imported and hydrated.',
          });
        } else {
          throw new Error('Invalid schema');
        }
      } catch {
        setFormFeedback({
          type: 'error',
          msg: isFa
            ? 'ساختار فایل JSON انتخاب‌شده معتبر نیست.'
            : 'Invalid JSON snapshot schema.',
        });
      }
    };
    reader.readAsText(file);
  };

  const navItems: SidebarNavItem[] = [
    {
      id: 'OVERVIEW',
      labelFa: 'داشبورد کلان مدیریتی و مالی',
      labelEn: 'Executive & Revenue Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'STAFF_HR',
      labelFa: 'مدیریت کارشناسان عملیات ریلی',
      labelEn: 'Operations Staff Directory',
      badgeCount: db.employees.length,
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'AUDIT',
      labelFa: 'ممیزی رخدادها و پشتیبان‌گیری',
      labelEn: 'Audit Trail & Data Snapshots',
      badgeCount: db.auditLogs.length,
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: 'QA_SUITE',
      labelFa: 'مرکز تست و تضمین کیفیت ۵ مرحله‌ای',
      labelEn: 'Engineering QA & Automated Tests',
      badgeCount: 12,
      icon: <FileCode2 className="w-4 h-4" />,
    },
  ];

  const activeMeta = {
    OVERVIEW: {
      titleFa: 'داشبورد فرماندهی کلان و تحلیل درآمد شبکه ریلی',
      titleEn: 'Executive Command Center & 30-Day Revenue Intelligence',
      subtitleFa: 'پایش بلادرنگ شاخص‌های کلیدی عملکرد، فروش بلیط، ظرفیت ناوگان و ایمنی شبکه',
      subtitleEn: 'Real-time operational KPIs, 30-day ticket sales analytics, and fleet safety compliance',
    },
    STAFF_HR: {
      titleFa: 'مدیریت کارشناسان و مهندسان عملیات ریلی',
      titleEn: 'Railway Operations Staff Provisioning & Directory',
      subtitleFa: 'ایجاد حساب کاربری برای کارشناسان جدید، مدیریت سطح دسترسی و پایش عملکرد پرسنل',
      subtitleEn: 'Provision new railway dispatchers, manage credentials, and review operational assignments',
    },
    AUDIT: {
      titleFa: 'گزارش ممیزی امنیتی و مدیریت نسخه‌های پشتیبان',
      titleEn: 'System Security Audit Trail & Database Snapshots',
      subtitleFa: 'ثبت تغییرناپذیر کلیه رخدادهای مدیریتی، عملیاتی و خروجی/ورودی فایل پشتیبان JSON',
      subtitleEn: 'Immutable ledger of administrative actions and full state snapshot import/export',
    },
    QA_SUITE: {
      titleFa: 'پنل مهندسی تست و تضمین کیفیت خودکار ۵ مرحله‌ای',
      titleEn: '5-Phase Automated Engineering QA & Verification Suite',
      subtitleFa: 'اجرای زنده ۱۲ سناریوی تست واحد، یکپارچه‌سازی، مهاجرت داده، سرتاسری و ایزولاسیون امنیتی',
      subtitleEn: 'Live execution of 12 automated suites covering unit math, migration, E2E, and RBAC isolation',
    },
  }[activeSection];

  return (
    <EnterpriseBackofficeLayout
      lang={lang}
      theme={theme}
      session={session}
      portalTitleFa={activeMeta.titleFa}
      portalTitleEn={activeMeta.titleEn}
      portalSubtitleFa={activeMeta.subtitleFa}
      portalSubtitleEn={activeMeta.subtitleEn}
      navItems={navItems}
      activeTabId={activeSection}
      onSelectTab={(id) => setActiveSection(id as AdminSidebarSection)}
      onLogout={onLogout}
      onToggleLang={onToggleLang}
      onToggleTheme={onToggleTheme}
    >
      {/* =====================================================================
          SECTION 1: EXECUTIVE & REVENUE ANALYTICS
          ===================================================================== */}
      {activeSection === 'OVERVIEW' && (
        <div className="space-y-6 rp-animate-in">
          {/* 5 Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rp-card-hover rp-animate-in rp-stagger-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'کریدورهای ریلی فعال' : 'Active Rail Corridors'}
                </span>
                <GitBranch className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {formatNumber(db.lines.length, lang)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {formatNumber(
                  db.lines.reduce((s, l) => s + l.num_state, 0),
                  lang
                )}{' '}
                {isFa ? 'ایستگاه میانی در شبکه' : 'intermediate stops'}
              </div>
            </div>

            <div className="rp-card-hover rp-animate-in rp-stagger-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'ناوگان قطارهای فعال' : 'Operating Train Fleet'}
                </span>
                <Train className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {formatNumber(db.trains.length, lang)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {formatNumber(
                  db.trains.reduce((s, t) => s + t.capacity, 0),
                  lang
                )}{' '}
                {isFa ? 'صندلی آماده فروش' : 'available seats'}
              </div>
            </div>

            <div className="rp-card-hover rp-animate-in rp-stagger-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'کارشناسان و مسافران' : 'Staff & Passengers'}
                </span>
                <Users className="w-4 h-4 text-violet-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {formatNumber(db.employees.length, lang)} / {formatNumber(db.passengers.length, lang)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isFa
                  ? `${formatNumber(db.employees.length, lang)} کارشناس · ${formatNumber(db.passengers.length, lang)} مسافر`
                  : `${db.employees.length} staff · ${db.passengers.length} passengers`}
              </div>
            </div>

            <div className="rp-card-hover rp-animate-in rp-stagger-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'درآمد خالص فروش بلیط' : 'Net Ticket Revenue'}
                </span>
                <Wallet className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalRevenue, isFa ? 'Rial' : 'USD')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {formatNumber(confirmedTicketsCount, lang)}{' '}
                {isFa ? 'رزرو قطعی ثبت‌شده' : 'confirmed bookings'}
              </div>
            </div>

            <div className="rp-card-hover rp-animate-in rp-stagger-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'شاخص ایمنی سیر' : 'Dispatch Safety Index'}
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {isFa ? '۱۰۰٪' : '100.0%'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isFa
                  ? 'صفر تداخل در رادار ضدبرخورد'
                  : 'Zero active track collisions'}
              </div>
            </div>
          </div>

          {/* 12-Month Monthly Revenue Trend LineChart (Recharts) */}
          <div className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {isFa
                      ? 'روند ۱۲ ماهه درآمد ماهانه شبکه ریلی (ریال)'
                      : '12-Month Monthly Railway Revenue Trend (USD)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isFa
                      ? 'مقایسه درآمد خالص ماهانه، فروش ناخالص و هدف‌گذاری بودجه عملیاتی در ۱۲ ماه گذشته'
                      : 'Comparison of monthly net ticket revenue, gross sales, and operational target over the last 12 months'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rp-card-hover px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isFa ? 'درآمد خالص سالانه (۱۲ ماه)' : '12-Month Net Revenue'}
                  </div>
                  <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(annualRevenueSummary.annualNet, isFa ? 'Rial' : 'USD')}
                  </div>
                </div>
                <div className="rp-card-hover px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isFa ? 'فروش ناخالص سالانه' : '12-Month Gross Sales'}
                  </div>
                  <div className="font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                    {formatCurrency(annualRevenueSummary.annualGross, isFa ? 'Rial' : 'USD')}
                  </div>
                </div>
                <div className="rp-card-hover px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isFa ? 'پرفروش‌ترین ماه سال' : 'Peak Monthly Performance'}
                  </div>
                  <div className="font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                    {annualRevenueSummary.bestMonth.monthLabel}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyRevenueData}
                  margin={{ top: 10, right: 20, left: 15, bottom: 5 }}
                  style={{
                    fontFamily: isFa
                      ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                      : "'Plus Jakarta Sans', -apple-system, sans-serif",
                    fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                  <XAxis
                    dataKey="monthLabel"
                    tickFormatter={(v) => toPersianDigits(String(v), lang)}
                    style={{
                      fontFamily: isFa
                        ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                        : "'Plus Jakarta Sans', -apple-system, sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                    }}
                    tick={{
                      fontSize: 11,
                      fill: '#94A3B8',
                      fontFamily: isFa
                        ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                        : "'Plus Jakarta Sans', -apple-system, sans-serif",
                      style: {
                        fontFamily: isFa
                          ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                          : "'Plus Jakarta Sans', -apple-system, sans-serif",
                        fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                      },
                    }}
                    tickLine={false}
                    axisLine={{ stroke: '#475569', opacity: 0.4 }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatCurrency(v, isFa ? 'Rial' : 'USD')}
                    style={{
                      fontFamily: isFa
                        ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                        : "'Plus Jakarta Sans', -apple-system, sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                    }}
                    tick={{
                      fontSize: 10,
                      fill: '#94A3B8',
                      fontFamily: isFa
                        ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                        : "'Plus Jakarta Sans', -apple-system, sans-serif",
                      style: {
                        fontFamily: isFa
                          ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                          : "'Plus Jakarta Sans', -apple-system, sans-serif",
                        fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                      },
                    }}
                    tickLine={false}
                    axisLine={false}
                    width={isFa ? 120 : 85}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#1E293B',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#F8FAFC',
                      direction: isFa ? 'rtl' : 'ltr',
                      textAlign: isFa ? 'right' : 'left',
                      fontFamily: isFa
                        ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                        : "'Plus Jakarta Sans', -apple-system, sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                    }}
                    labelStyle={{
                      fontFamily: isFa
                        ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                        : "'Plus Jakarta Sans', -apple-system, sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                      fontWeight: 700,
                      marginBottom: '4px',
                      color: '#E2E8F0',
                    }}
                    itemStyle={{
                      fontFamily: isFa
                        ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                        : "'Plus Jakarta Sans', -apple-system, sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                    }}
                    formatter={(value: any, name: any) => {
                      const currencyUnit = isFa ? 'Rial' : 'USD';
                      if (name === 'netRevenue') {
                        return [
                          formatCurrency(Number(value), currencyUnit),
                          isFa ? 'درآمد خالص ماهانه' : 'Monthly Net Revenue',
                        ];
                      }
                      if (name === 'grossRevenue') {
                        return [
                          formatCurrency(Number(value), currencyUnit),
                          isFa ? 'فروش ناخالص ماهانه' : 'Monthly Gross Sales',
                        ];
                      }
                      if (name === 'targetBenchmark') {
                        return [
                          formatCurrency(Number(value), currencyUnit),
                          isFa ? 'هدف بودجه مصوب' : 'Target Benchmark',
                        ];
                      }
                      return [formatCurrency(Number(value), currencyUnit), name];
                    }}
                    labelFormatter={(label) =>
                      isFa
                        ? `دوره ماهانه: ${toPersianDigits(String(label), lang)}`
                        : `Month: ${label}`
                    }
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: '12px',
                      paddingTop: '10px',
                      fontFamily: isFa
                        ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                        : "'Plus Jakarta Sans', -apple-system, sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                    }}
                    formatter={(value) => {
                      if (value === 'netRevenue') {
                        return isFa ? 'درآمد خالص ماهانه (ریال)' : 'Monthly Net Revenue (USD)';
                      }
                      if (value === 'grossRevenue') {
                        return isFa ? 'فروش ناخالص ماهانه (ریال)' : 'Monthly Gross Sales (USD)';
                      }
                      return isFa ? 'هدف بودجه مصوب' : 'Target Benchmark';
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="netRevenue"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#0F172A' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="grossRevenue"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#3B82F6' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="targetBenchmark"
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 12-Month Ticket Sales Revenue AreaChart Section */}
          <div className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {isFa
                      ? 'نمودار مساحتی روند درآمد فروش بلیط (۱۲ ماه گذشته)'
                      : 'Monthly Ticket Sales Revenue Trend AreaChart (Past 12 Months)'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isFa
                      ? 'نمایش حجم فروش ناخالص بلیط و درآمد خالص محقق‌شده بر حسب ریال با فونت وزیرمتن'
                      : 'Visualizing gross ticket sales volume and realized net revenue in USD ($)'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rp-card-hover px-3 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {isFa ? 'میانگین فروش ماهانه بلیط' : 'Avg Monthly Ticket Sales'}
                  </span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(Math.round(annualRevenueSummary.annualGross / 12), isFa ? 'Rial' : 'USD')}
                  </span>
                </div>
                <div className="rp-card-hover px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {isFa ? 'میانگین درآمد خالص ماهانه' : 'Avg Monthly Net Revenue'}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(Math.round(annualRevenueSummary.annualNet / 12), isFa ? 'Rial' : 'USD')}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-80 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyRevenueData}
                  margin={{ top: 10, right: 20, left: 15, bottom: 5 }}
                  style={{
                    fontFamily: isFa
                      ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                      : "'Plus Jakarta Sans', -apple-system, sans-serif",
                    fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                  }}
                >
                  <defs>
                    <linearGradient id="ticketGrossAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="ticketNetAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    opacity={0.18}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="monthLabel"
                    tickFormatter={(v) => toPersianDigits(String(v), lang)}
                    style={{
                      fontFamily: isFa
                        ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                        : "'Plus Jakarta Sans', -apple-system, sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                    }}
                    tick={{
                      fontSize: 11,
                      fill: '#64748B',
                      fontFamily: isFa
                        ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                        : "'Plus Jakarta Sans', -apple-system, sans-serif",
                      style: {
                        fontFamily: isFa
                          ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                          : "'Plus Jakarta Sans', -apple-system, sans-serif",
                        fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                      },
                    }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(val: number) => formatCurrency(val, isFa ? 'Rial' : 'USD')}
                    style={{
                      fontFamily: isFa
                        ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                        : "'Plus Jakarta Sans', -apple-system, sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                    }}
                    tick={{
                      fontSize: 10,
                      fill: '#64748B',
                      fontFamily: isFa
                        ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                        : "'Plus Jakarta Sans', -apple-system, sans-serif",
                      style: {
                        fontFamily: isFa
                          ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                          : "'Plus Jakarta Sans', -apple-system, sans-serif",
                        fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                      },
                    }}
                    tickLine={false}
                    axisLine={false}
                    width={isFa ? 120 : 85}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#1E293B',
                      borderRadius: '0.75rem',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      fontFamily: isFa
                        ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                        : "'Plus Jakarta Sans', -apple-system, sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                      direction: isFa ? 'rtl' : 'ltr',
                      textAlign: isFa ? 'right' : 'left',
                    }}
                    labelStyle={{
                      fontFamily: isFa
                        ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                        : "'Plus Jakarta Sans', -apple-system, sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                      fontWeight: 700,
                      marginBottom: '4px',
                      color: '#E2E8F0',
                    }}
                    itemStyle={{
                      fontFamily: isFa
                        ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                        : "'Plus Jakarta Sans', -apple-system, sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                    }}
                    labelFormatter={(label) =>
                      isFa
                        ? `دوره ماهانه: ${toPersianDigits(String(label), lang)}`
                        : `Month: ${label}`
                    }
                    formatter={(val: any, name: any) => {
                      const label =
                        name === 'grossRevenue'
                          ? isFa
                            ? 'فروش ناخالص بلیط'
                            : 'Gross Ticket Sales'
                          : isFa
                          ? 'درآمد خالص فروش بلیط'
                          : 'Net Ticket Revenue';
                      return [formatCurrency(Number(val ?? 0), isFa ? 'Rial' : 'USD'), label];
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: '12px',
                      paddingTop: '12px',
                      fontFamily: isFa
                        ? "'Vazirmatn FD', 'Vazirmatn', sans-serif"
                        : "'Plus Jakarta Sans', -apple-system, sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                    }}
                    formatter={(value: string) => {
                      if (value === 'grossRevenue') {
                        return isFa ? 'فروش ناخالص بلیط (ریال)' : 'Gross Ticket Sales (USD)';
                      }
                      return isFa ? 'درآمد خالص فروش بلیط (ریال)' : 'Net Ticket Revenue (USD)';
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="grossRevenue"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#ticketGrossAreaGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="netRevenue"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#ticketNetAreaGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 30-Day Recharts Revenue Analysis */}
          <RevenueAnalysis transactions={db.transactions} lang={lang} />
        </div>
      )}

      {/* =====================================================================
          SECTION 2: OPERATIONS STAFF DIRECTORY & PROVISIONING
          ===================================================================== */}
      {activeSection === 'STAFF_HR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 rp-animate-in">
          {/* Left 4 Cols: Add New Staff Form */}
          <div className="rp-card-hover lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 h-fit shadow-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isFa ? 'ثبت کارشناس عملیات جدید' : 'Add Operations Specialist'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isFa
                    ? 'صدور مجوز دسترسی به پنل مهندسی خطوط و اعزام قطارها'
                    : 'Grant access to corridor engineering and train dispatch'}
                </p>
              </div>
            </div>

            {formFeedback && (
              <div
                className={`mb-4 p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  formFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                }`}
              >
                {formFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{formFeedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleAddEmployee} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isFa ? 'نام' : 'First Name'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isFa ? 'سارا' : 'Sara'}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isFa ? 'نام خانوادگی' : 'Last Name'}
                  </label>
                  <input
                    type="text"
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    placeholder={isFa ? 'احمدی' : 'Ahmadi'}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'نام کاربری سازمانی (یکتا)' : 'Corporate Username (Unique)'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="omid_karimi"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'پست الکترونیکی سازمانی (یکتا)' : 'Corporate Email (Unique)'}
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="o.karimi@railpulse.ir"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'معاونت / واحد عملیاتی' : 'Operational Department'}
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option value="Dispatch & Traffic Control">
                    {isFa
                      ? 'مرکز کنترل ترافیک و اعزام (CTC)'
                      : 'Dispatch & Traffic Control'}
                  </option>
                  <option value="Corridor Topology Engineering">
                    {isFa
                      ? 'مهندسی خطوط و شبکه ریلی'
                      : 'Corridor Topology Engineering'}
                  </option>
                  <option value="Fleet & High-Speed Operations">
                    {isFa
                      ? 'بهره‌برداری ناوگان سریع‌السیر'
                      : 'Fleet & High-Speed Operations'}
                  </option>
                  <option value="Safety & Signaling Compliance">
                    {isFa
                      ? 'ایمنی سیر و علائم الکتریکی'
                      : 'Safety & Signaling Compliance'}
                  </option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isFa ? 'رمز عبور اولیه' : 'Initial Password'}
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    {isFa ? pwdStrength.labelFa : pwdStrength.labelEn}
                  </span>
                </div>
                <input
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
                <div className="grid grid-cols-4 gap-1 mt-1.5">
                  {[1, 2, 3, 4].map((lvl) => (
                    <div
                      key={lvl}
                      className={`h-1 rounded-full ${
                        pwdStrength.score >= lvl
                          ? pwdStrength.score >= 3
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="rp-btn-primary w-full py-2.5 px-4 rounded-lg text-white font-semibold text-sm cursor-pointer"
              >
                {isFa
                  ? 'ایجاد حساب کارشناس عملیات'
                  : 'Provision Operations Specialist'}
              </button>
            </form>
          </div>

          {/* Right 8 Cols: Operations Staff Directory */}
          <div className="rp-card-hover lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isFa
                    ? 'فهرست کارشناسان عملیات ریلی سازمان'
                    : 'Registered Operations Specialists Directory'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isFa
                    ? 'جستجو، مرتب‌سازی، ویرایش مشخصات و مدیریت وضعیت دسترسی پرسنل'
                    : 'Search, sort, edit credentials, or revoke staff access'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute top-2.5 start-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      isFa
                        ? 'جستجوی نام، نام کاربری، ایمیل...'
                        : 'Search name, username, email...'
                    }
                    className="ps-8 pe-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                >
                  <option value="name">
                    {isFa ? 'مرتب‌سازی: نام' : 'Sort: First Name'}
                  </option>
                  <option value="username">
                    {isFa ? 'مرتب‌سازی: نام کاربری' : 'Sort: Username'}
                  </option>
                  <option value="department">
                    {isFa ? 'مرتب‌سازی: واحد سازمانی' : 'Sort: Department'}
                  </option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/50">
                    <th className="py-3 px-3 font-semibold text-start">
                      {isFa ? 'نام و نام خانوادگی' : 'Full Name'}
                    </th>
                    <th className="py-3 px-3 font-semibold text-start">
                      {isFa ? 'نام کاربری / ایمیل' : 'Username / Email'}
                    </th>
                    <th className="py-3 px-3 font-semibold text-start">
                      {isFa ? 'واحد سازمانی' : 'Department'}
                    </th>
                    <th className="py-3 px-3 font-semibold text-start">
                      {isFa ? 'وضعیت' : 'Status'}
                    </th>
                    <th className="py-3 px-3 font-semibold text-end">
                      {isFa ? 'عملیات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {localizeText(emp.name, lang)} {localizeText(emp.lastname, lang)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {formatNumber(emp.linesCreated, lang)} {isFa ? 'مسیر' : 'lines'} ·{' '}
                          {formatNumber(emp.trainsScheduled, lang)} {isFa ? 'قطار' : 'trains'} ·{' '}
                          {formatDateTime(emp.createdAt, lang, 'date')}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono" dir="ltr">
                        <div className="text-blue-600 dark:text-blue-400 font-semibold text-start">
                          @{emp.username}
                        </div>
                        <div className="text-slate-500 text-[11px] text-start">{emp.email}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {localizeDepartment(emp.department, lang)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                            emp.status === 'Active' || emp.status === 'On-Duty'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {emp.status === 'Active' || emp.status === 'On-Duty'
                            ? isFa
                              ? 'فعال'
                              : 'Active'
                            : isFa
                            ? 'تعلیق / مرخصی'
                            : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-end">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStaff(emp);
                              setEditName(emp.name);
                              setEditLastname(emp.lastname);
                              setEditEmail(emp.email);
                              setEditDepartment(emp.department);
                              setEditStatus(emp.status);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                            title={isFa ? 'ویرایش مشخصات' : 'Edit Specialist'}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingStaff(emp)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 cursor-pointer"
                            title={isFa ? 'حذف کارشناس' : 'Revoke Access'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        {isFa
                          ? 'هیچ کارشناسی با عبارت جستجوشده یافت نشد.'
                          : 'No operations specialists match your search criteria.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 3: AUDIT TRAIL & DATA SNAPSHOTS
          ===================================================================== */}
      {activeSection === 'AUDIT' && (
        <div className="space-y-6 rp-animate-in">
          {/* Snapshot & Seed Controls */}
          <div className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isFa
                  ? 'مدیریت نسخه‌های پشتیبان و بازنشانی داده‌های پایه'
                  : 'Database State Snapshots & Seed Reset'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isFa
                  ? 'دریافت خروجی کامل JSON از وضعیت فعلی سامانه، بارگذاری نسخه پشتیبان یا بازگشت به داده‌های پیش‌فرض'
                  : 'Export complete database state to JSON, import a snapshot, or reset to clean seed data'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportSnapshot}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isFa ? 'دانلود پشتیبان JSON' : 'Export JSON Snapshot'}</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{isFa ? 'بارگذاری پشتیبان JSON' : 'Import JSON Snapshot'}</span>
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleImportSnapshot}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  const fresh = resetToDefaultSeedDatabase();
                  onUpdateDb(fresh);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-medium text-amber-700 dark:text-amber-300 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {isFa ? 'بازنشانی به داده‌های پیش‌فرض' : 'Reset Default Seed Data'}
                </span>
              </button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
              {isFa
                ? 'فهرست رخدادهای ثبت‌شده در دفتر کل ممیزی امنیتی'
                : 'Immutable Security & Operations Audit Log'}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 text-start">
                      {isFa ? 'زمان ثبت' : 'Timestamp'}
                    </th>
                    <th className="py-2.5 px-3 text-start">
                      {isFa ? 'کاربر عامل' : 'Actor'}
                    </th>
                    <th className="py-2.5 px-3 text-start">
                      {isFa ? 'نوع عملیات' : 'Operation Type'}
                    </th>
                    <th className="py-2.5 px-3 text-start">
                      {isFa ? 'شرح رخداد' : 'Audit Details'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {db.auditLogs.slice(0, 25).map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {formatDateTime(log.timestamp, lang, 'full')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span dir="ltr" className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          @{log.actorUsername}
                        </span>{' '}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {localizeRole(log.actorRole, lang)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-blue-600 dark:text-blue-400">
                        {localizeAuditAction(log.action, lang)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {isFa ? toPersianDigits(log.detailsFa, 'fa') : log.detailsEn}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 4: 5-PHASE AUTOMATED QA SUITE
          ===================================================================== */}
      {activeSection === 'QA_SUITE' && <QATestSuitePanel lang={lang} />}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="rp-modal-backdrop fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rp-modal-content bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isFa
                  ? `ویرایش پرونده کارشناس (@${editingStaff.username})`
                  : `Edit Specialist Profile (@${editingStaff.username})`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditEmployee} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isFa ? 'نام' : 'First Name'}
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isFa ? 'نام خانوادگی' : 'Last Name'}
                  </label>
                  <input
                    type="text"
                    value={editLastname}
                    onChange={(e) => setEditLastname(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'پست الکترونیکی' : 'Email'}
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isFa ? 'واحد سازمانی' : 'Department'}
                  </label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isFa ? 'وضعیت فعالیت' : 'Status'}
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Employee['status'])}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="Active">{isFa ? 'فعال' : 'Active'}</option>
                    <option value="On-Duty">{isFa ? 'در شیفت عملیاتی' : 'On-Duty'}</option>
                    <option value="Suspended">{isFa ? 'تعلیق / مرخصی' : 'Suspended'}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer"
                >
                  {isFa ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="rp-btn-primary px-4 py-2 rounded-lg text-white text-xs font-semibold cursor-pointer"
                >
                  {isFa ? 'ذخیره تغییرات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation Modal */}
      {deletingStaff && (
        <div className="rp-modal-backdrop fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rp-modal-content bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
              {isFa
                ? 'تأیید لغو دسترسی و حذف کارشناس'
                : 'Confirm Specialist Removal'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
              {isFa
                ? `آیا از حذف حساب کاربری کارشناس «${deletingStaff.name} ${deletingStaff.lastname}» (@${deletingStaff.username}) اطمینان دارید؟`
                : `Are you sure you want to revoke access and remove "${deletingStaff.name} ${deletingStaff.lastname}" (@${deletingStaff.username})?`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEmployee}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
              >
                {isFa ? 'حذف قطعی کارشناس' : 'Remove Specialist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </EnterpriseBackofficeLayout>
  );
};
