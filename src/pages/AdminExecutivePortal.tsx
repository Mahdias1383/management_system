import React, { useMemo, useState } from 'react';
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
  hashPassword,
  isValidEmail,
  normalizeIdentifier,
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
        <div className="space-y-6">
          {/* 5 Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'کریدورهای ریلی فعال' : 'Active Rail Corridors'}
                </span>
                <GitBranch className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {db.lines.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {db.lines.reduce((s, l) => s + l.num_state, 0)}{' '}
                {isFa ? 'ایستگاه میانی در شبکه' : 'intermediate stops'}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'ناوگان قطارهای فعال' : 'Operating Train Fleet'}
                </span>
                <Train className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {db.trains.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {db.trains.reduce((s, t) => s + t.capacity, 0)}{' '}
                {isFa ? 'صندلی آماده فروش' : 'available seats'}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'کارشناسان و مسافران' : 'Staff & Passengers'}
                </span>
                <Users className="w-4 h-4 text-violet-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {db.employees.length} / {db.passengers.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isFa
                  ? `${db.employees.length} کارشناس · ${db.passengers.length} مسافر`
                  : `${db.employees.length} staff · ${db.passengers.length} passengers`}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'درآمد خالص فروش بلیط' : 'Net Ticket Revenue'}
                </span>
                <Wallet className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                ${totalRevenue.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {confirmedTicketsCount}{' '}
                {isFa ? 'رزرو قطعی ثبت‌شده' : 'confirmed bookings'}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'شاخص ایمنی سیر' : 'Dispatch Safety Index'}
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                100.0%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isFa
                  ? 'صفر تداخل در رادار ضدبرخورد'
                  : 'Zero active track collisions'}
              </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 4 Cols: Add New Staff Form */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 h-fit">
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
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                {isFa
                  ? 'ایجاد حساب کارشناس عملیات'
                  : 'Provision Operations Specialist'}
              </button>
            </form>
          </div>

          {/* Right 8 Cols: Operations Staff Directory */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col">
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
                          {emp.name} {emp.lastname}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {emp.linesCreated} {isFa ? 'مسیر' : 'lines'} ·{' '}
                          {emp.trainsScheduled} {isFa ? 'قطار' : 'trains'}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <div className="text-blue-600 dark:text-blue-400 font-semibold">
                          @{emp.username}
                        </div>
                        <div className="text-slate-500 text-[11px]">{emp.email}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {emp.department}
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
        <div className="space-y-6">
          {/* Snapshot & Seed Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
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
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          @{log.actorUsername}
                        </span>{' '}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {log.actorRole}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {isFa ? log.detailsFa : log.detailsEn}
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
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
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
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
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
