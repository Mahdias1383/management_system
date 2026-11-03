import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, Variants } from 'framer-motion';
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
  Bell,
  BellRing,
  Calendar,
  CheckCheck,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit3,
  FileCode2,
  FileText,
  Filter,
  GitBranch,
  Radar,
  Radio,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Train,
  Trash2,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import {
  ActiveSession,
  AuditLogEntry,
  Employee,
  ExecutiveAlert,
  ExecutiveAlertCategory,
  Language,
  PlatformDatabaseV2,
  ThemeMode,
} from '../types/domain';
import {
  AuditTimeWindowPreset,
  classifyAuditActionCategory,
  computeAuditBulkSelectionState,
  evaluatePasswordStrength,
  filterAuditLogs,
  formatCompactCurrency,
  formatDateTime,
  formatNumber,
  formatCurrency,
  formatTime,
  generateComplianceAuditCsv,
  hashPassword,
  isValidEmail,
  localizeAuditAction,
  localizeDepartment,
  localizeRole,
  localizeText,
  normalizeIdentifier,
  resolveAuditLogsForCsvExport,
  toPersianDigits,
  toggleSelectAllAuditLogs,
  toggleSingleAuditLogSelection,
} from '../services/authService';
import {
  dismissExecutiveAlert,
  getExecutiveAlerts,
  HIGH_REVENUE_THRESHOLD_RIAL,
  isHighRevenueTicket,
  markAllExecutiveAlertsRead,
  markExecutiveAlertRead,
  pushHighRevenueBookingAlert,
  pushSafetyRadarConflictAlert,
  simulateHighRevenueBookingPush,
  simulateSafetyRadarConflictPush,
  subscribeToExecutiveAlerts,
} from '../services/alertCenterService';
import { checkAccident } from '../services/collisionEngine';
import { resetToDefaultSeedDatabase } from '../services/storageAndMigration';
import { RevenueAnalysis } from '../components/RevenueAnalysis';
import { QATestSuitePanel } from '../components/QATestSuitePanel';
import {
  EnterpriseBackofficeLayout,
  SidebarNavItem,
} from '../layouts/EnterpriseBackofficeLayout';
import {
  BUTTON_HOVER_PROPS,
  fadeSlideUpVariants,
  filterControlEntranceVariants,
  filterToolbarVariants,
  SOFT_SPRING_TRANSITION,
} from '../components/ui/motionPrimitives';
import { useOnClickOutside } from '../hooks/useOnClickOutside';

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

type AdminSidebarSection =
  | 'OVERVIEW'
  | 'ALERT_CENTER'
  | 'STAFF_HR'
  | 'AUDIT'
  | 'QA_SUITE';

const kpiGridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.03,
    },
  },
};

const kpiCardVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.975 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 320,
      damping: 24,
    },
  },
  hover: {
    y: -5,
    scale: 1.05,
    boxShadow:
      '0 18px 34px -10px rgba(37, 99, 235, 0.16), 0 8px 16px -6px rgba(15, 23, 42, 0.08)',
    transition: {
      type: 'spring',
      stiffness: 380,
      damping: 22,
    },
  },
};

const kpiIconVariants: Variants = {
  hidden: { scale: 0.9, opacity: 0.8 },
  visible: { scale: 1, opacity: 1 },
  hover: {
    scale: 1.16,
    rotate: 6,
    transition: {
      type: 'spring',
      stiffness: 420,
      damping: 16,
    },
  },
};

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
  const editStaffModalRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(editStaffModalRef, () => setEditingStaff(null), {
    enabled: Boolean(editingStaff),
  });

  // Staff Delete Confirmation Modal State
  const [deletingStaff, setDeletingStaff] = useState<Employee | null>(null);
  const deleteStaffModalRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(deleteStaffModalRef, () => setDeletingStaff(null), {
    enabled: Boolean(deletingStaff),
  });

  // Real-Time Executive Alert Center State
  const [alerts, setAlerts] = useState<ExecutiveAlert[]>(() =>
    getExecutiveAlerts(db)
  );
  const [sidebarAlertFilter, setSidebarAlertFilter] = useState<
    'ALL' | ExecutiveAlertCategory
  >('ALL');
  const [workspaceAlertFilter, setWorkspaceAlertFilter] = useState<
    'ALL' | ExecutiveAlertCategory
  >('ALL');
  const [livePushToast, setLivePushToast] = useState<ExecutiveAlert | null>(null);
  const livePushToastRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(livePushToastRef, () => setLivePushToast(null), {
    enabled: Boolean(livePushToast),
  });
  const [autoStreamActive, setAutoStreamActive] = useState(false);
  const knownTicketIdsRef = useRef<Set<string>>(
    new Set(db.tickets.map((t) => t.id))
  );
  const toastTimerRef = useRef<number | null>(null);

  // Subscribe to real-time Alert Center events (same-tab & cross-tab)
  useEffect(() => {
    const unsubscribe = subscribeToExecutiveAlerts((nextAlerts, pushedAlert) => {
      setAlerts(nextAlerts);
      if (pushedAlert) {
        setLivePushToast(pushedAlert);
        if (toastTimerRef.current) {
          window.clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = window.setTimeout(() => {
          setLivePushToast(null);
        }, 7000);
      }
    });
    return () => {
      unsubscribe();
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Automatically detect newly created high-revenue bookings in db.tickets
  useEffect(() => {
    db.tickets.forEach((ticket) => {
      if (!knownTicketIdsRef.current.has(ticket.id)) {
        knownTicketIdsRef.current.add(ticket.id);
        if (ticket.status === 'Confirmed' && isHighRevenueTicket(ticket)) {
          pushHighRevenueBookingAlert(ticket);
        }
      }
    });
  }, [db.tickets]);

  // Automatically scan active fleet schedules for safety radar conflicts
  useEffect(() => {
    db.lines.forEach((line) => {
      const lineTrains = db.trains.filter(
        (t) =>
          normalizeIdentifier(t.name_line) === normalizeIdentifier(line.name_line)
      );
      lineTrains.forEach((train) => {
        const report = checkAccident(train, lineTrains, line);
        if (report.hasConflict) {
          report.conflicts.forEach((conflict) => {
            pushSafetyRadarConflictAlert(conflict);
          });
        }
      });
    });
  }, [db.lines, db.trains]);

  // Optional live auto-stream mode for real-time executive telemetry demonstration
  useEffect(() => {
    if (!autoStreamActive) return;
    const interval = window.setInterval(() => {
      if (Math.random() > 0.45) {
        simulateHighRevenueBookingPush(db);
      } else {
        simulateSafetyRadarConflictPush(db);
      }
    }, 9000);
    return () => window.clearInterval(interval);
  }, [autoStreamActive, db]);

  const unreadAlertsCount = useMemo(
    () => alerts.filter((a) => !a.read).length,
    [alerts]
  );

  const unreadCriticalAlertsCount = useMemo(
    () =>
      alerts.filter(
        (a) => !a.read && a.category === 'SAFETY_RADAR_CONFLICT'
      ).length,
    [alerts]
  );

  const filteredSidebarAlerts = useMemo(() => {
    if (sidebarAlertFilter === 'ALL') return alerts.slice(0, 6);
    return alerts.filter((a) => a.category === sidebarAlertFilter).slice(0, 6);
  }, [alerts, sidebarAlertFilter]);

  const filteredWorkspaceAlerts = useMemo(() => {
    if (workspaceAlertFilter === 'ALL') return alerts;
    return alerts.filter((a) => a.category === workspaceAlertFilter);
  }, [alerts, workspaceAlertFilter]);

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
          entityType: 'STAFF',
          entityId: newEmployee.username,
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
          entityType: 'STAFF',
          entityId: editingStaff.username,
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
          entityType: 'STAFF',
          entityId: target.username,
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
          const importedDb = parsed as PlatformDatabaseV2;
          onUpdateDb({
            ...importedDb,
            auditLogs: [
              {
                id: `log_${Date.now()}`,
                timestamp: new Date().toISOString(),
                actorRole: 'admin',
                actorUsername: session.username,
                action: 'DATABASE_SNAPSHOT_RESTORED',
                entityType: 'SYSTEM',
                entityId: file.name,
                detailsEn: `Restored complete database snapshot from file "${file.name}" (${importedDb.trains.length} trains, ${importedDb.tickets.length} tickets).`,
                detailsFa: `بازگردانی کامل نسخه پشتیبان پایگاه‌داده از فایل «${file.name}» (${importedDb.trains.length} قطار، ${importedDb.tickets.length} بلیط).`,
              },
              ...(importedDb.auditLogs || []),
            ],
          });
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

  // =========================================================================
  // ACTIVITY MONITOR STATE, FILTERING & LIVE SIMULATION ENGINE
  // =========================================================================
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<
    'ALL' | 'RESERVATIONS' | 'SCHEDULES' | 'STAFF' | 'FINANCIAL' | 'SYSTEM'
  >('ALL');
  const [activityRoleFilter, setActivityRoleFilter] = useState<
    'ALL' | 'admin' | 'staff' | 'passenger' | 'system'
  >('ALL');
  const [activityStartDate, setActivityStartDate] = useState('');
  const [activityEndDate, setActivityEndDate] = useState('');
  const [activityTimePreset, setActivityTimePreset] =
    useState<AuditTimeWindowPreset>('ALL');
  const [inspectingLog, setInspectingLog] = useState<AuditLogEntry | null>(null);
  const inspectLogModalRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(inspectLogModalRef, () => setInspectingLog(null), {
    enabled: Boolean(inspectingLog),
  });
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [complianceExportNotice, setComplianceExportNotice] = useState<string | null>(null);
  const [selectedAuditLogIds, setSelectedAuditLogIds] = useState<string[]>([]);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const classifyAuditCategory = classifyAuditActionCategory;

  const hasActiveAuditFilters = Boolean(
    activitySearchQuery.trim() ||
      activityCategoryFilter !== 'ALL' ||
      activityRoleFilter !== 'ALL' ||
      activityStartDate ||
      activityEndDate ||
      activityTimePreset !== 'ALL'
  );

  const handleResetActivityFilters = () => {
    setActivitySearchQuery('');
    setActivityCategoryFilter('ALL');
    setActivityRoleFilter('ALL');
    setActivityStartDate('');
    setActivityEndDate('');
    setActivityTimePreset('ALL');
  };

  const activityStats = useMemo(() => {
    let reservations = 0;
    let schedules = 0;
    let staff = 0;
    let financial = 0;
    db.auditLogs.forEach((log) => {
      const cat = classifyAuditCategory(log.action);
      if (cat === 'RESERVATIONS') reservations++;
      else if (cat === 'SCHEDULES') schedules++;
      else if (cat === 'STAFF') staff++;
      else if (cat === 'FINANCIAL') financial++;
    });
    return {
      total: db.auditLogs.length,
      reservations,
      schedules,
      staff,
      financial,
    };
  }, [db.auditLogs, classifyAuditCategory]);

  const filteredAuditLogs = useMemo(() => {
    return filterAuditLogs(db.auditLogs, {
      keyword: activitySearchQuery,
      category: activityCategoryFilter,
      role: activityRoleFilter,
      startDate: activityStartDate,
      endDate: activityEndDate,
      timeWindowPreset: activityTimePreset,
    });
  }, [
    db.auditLogs,
    activitySearchQuery,
    activityCategoryFilter,
    activityRoleFilter,
    activityStartDate,
    activityEndDate,
    activityTimePreset,
  ]);

  const visibleAuditLogs = useMemo(
    () => filteredAuditLogs.slice(0, 50),
    [filteredAuditLogs]
  );

  const auditBulkSelection = useMemo(
    () => computeAuditBulkSelectionState(visibleAuditLogs, selectedAuditLogIds),
    [visibleAuditLogs, selectedAuditLogIds]
  );

  const selectedExportLogs = useMemo(
    () =>
      resolveAuditLogsForCsvExport(
        db.auditLogs,
        filteredAuditLogs,
        selectedAuditLogIds,
        'SELECTED'
      ),
    [db.auditLogs, filteredAuditLogs, selectedAuditLogIds]
  );

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = auditBulkSelection.isIndeterminate;
    }
  }, [auditBulkSelection.isIndeterminate, auditBulkSelection.isAllVisibleSelected]);

  const handleToggleSelectAllAuditLogs = () => {
    setSelectedAuditLogIds((prev) =>
      toggleSelectAllAuditLogs(visibleAuditLogs, prev)
    );
  };

  const handleToggleSingleAuditLog = (logId: string) => {
    setSelectedAuditLogIds((prev) => toggleSingleAuditLogSelection(logId, prev));
  };

  const handleClearAuditSelection = () => {
    setSelectedAuditLogIds([]);
  };

  const handleSimulateReservationActivity = () => {
    const sampleTrain = db.trains[0] || {
      id_train: 'TR-101',
      name_train: 'Fadak Royal HSR 101',
      name_line: 'Tehran-Mashhad High-Speed',
      cost_ticket: 6500000,
    };
    const samplePassenger = db.passengers[0] || {
      username: 'mahdi_as',
      name: 'Mahdi Asadi',
    };
    const pnr = `RP-${Math.floor(10000 + Math.random() * 90000)}`;
    const seatCount = 2;
    const totalIrr = sampleTrain.cost_ticket * seatCount;
    const nowIso = new Date().toISOString();

    const newLog: AuditLogEntry = {
      id: `aud_sim_res_${Date.now()}`,
      timestamp: nowIso,
      actorRole: 'passenger',
      actorUsername: samplePassenger.username,
      action: 'TICKET_BOOKED',
      entityType: 'TICKET',
      entityId: pnr,
      detailsEn: `Passenger ${samplePassenger.username} booked ${seatCount} seat(s) (3A, 3B) on ${sampleTrain.id_train} (${sampleTrain.name_line}) for ${formatCurrency(totalIrr, 'USD')} (PNR: ${pnr}).`,
      detailsFa: `مسافر ${samplePassenger.username} تعداد ${seatCount} صندلی (3A، 3B) در قطار ${sampleTrain.id_train} (${sampleTrain.name_line}) به مبلغ ${formatCurrency(totalIrr, 'Rial')} رزرو کرد (کد: ${pnr}).`,
    };

    onUpdateDb({
      ...db,
      auditLogs: [newLog, ...db.auditLogs],
    });
  };

  const handleSimulateScheduleModificationActivity = () => {
    const sampleTrain = db.trains[0] || {
      id_train: 'TR-101',
      name_train: 'Fadak Royal HSR 101',
      name_line: 'Tehran-Mashhad High-Speed',
      departureTime: '07:00',
      speed: 180,
      cost_ticket: 6500000,
    };
    const sampleStaff = db.employees[0] || {
      username: 'sara_ahmadi',
    };
    const nowIso = new Date().toISOString();

    const newLog: AuditLogEntry = {
      id: `aud_sim_sch_${Date.now()}`,
      timestamp: nowIso,
      actorRole: 'staff',
      actorUsername: sampleStaff.username,
      action: 'UPDATE_TRAIN_SCHEDULE',
      entityType: 'SCHEDULE',
      entityId: sampleTrain.id_train,
      detailsEn: `Updated schedule for train ${sampleTrain.id_train} (${sampleTrain.name_train}) on ${sampleTrain.name_line}: Departure ${sampleTrain.departureTime} -> 07:15, Speed ${sampleTrain.speed} -> 195 km/h (Verified conflict-free by Collision Radar).`,
      detailsFa: `ویرایش زمانبندی قطار ${sampleTrain.id_train} (${sampleTrain.name_train}) در خط ${sampleTrain.name_line}: تغییر ساعت حرکت از ${sampleTrain.departureTime} به 07:15 و سرعت از ${sampleTrain.speed} به 195 کیلومتر/ساعت (تأییدشده توسط رادار ضدبرخورد).`,
    };

    onUpdateDb({
      ...db,
      auditLogs: [newLog, ...db.auditLogs],
    });
  };

  const handleExportAuditCsv = (
    scope: 'FILTERED' | 'ALL' | 'SELECTED' = 'FILTERED'
  ) => {
    const targetLogs = resolveAuditLogsForCsvExport(
      db.auditLogs,
      filteredAuditLogs,
      selectedAuditLogIds,
      scope
    );
    const csvContent = generateComplianceAuditCsv(targetLogs);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const scopeSlug =
      scope === 'ALL'
        ? 'full-ledger'
        : scope === 'SELECTED'
        ? 'selected-entries'
        : activityCategoryFilter.toLowerCase();
    const fileName = `railpulse-compliance-audit-${scopeSlug}-${dateStamp}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    setComplianceExportNotice(
      scope === 'SELECTED'
        ? isFa
          ? `گزارش ممیزی انطباق برای ${formatNumber(targetLogs.length, 'fa')} رخداد انتخاب‌شده با موفقیت در قالب CSV صادر شد (${fileName}).`
          : `Compliance audit report for ${targetLogs.length} selected entries exported as CSV (${fileName}).`
        : isFa
        ? `گزارش ممیزی انطباق (${formatNumber(targetLogs.length, 'fa')} رکورد) با موفقیت در قالب CSV صادر شد (${fileName}).`
        : `Compliance audit report (${targetLogs.length} records) exported as CSV (${fileName}).`
    );
    window.setTimeout(() => setComplianceExportNotice(null), 6000);
  };

  const navItems: SidebarNavItem[] = [
    {
      id: 'OVERVIEW',
      labelFa: 'داشبورد کلان مدیریتی و مالی',
      labelEn: 'Executive & Revenue Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'ALERT_CENTER',
      labelFa: 'مرکز هشدارهای آنی و رادار',
      labelEn: 'Real-Time Alert Center',
      badgeCount: unreadAlertsCount,
      badgeTone: unreadCriticalAlertsCount > 0 ? 'critical' : 'live',
      icon: <BellRing className="w-4 h-4" />,
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
      labelFa: 'پایشگر هوشمند فعالیت‌ها',
      labelEn: 'Activity Monitor',
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
    ALERT_CENTER: {
      titleFa: 'مرکز هشدارهای آنی رزروهای کلان و رادار ایمنی سیر',
      titleEn: 'Real-Time Executive Alert Center & Safety Radar Stream',
      subtitleFa: 'دریافت بلادرنگ اعلان‌های خرید بلیط با درآمد بالا و هشدارهای تداخل زمانی-مکانی رادار ضدبرخورد',
      subtitleEn: 'Real-time push notifications for high-revenue bookings and automated collision radar conflicts',
    },
    STAFF_HR: {
      titleFa: 'مدیریت کارشناسان و مهندسان عملیات ریلی',
      titleEn: 'Railway Operations Staff Provisioning & Directory',
      subtitleFa: 'ایجاد حساب کاربری برای کارشناسان جدید، مدیریت سطح دسترسی و پایش عملکرد پرسنل',
      subtitleEn: 'Provision new railway dispatchers, manage credentials, and review operational assignments',
    },
    AUDIT: {
      titleFa: 'پایشگر هوشمند فعالیت‌ها و دفتر کل ممیزی سامانه',
      titleEn: 'Enterprise Activity Monitor & Automated Audit Trail',
      subtitleFa: 'ردیابی خودکار و بلادرنگ اقدامات حیاتی کاربران شامل رزرو بلیط، ویرایش جدول زمانبندی قطارها و عملیات مدیریتی',
      subtitleEn: 'Automated real-time tracking of critical user actions including ticket reservations, schedule modifications, and administrative changes',
    },
    QA_SUITE: {
      titleFa: 'پنل مهندسی تست و تضمین کیفیت خودکار ۵ مرحله‌ای',
      titleEn: '5-Phase Automated Engineering QA & Verification Suite',
      subtitleFa: 'اجرای زنده ۱۲ سناریوی تست واحد، یکپارچه‌سازی، مهاجرت داده، سرتاسری و ایزولاسیون امنیتی',
      subtitleEn: 'Live execution of 12 automated suites covering unit math, migration, E2E, and RBAC isolation',
    },
  }[activeSection];

  const sidebarAlertCenterWidget = (
    <div
      data-testid="sidebar-alert-center"
      className="rounded-xl bg-slate-950/90 border border-slate-800/90 p-3 flex flex-col gap-2.5 shadow-inner"
    >
      {/* Sidebar Alert Center Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                unreadCriticalAlertsCount > 0 ? 'bg-rose-400' : 'bg-emerald-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                unreadCriticalAlertsCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
            />
          </span>
          <span className="text-xs font-bold text-white truncate">
            {isFa ? 'مرکز هشدارهای آنی' : 'Real-Time Alert Center'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {unreadAlertsCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {formatNumber(unreadAlertsCount, lang)}{' '}
              {isFa ? 'جدید' : 'new'}
            </span>
          )}
          {unreadAlertsCount > 0 && (
            <button
              type="button"
              onClick={() => markAllExecutiveAlertsRead()}
              className="p-1 rounded-md text-slate-400 hover:text-emerald-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
              title={isFa ? 'علامت‌گذاری همه به‌عنوان خوانده‌شده' : 'Mark all as read'}
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs inside Sidebar */}
      <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800/80 text-[10px]">
        <button
          type="button"
          onClick={() => setSidebarAlertFilter('ALL')}
          className={`py-1 px-1.5 rounded-md font-semibold transition-colors cursor-pointer truncate ${
            sidebarAlertFilter === 'ALL'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {isFa ? 'همه' : 'All'} ({formatNumber(alerts.length, lang)})
        </button>
        <button
          type="button"
          onClick={() => setSidebarAlertFilter('HIGH_REVENUE_BOOKING')}
          className={`py-1 px-1.5 rounded-md font-semibold transition-colors cursor-pointer truncate ${
            sidebarAlertFilter === 'HIGH_REVENUE_BOOKING'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-emerald-300'
          }`}
        >
          {isFa ? 'رزرو کلان' : 'Revenue'}
        </button>
        <button
          type="button"
          onClick={() => setSidebarAlertFilter('SAFETY_RADAR_CONFLICT')}
          className={`py-1 px-1.5 rounded-md font-semibold transition-colors cursor-pointer truncate ${
            sidebarAlertFilter === 'SAFETY_RADAR_CONFLICT'
              ? 'bg-rose-600 text-white'
              : 'text-slate-400 hover:text-rose-300'
          }`}
        >
          {isFa ? 'رادار ایمنی' : 'Radar'}
        </button>
      </div>

      {/* Live Push Feed Stream inside Sidebar */}
      <div className="space-y-1.5 max-h-[260px] overflow-y-auto pe-0.5">
        <AnimatePresence initial={false}>
          {filteredSidebarAlerts.map((alert) => {
            const isRadar = alert.category === 'SAFETY_RADAR_CONFLICT';
            return (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, y: -10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                onClick={() => {
                  markExecutiveAlertRead(alert.id);
                  setActiveSection('ALERT_CENTER');
                }}
                className={`group relative rounded-lg p-2.5 border text-start transition-all cursor-pointer ${
                  isRadar
                    ? alert.read
                      ? 'bg-slate-900/60 border-slate-800/80 hover:border-rose-500/40'
                      : 'bg-rose-950/35 border-rose-500/40 hover:border-rose-400'
                    : alert.read
                    ? 'bg-slate-900/60 border-slate-800/80 hover:border-emerald-500/40'
                    : 'bg-emerald-950/30 border-emerald-500/40 hover:border-emerald-400'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`p-1 rounded-md shrink-0 ${
                        isRadar
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {isRadar ? (
                        <Radar className="w-3 h-3" />
                      ) : (
                        <Wallet className="w-3 h-3" />
                      )}
                    </span>
                    <span className="text-[11px] font-bold text-slate-100 truncate">
                      {isFa ? alert.titleFa : alert.titleEn}
                    </span>
                  </div>
                  {!alert.read && (
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 mt-1 ${
                        isRadar ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400 animate-pulse'
                      }`}
                    />
                  )}
                </div>

                <p className="text-[10px] text-slate-300/90 line-clamp-2 mt-1 leading-relaxed">
                  {isFa ? toPersianDigits(alert.messageFa, 'fa') : alert.messageEn}
                </p>

                <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-slate-800/70 text-[10px]">
                  {alert.amountIrr ? (
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(alert.amountIrr, isFa ? 'Rial' : 'USD')}
                    </span>
                  ) : (
                    <span className="font-mono font-semibold text-rose-300 truncate">
                      {toPersianDigits(alert.trainId || '', lang)} ·{' '}
                      {alert.overlapWindow
                        ? formatTime(alert.overlapWindow, lang)
                        : localizeText(alert.locationLabel || '', lang)}
                    </span>
                  )}
                  <span className="text-slate-500 font-mono shrink-0">
                    {formatDateTime(alert.timestamp, lang, 'shortDate')}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Quick Live Push Triggers inside Sidebar */}
      <div className="pt-1 border-t border-slate-800/80 space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => simulateHighRevenueBookingPush(db)}
            className="px-2 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title={
              isFa
                ? 'شبیه‌سازی اعلان آنی رزرو با درآمد بالا'
                : 'Simulate High-Revenue Booking Push Notification'
            }
          >
            <Zap className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {isFa ? '+ اعلان رزرو کلان' : '+ High-Rev Push'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => simulateSafetyRadarConflictPush(db)}
            className="px-2 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title={
              isFa
                ? 'شبیه‌سازی اعلان آنی تداخل رادار ایمنی'
                : 'Simulate Safety Radar Conflict Push Notification'
            }
          >
            <Radar className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {isFa ? '+ هشدار رادار' : '+ Radar Conflict'}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setActiveSection('ALERT_CENTER')}
          className="w-full py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-semibold transition-colors cursor-pointer text-center"
        >
          {isFa
            ? 'مشاهده کامل مرکز هشدارهای آنی ←'
            : 'Open Full Alert Center Workspace →'}
        </button>
      </div>
    </div>
  );

  const sidebarCollapsedAlertButton = (
    <button
      type="button"
      onClick={() => setActiveSection('ALERT_CENTER')}
      className="relative p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 hover:text-white hover:border-blue-500/50 cursor-pointer"
      title={isFa ? 'مرکز هشدارهای آنی' : 'Real-Time Alert Center'}
    >
      <BellRing className="w-4 h-4 text-emerald-400" />
      {unreadAlertsCount > 0 && (
        <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 rounded-full bg-rose-600 text-white text-[9px] font-mono font-bold flex items-center justify-center">
          {formatNumber(unreadAlertsCount, lang)}
        </span>
      )}
    </button>
  );

  const headerAlertIndicator = (
    <button
      type="button"
      onClick={() => setActiveSection('ALERT_CENTER')}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
        unreadCriticalAlertsCount > 0
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          : unreadAlertsCount > 0
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
      }`}
    >
      <BellRing className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">
        {isFa ? 'هشدارهای آنی' : 'Live Alerts'}
      </span>
      <span className="font-mono px-1.5 py-0.5 rounded bg-slate-900/10 dark:bg-white/10 text-[11px]">
        {formatNumber(unreadAlertsCount, lang)}
      </span>
    </button>
  );

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
      sidebarAlertSlot={sidebarAlertCenterWidget}
      sidebarCollapsedSlot={sidebarCollapsedAlertButton}
      headerActionSlot={headerAlertIndicator}
    >
      {/* Floating Real-Time Push Notification Toast Banner */}
      <AnimatePresence>
        {livePushToast && (
          <motion.div
            ref={livePushToastRef}
            key={livePushToast.id}
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 25 }}
            className={`mb-5 p-4 rounded-xl border shadow-lg flex flex-wrap items-center justify-between gap-4 ${
              livePushToast.category === 'SAFETY_RADAR_CONFLICT'
                ? 'bg-rose-950/95 border-rose-500/50 text-rose-100'
                : 'bg-slate-900/95 border-emerald-500/50 text-emerald-50'
            }`}
          >
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  livePushToast.category === 'SAFETY_RADAR_CONFLICT'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {livePushToast.category === 'SAFETY_RADAR_CONFLICT' ? (
                  <Radar className="w-5 h-5 animate-pulse" />
                ) : (
                  <BellRing className="w-5 h-5 animate-bounce" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      livePushToast.category === 'SAFETY_RADAR_CONFLICT'
                        ? 'bg-rose-500/30 text-rose-200'
                        : 'bg-emerald-500/30 text-emerald-200'
                    }`}
                  >
                    {livePushToast.category === 'SAFETY_RADAR_CONFLICT'
                      ? isFa
                        ? 'اعلان آنی رادار ایمنی'
                        : 'LIVE RADAR CONFLICT PUSH'
                      : isFa
                      ? 'اعلان آنی رزرو کلان'
                      : 'LIVE HIGH-REVENUE BOOKING PUSH'}
                  </span>
                  <h4 className="text-sm font-bold text-white truncate">
                    {isFa ? livePushToast.titleFa : livePushToast.titleEn}
                  </h4>
                  {livePushToast.amountIrr && (
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {formatCurrency(livePushToast.amountIrr, isFa ? 'Rial' : 'USD')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                  {isFa
                    ? toPersianDigits(livePushToast.messageFa, 'fa')
                    : livePushToast.messageEn}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  markExecutiveAlertRead(livePushToast.id);
                  setActiveSection('ALERT_CENTER');
                  setLivePushToast(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
              >
                {isFa ? 'بررسی در مرکز هشدار' : 'Inspect Alert'}
              </button>
              <button
                type="button"
                onClick={() => setLivePushToast(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                title={isFa ? 'بستن اعلان' : 'Dismiss'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* =====================================================================
          SECTION 1: EXECUTIVE & REVENUE ANALYTICS
          ===================================================================== */}
      {activeSection === 'OVERVIEW' && (
        <div className="space-y-6 rp-animate-in">
          {/* 5 Executive KPI Cards */}
          <motion.div
            variants={kpiGridVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            <motion.div
              variants={kpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs cursor-default"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'کریدورهای ریلی فعال' : 'Active Rail Corridors'}
                </span>
                <motion.span
                  variants={kpiIconVariants}
                  className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 inline-flex items-center justify-center"
                >
                  <GitBranch className="w-4 h-4" />
                </motion.span>
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
            </motion.div>

            <motion.div
              variants={kpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs cursor-default"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'ناوگان قطارهای فعال' : 'Operating Train Fleet'}
                </span>
                <motion.span
                  variants={kpiIconVariants}
                  className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 inline-flex items-center justify-center"
                >
                  <Train className="w-4 h-4" />
                </motion.span>
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
            </motion.div>

            <motion.div
              variants={kpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs cursor-default"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'کارشناسان و مسافران' : 'Staff & Passengers'}
                </span>
                <motion.span
                  variants={kpiIconVariants}
                  className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500 inline-flex items-center justify-center"
                >
                  <Users className="w-4 h-4" />
                </motion.span>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {formatNumber(db.employees.length, lang)} / {formatNumber(db.passengers.length, lang)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isFa
                  ? `${formatNumber(db.employees.length, lang)} کارشناس · ${formatNumber(db.passengers.length, lang)} مسافر`
                  : `${db.employees.length} staff · ${db.passengers.length} passengers`}
              </div>
            </motion.div>

            <motion.div
              variants={kpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs cursor-default"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'درآمد خالص فروش بلیط' : 'Net Ticket Revenue'}
                </span>
                <motion.span
                  variants={kpiIconVariants}
                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 inline-flex items-center justify-center"
                >
                  <Wallet className="w-4 h-4" />
                </motion.span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalRevenue, isFa ? 'Rial' : 'USD')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {formatNumber(confirmedTicketsCount, lang)}{' '}
                {isFa ? 'رزرو قطعی ثبت‌شده' : 'confirmed bookings'}
              </div>
            </motion.div>

            <motion.div
              variants={kpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs cursor-default"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'شاخص ایمنی سیر' : 'Dispatch Safety Index'}
                </span>
                <motion.span
                  variants={kpiIconVariants}
                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 inline-flex items-center justify-center"
                >
                  <ShieldCheck className="w-4 h-4" />
                </motion.span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {isFa ? '۱۰۰٪' : '100.0%'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isFa
                  ? 'صفر تداخل در رادار ضدبرخورد'
                  : 'Zero active track collisions'}
              </div>
            </motion.div>
          </motion.div>

          {/* 12-Month Ticket Sales Revenue AreaChart Section */}
          <motion.section
            id="ticket-sales-12m-area-section"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.12 }}
            className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs"
            style={{
              fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
            }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {isFa
                      ? 'نمودار مساحتی درآمد فروش بلیط در ۱۲ ماه گذشته'
                      : '12-Month Ticket Sales Revenue AreaChart'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isFa
                      ? `روند ۱۲ ماهه فروش ناخالص بلیط (${formatCurrency(annualRevenueSummary.annualGross, 'Rial')}) و درآمد خالص محقق‌شده (${formatCurrency(annualRevenueSummary.annualNet, 'Rial')})`
                      : `12-month gross ticket sales (${formatCurrency(annualRevenueSummary.annualGross, 'USD')}) and realized net revenue (${formatCurrency(annualRevenueSummary.annualNet, 'USD')})`}
                  </p>
                </div>
              </div>

              <motion.div
                variants={kpiGridVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
              >
                <motion.div
                  variants={kpiCardVariants}
                  whileHover="hover"
                  whileTap={{ scale: 0.985 }}
                  className="rp-card-hover px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 cursor-default"
                >
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {isFa ? 'مجموع درآمد خالص ۱۲ ماهه' : '12-Month Net Ticket Revenue'}
                  </span>
                  <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {formatCurrency(annualRevenueSummary.annualNet, isFa ? 'Rial' : 'USD')}
                  </span>
                </motion.div>

                <motion.div
                  variants={kpiCardVariants}
                  whileHover="hover"
                  whileTap={{ scale: 0.985 }}
                  className="rp-card-hover px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/20 cursor-default"
                >
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {isFa ? 'مجموع فروش ناخالص ۱۲ ماهه' : '12-Month Gross Ticket Sales'}
                  </span>
                  <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5 block">
                    {formatCurrency(annualRevenueSummary.annualGross, isFa ? 'Rial' : 'USD')}
                  </span>
                </motion.div>

                <motion.div
                  variants={kpiCardVariants}
                  whileHover="hover"
                  whileTap={{ scale: 0.985 }}
                  className="rp-card-hover px-3 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20 cursor-default"
                >
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {isFa ? 'میانگین درآمد ماهانه بلیط' : 'Avg Monthly Net Revenue'}
                  </span>
                  <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                    {formatCurrency(Math.round(annualRevenueSummary.annualNet / 12), isFa ? 'Rial' : 'USD')}
                  </span>
                </motion.div>

                <motion.div
                  variants={kpiCardVariants}
                  whileHover="hover"
                  whileTap={{ scale: 0.985 }}
                  className="rp-card-hover px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 cursor-default"
                >
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {isFa ? `رکورد ماهانه (${annualRevenueSummary.bestMonth.monthLabel})` : `Peak Month (${annualRevenueSummary.bestMonth.monthLabel})`}
                  </span>
                  <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
                    {formatCurrency(annualRevenueSummary.bestMonth.netRevenue, isFa ? 'Rial' : 'USD')}
                  </span>
                </motion.div>
              </motion.div>
            </div>

            <div
              className="h-80 w-full"
              dir="ltr"
              style={{
                fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyRevenueData}
                  margin={{ top: 10, right: 20, left: 15, bottom: 5 }}
                  style={{
                    fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                    fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                  }}
                >
                  <defs>
                    <linearGradient id="ticketGrossAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="ticketNetAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.42} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="ticketTargetAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.01} />
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
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                    }}
                    tick={{
                      fontSize: 11,
                      fill: '#64748B',
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                      style: {
                        fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                        fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                      },
                    }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(val: number) => formatCurrency(val, isFa ? 'Rial' : 'USD')}
                    style={{
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                    }}
                    tick={{
                      fontSize: 10,
                      fill: '#64748B',
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                      style: {
                        fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                        fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                      },
                    }}
                    tickLine={false}
                    axisLine={false}
                    width={isFa ? 125 : 90}
                  />
                  <Tooltip
                    wrapperStyle={{
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                    }}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#1E293B',
                      borderRadius: '0.75rem',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                      direction: isFa ? 'rtl' : 'ltr',
                      textAlign: isFa ? 'right' : 'left',
                    }}
                    labelStyle={{
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                      fontWeight: 700,
                      marginBottom: '4px',
                      color: '#E2E8F0',
                    }}
                    itemStyle={{
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                    }}
                    labelFormatter={(label) =>
                      isFa
                        ? `دوره ماهانه: ${toPersianDigits(String(label), lang)}`
                        : `Billing Month: ${label}`
                    }
                    formatter={(val: any, name: any) => {
                      const currencyUnit = isFa ? 'Rial' : 'USD';
                      const formattedVal = formatCurrency(Number(val ?? 0), currencyUnit);
                      if (name === 'grossRevenue') {
                        return [
                          formattedVal,
                          isFa ? 'فروش ناخالص بلیط' : 'Gross Ticket Sales',
                        ];
                      }
                      if (name === 'netRevenue') {
                        return [
                          formattedVal,
                          isFa ? 'درآمد خالص فروش بلیط' : 'Net Ticket Sales Revenue',
                        ];
                      }
                      if (name === 'targetBenchmark') {
                        return [
                          formattedVal,
                          isFa ? 'هدف بودجه مصوب' : 'Monthly Target Benchmark',
                        ];
                      }
                      return [formattedVal, String(name)];
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: '12px',
                      paddingTop: '12px',
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                    }}
                    formatter={(value: string) => {
                      const currencyUnit = isFa ? 'Rial' : 'USD';
                      if (value === 'grossRevenue') {
                        return isFa
                          ? `فروش ناخالص بلیط (${formatCurrency(annualRevenueSummary.annualGross, currencyUnit)})`
                          : `Gross Ticket Sales (${formatCurrency(annualRevenueSummary.annualGross, currencyUnit)})`;
                      }
                      if (value === 'netRevenue') {
                        return isFa
                          ? `درآمد خالص فروش بلیط (${formatCurrency(annualRevenueSummary.annualNet, currencyUnit)})`
                          : `Net Ticket Sales Revenue (${formatCurrency(annualRevenueSummary.annualNet, currencyUnit)})`;
                      }
                      return isFa ? 'هدف بودجه ماهانه' : 'Monthly Target Benchmark';
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
                  <Area
                    type="monotone"
                    dataKey="targetBenchmark"
                    stroke="#8B5CF6"
                    strokeWidth={1.75}
                    strokeDasharray="5 5"
                    fillOpacity={1}
                    fill="url(#ticketTargetAreaGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.section>

          {/* 12-Month Monthly Revenue Trend LineChart (Recharts) */}
          <motion.div
            variants={fadeSlideUpVariants}
            initial="hidden"
            animate="visible"
            className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs"
            style={{
              fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {isFa
                      ? 'روند خطی ۱۲ ماهه درآمد ماهانه شبکه ریلی (ریال)'
                      : '12-Month Monthly Railway Revenue Line Trend (USD)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isFa
                      ? 'مقایسه خطی درآمد خالص ماهانه، فروش ناخالص و هدف‌گذاری بودجه عملیاتی در ۱۲ ماه گذشته'
                      : 'Linear comparison of monthly net ticket revenue, gross sales, and operational target over the last 12 months'}
                  </p>
                </div>
              </div>

              <motion.div
                variants={kpiGridVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-3 gap-3 text-xs"
              >
                <motion.div
                  variants={kpiCardVariants}
                  whileHover="hover"
                  whileTap={{ scale: 0.985 }}
                  className="rp-card-hover px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 cursor-default"
                >
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isFa ? 'درآمد خالص سالانه (۱۲ ماه)' : '12-Month Net Revenue'}
                  </div>
                  <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(annualRevenueSummary.annualNet, isFa ? 'Rial' : 'USD')}
                  </div>
                </motion.div>
                <motion.div
                  variants={kpiCardVariants}
                  whileHover="hover"
                  whileTap={{ scale: 0.985 }}
                  className="rp-card-hover px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 cursor-default"
                >
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isFa ? 'فروش ناخالص سالانه' : '12-Month Gross Sales'}
                  </div>
                  <div className="font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                    {formatCurrency(annualRevenueSummary.annualGross, isFa ? 'Rial' : 'USD')}
                  </div>
                </motion.div>
                <motion.div
                  variants={kpiCardVariants}
                  whileHover="hover"
                  whileTap={{ scale: 0.985 }}
                  className="rp-card-hover px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 cursor-default"
                >
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isFa ? 'پرفروش‌ترین ماه سال' : 'Peak Monthly Performance'}
                  </div>
                  <div className="font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                    {annualRevenueSummary.bestMonth.monthLabel}
                  </div>
                </motion.div>
              </motion.div>
            </div>

            <div className="h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyRevenueData}
                  margin={{ top: 10, right: 20, left: 15, bottom: 5 }}
                  style={{
                    fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                    fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                  <XAxis
                    dataKey="monthLabel"
                    tickFormatter={(v) => toPersianDigits(String(v), lang)}
                    style={{
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                    }}
                    tick={{
                      fontSize: 11,
                      fill: '#94A3B8',
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                      style: {
                        fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                        fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                      },
                    }}
                    tickLine={false}
                    axisLine={{ stroke: '#475569', opacity: 0.4 }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatCurrency(v, isFa ? 'Rial' : 'USD')}
                    style={{
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                    }}
                    tick={{
                      fontSize: 10,
                      fill: '#94A3B8',
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                      style: {
                        fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                        fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                      },
                    }}
                    tickLine={false}
                    axisLine={false}
                    width={isFa ? 125 : 90}
                  />
                  <Tooltip
                    wrapperStyle={{
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                    }}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#1E293B',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#F8FAFC',
                      direction: isFa ? 'rtl' : 'ltr',
                      textAlign: isFa ? 'right' : 'left',
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                    }}
                    labelStyle={{
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                      fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
                      fontWeight: 700,
                      marginBottom: '4px',
                      color: '#E2E8F0',
                    }}
                    itemStyle={{
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
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
                      fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
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
          </motion.div>

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
          <motion.div
            variants={fadeSlideUpVariants}
            initial="hidden"
            animate="visible"
            className="rp-card-hover lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 h-fit shadow-xs"
          >
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
                      ? 'مرکز کنترل ترافیک و اعزام'
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

              <motion.button
                type="submit"
                {...BUTTON_HOVER_PROPS}
                className="rp-btn-primary w-full py-2.5 px-4 rounded-lg text-white font-semibold text-sm cursor-pointer"
              >
                {isFa
                  ? 'ایجاد حساب کارشناس عملیات'
                  : 'Provision Operations Specialist'}
              </motion.button>
            </form>
          </motion.div>

          {/* Right 8 Cols: Operations Staff Directory */}
          <motion.div
            variants={fadeSlideUpVariants}
            initial="hidden"
            animate="visible"
            className="rp-card-hover lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col shadow-xs"
          >
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
                          <motion.button
                            type="button"
                            onClick={() => {
                              setEditingStaff(emp);
                              setEditName(emp.name);
                              setEditLastname(emp.lastname);
                              setEditEmail(emp.email);
                              setEditDepartment(emp.department);
                              setEditStatus(emp.status);
                            }}
                            {...BUTTON_HOVER_PROPS}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                            title={isFa ? 'ویرایش مشخصات' : 'Edit Specialist'}
                          >
                            <Edit3 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={() => setDeletingStaff(emp)}
                            {...BUTTON_HOVER_PROPS}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 cursor-pointer"
                            title={isFa ? 'حذف کارشناس' : 'Revoke Access'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
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
          </motion.div>
        </div>
      )}

      {/* =====================================================================
          SECTION 3: ACTIVITY MONITOR & AUTOMATED AUDIT TRAIL
          ===================================================================== */}
      {activeSection === 'AUDIT' && (
        <div className="space-y-6 rp-animate-in">
          {/* 4 Activity Monitor KPI Summary Cards */}
          <motion.div
            variants={kpiGridVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <motion.div
              variants={kpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              onClick={() => setActivityCategoryFilter('ALL')}
              className={`rp-card-hover bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-xs cursor-pointer transition-colors ${
                activityCategoryFilter === 'ALL'
                  ? 'border-blue-500/60 dark:border-blue-500/60 ring-1 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'کل رخدادهای ثبت‌شده در پایشگر' : 'Total Monitored Events'}
                </span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {formatNumber(activityStats.total, lang)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isFa
                  ? 'ثبت خودکار و تغییرناپذیر کلیه تراکنش‌ها و عملیات'
                  : 'Immutable real-time log of all critical actions'}
              </div>
            </motion.div>

            <motion.div
              variants={kpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              onClick={() => setActivityCategoryFilter('RESERVATIONS')}
              className={`rp-card-hover bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-xs cursor-pointer transition-colors ${
                activityCategoryFilter === 'RESERVATIONS'
                  ? 'border-emerald-500/60 dark:border-emerald-500/60 ring-1 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'رزرو و استرداد بلیط مسافران' : 'Ticket Reservations & Refunds'}
                </span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Ticket className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatNumber(activityStats.reservations, lang)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isFa
                  ? 'صدور بلیط، تخصیص صندلی و استرداد وجه'
                  : 'Passenger seat bookings & PNR cancellations'}
              </div>
            </motion.div>

            <motion.div
              variants={kpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              onClick={() => setActivityCategoryFilter('SCHEDULES')}
              className={`rp-card-hover bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-xs cursor-pointer transition-colors ${
                activityCategoryFilter === 'SCHEDULES'
                  ? 'border-amber-500/60 dark:border-amber-500/60 ring-1 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'تغییرات زمانبندی و ناوگان' : 'Schedule & Fleet Modifications'}
                </span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Train className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {formatNumber(activityStats.schedules, lang)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isFa
                  ? 'اعزام قطار، ویرایش ساعت حرکت و خطوط ریلی'
                  : 'Timetable edits, dispatches & corridor updates'}
              </div>
            </motion.div>

            <motion.div
              variants={kpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              onClick={() => setActivityCategoryFilter('STAFF')}
              className={`rp-card-hover bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-xs cursor-pointer transition-colors ${
                activityCategoryFilter === 'STAFF'
                  ? 'border-purple-500/60 dark:border-purple-500/60 ring-1 ring-purple-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'مدیریت کارشناسان و حساب‌ها' : 'Staff & Account Governance'}
                </span>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                {formatNumber(activityStats.staff + activityStats.financial, lang)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isFa
                  ? 'ایجاد/ویرایش کارشناسان و تراکنش‌های کیف پول'
                  : 'Staff provisioning, role updates & wallet ledger'}
              </div>
            </motion.div>
          </motion.div>

          {/* Live Action Simulator & Snapshot Controls Toolbar */}
          <motion.div
            variants={fadeSlideUpVariants}
            initial="hidden"
            animate="visible"
            className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {isFa
                    ? 'شبیه‌ساز زنده رخدادهای حیاتی و مدیریت نسخه‌های پشتیبان'
                    : 'Live Critical Event Simulator & State Snapshots'}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isFa
                  ? 'ثبت آزمایشی رزرو بلیط یا تغییر جدول زمانبندی قطار و دریافت خروجی گزارش ممیزی و پشتیبان سامانه'
                  : 'Trigger test reservation or schedule modification audit events, or export the audit ledger to CSV/JSON'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <motion.button
                type="button"
                onClick={handleSimulateReservationActivity}
                {...BUTTON_HOVER_PROPS}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>
                  {isFa ? 'ثبت آزمایشی رزرو بلیط' : 'Simulate Ticket Reservation'}
                </span>
              </motion.button>

              <motion.button
                type="button"
                onClick={handleSimulateScheduleModificationActivity}
                {...BUTTON_HOVER_PROPS}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <Train className="w-3.5 h-3.5" />
                <span>
                  {isFa ? 'ثبت آزمایشی تغییر زمانبندی' : 'Simulate Schedule Modification'}
                </span>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => handleExportAuditCsv('ALL')}
                {...BUTTON_HOVER_PROPS}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-xs font-semibold text-blue-700 dark:text-blue-300 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>
                  {isFa
                    ? 'صدور گزارش ممیزی انطباق'
                    : 'Export Compliance CSV'}
                </span>
              </motion.button>

              <motion.button
                type="button"
                onClick={handleExportSnapshot}
                {...BUTTON_HOVER_PROPS}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isFa ? 'دانلود پشتیبان سامانه' : 'Export JSON Snapshot'}</span>
              </motion.button>

              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{isFa ? 'بارگذاری پشتیبان' : 'Import JSON'}</span>
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleImportSnapshot}
                  className="hidden"
                />
              </label>

              <motion.button
                type="button"
                onClick={() => {
                  const fresh = resetToDefaultSeedDatabase();
                  onUpdateDb(fresh);
                }}
                {...BUTTON_HOVER_PROPS}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-medium text-amber-700 dark:text-amber-300 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isFa ? 'بازنشانی پایه' : 'Reset Seed'}</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Compliance CSV Export Confirmation Banner */}
          {complianceExportNotice && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{complianceExportNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setComplianceExportNotice(null)}
                className="p-1 text-emerald-600 dark:text-emerald-400 hover:opacity-80 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Activity Monitor Filter Bar & Real-Time Event Feed */}
          <motion.div
            variants={fadeSlideUpVariants}
            initial="hidden"
            animate="visible"
            className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4"
          >
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">
                    {isFa
                      ? `جریان زنده پایشگر فعالیت‌ها (${formatNumber(filteredAuditLogs.length, lang)} از ${formatNumber(activityStats.total, lang)} رخداد)`
                      : `Real-Time Activity Monitor Stream (${filteredAuditLogs.length} of ${activityStats.total} Events)`}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {isFa
                    ? 'جستجوی کلیدواژه، فیلتر بازه زمانی، نقش کاربری و دسته‌بندی عملیات ممیزی'
                    : 'Filter audit log entries by keyword, custom date range, actor role, and compliance category'}
                </p>
              </div>

              {/* Search, Actor Role Filter & Filtered CSV Export */}
              <motion.div
                variants={filterToolbarVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0"
              >
                <motion.div
                  variants={filterControlEntranceVariants}
                  whileHover={{ scale: 1.01 }}
                  transition={SOFT_SPRING_TRANSITION}
                  className="relative"
                >
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                  <input
                    type="text"
                    role="searchbox"
                    data-testid="activity-search-input"
                    aria-label={
                      isFa
                        ? 'جستجوی کلیدواژه در لاگ ممیزی'
                        : 'Search audit logs by keyword'
                    }
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    placeholder={
                      isFa
                        ? 'جستجوی کلیدواژه، کاربر، قطار...'
                        : 'Search keyword, actor, train, PNR...'
                    }
                    className="ps-8 pe-7 h-8 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 w-48 sm:w-52 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <AnimatePresence>
                    {activitySearchQuery && (
                      <motion.button
                        key="activity-search-clear"
                        type="button"
                        data-testid="activity-search-clear"
                        initial={{ opacity: 0, scale: 0.75 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.75 }}
                        transition={SOFT_SPRING_TRANSITION}
                        onClick={() => setActivitySearchQuery('')}
                        aria-label={isFa ? 'پاک کردن جستجو' : 'Clear search keyword'}
                        className="absolute top-1/2 -translate-y-1/2 end-2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  variants={filterControlEntranceVariants}
                  whileHover={{ scale: 1.01 }}
                  transition={SOFT_SPRING_TRANSITION}
                  className="flex items-center gap-1.5 shrink-0"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    data-testid="activity-role-filter"
                    value={activityRoleFilter}
                    onChange={(e) =>
                      setActivityRoleFilter(
                        e.target.value as 'ALL' | 'admin' | 'staff' | 'passenger' | 'system'
                      )
                    }
                    aria-label={isFa ? 'فیلتر نقش کاربر' : 'Filter by actor role'}
                    className="px-2.5 h-8 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                  >
                    <option value="ALL">
                      {isFa ? 'همه نقش‌ها' : 'All Actor Roles'}
                    </option>
                    <option value="passenger">
                      {isFa ? 'مسافران' : 'Passengers'}
                    </option>
                    <option value="staff">
                      {isFa ? 'کارشناسان عملیات ریلی' : 'Operations Staff'}
                    </option>
                    <option value="admin">
                      {isFa ? 'مدیر کل سازمان' : 'System Admin'}
                    </option>
                    <option value="system">
                      {isFa ? 'هسته سامانه' : 'System Core'}
                    </option>
                  </select>
                </motion.div>

                <motion.button
                  variants={filterControlEntranceVariants}
                  {...BUTTON_HOVER_PROPS}
                  type="button"
                  data-testid="activity-export-csv-btn"
                  onClick={() =>
                    handleExportAuditCsv(
                      selectedExportLogs.length > 0 ? 'SELECTED' : 'FILTERED'
                    )
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    selectedExportLogs.length > 0
                      ? 'border-blue-600 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                  title={
                    selectedExportLogs.length > 0
                      ? isFa
                        ? 'دریافت خروجی جدول از رخدادهای انتخاب‌شده برای گزارش انطباق'
                        : 'Export selected audit log entries to CSV for compliance reporting'
                      : isFa
                      ? 'دریافت خروجی جدول از رخدادهای فیلترشده فعلی برای گزارش انطباق'
                      : 'Export currently filtered audit logs to CSV for compliance reporting'
                  }
                >
                  <Download
                    className={`w-3.5 h-3.5 ${
                      selectedExportLogs.length > 0
                        ? 'text-white'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  />
                  <span>
                    {selectedExportLogs.length > 0
                      ? isFa
                        ? `خروجی انتخاب‌شده (${formatNumber(selectedExportLogs.length, 'fa')})`
                        : `Export Selected CSV (${selectedExportLogs.length})`
                      : isFa
                      ? `خروجی جدول (${formatNumber(filteredAuditLogs.length, 'fa')})`
                      : `Export CSV (${filteredAuditLogs.length})`}
                  </span>
                </motion.button>
              </motion.div>
            </div>

            {/* Date-Range Picker & Quick Time-Window Toolbar */}
            <motion.div
              data-testid="activity-date-range-picker"
              variants={filterToolbarVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80"
            >
              {/* Date Range Inputs (Start Date & End Date) */}
              <motion.div
                variants={filterControlEntranceVariants}
                className="flex flex-wrap items-center gap-2.5"
              >
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{isFa ? 'بازه زمانی ممیزی:' : 'Audit Time Window:'}</span>
                </div>

                <motion.label
                  variants={filterControlEntranceVariants}
                  whileHover={{ scale: 1.01 }}
                  transition={SOFT_SPRING_TRANSITION}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"
                >
                  <span className="font-medium">{isFa ? 'از تاریخ:' : 'From:'}</span>
                  <input
                    type="date"
                    dir="ltr"
                    data-testid="activity-start-date"
                    aria-label={isFa ? 'از تاریخ' : 'Start Date'}
                    value={activityStartDate}
                    max={activityEndDate || undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setActivityStartDate(val);
                      setActivityTimePreset(val || activityEndDate ? 'CUSTOM' : 'ALL');
                    }}
                    className="px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </motion.label>

                <motion.label
                  variants={filterControlEntranceVariants}
                  whileHover={{ scale: 1.01 }}
                  transition={SOFT_SPRING_TRANSITION}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"
                >
                  <span className="font-medium">{isFa ? 'تا تاریخ:' : 'To:'}</span>
                  <input
                    type="date"
                    dir="ltr"
                    data-testid="activity-end-date"
                    aria-label={isFa ? 'تا تاریخ' : 'End Date'}
                    value={activityEndDate}
                    min={activityStartDate || undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setActivityEndDate(val);
                      setActivityTimePreset(val || activityStartDate ? 'CUSTOM' : 'ALL');
                    }}
                    className="px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </motion.label>
              </motion.div>

              {/* Quick Time-Window Presets & Reset Button */}
              <motion.div
                variants={filterControlEntranceVariants}
                className="flex flex-wrap items-center gap-1.5"
              >
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 me-1">
                  <Clock className="w-3 h-3" />
                  <span>{isFa ? 'پنجره سریع:' : 'Quick Window:'}</span>
                </span>
                {(
                  [
                    { id: 'ALL', labelFa: 'همه زمان‌ها', labelEn: 'All Time' },
                    { id: '24H', labelFa: '۲۴ ساعت اخیر', labelEn: 'Last 24h' },
                    { id: '7D', labelFa: '۷ روز اخیر', labelEn: 'Last 7 Days' },
                    { id: '30D', labelFa: '۳۰ روز اخیر', labelEn: 'Last 30 Days' },
                  ] as const
                ).map((preset) => {
                  const isActive =
                    activityTimePreset === preset.id &&
                    !activityStartDate &&
                    !activityEndDate;
                  return (
                    <motion.button
                      key={preset.id}
                      variants={filterControlEntranceVariants}
                      {...BUTTON_HOVER_PROPS}
                      type="button"
                      data-testid={`activity-preset-${preset.id.toLowerCase()}`}
                      onClick={() => {
                        setActivityStartDate('');
                        setActivityEndDate('');
                        setActivityTimePreset(preset.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {isFa ? preset.labelFa : preset.labelEn}
                    </motion.button>
                  );
                })}

                <AnimatePresence>
                  {hasActiveAuditFilters && (
                    <motion.button
                      key="activity-reset-filters"
                      type="button"
                      data-testid="activity-reset-filters"
                      initial={{ opacity: 0, scale: 0.9, x: 6 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: 6 }}
                      {...BUTTON_HOVER_PROPS}
                      onClick={handleResetActivityFilters}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-[11px] font-semibold transition-colors cursor-pointer ms-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{isFa ? 'پاکسازی فیلترها' : 'Reset Filters'}</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  {
                    id: 'ALL',
                    labelFa: 'همه فعالیت‌ها',
                    labelEn: 'All Activities',
                    count: activityStats.total,
                  },
                  {
                    id: 'RESERVATIONS',
                    labelFa: 'رزرو و استرداد بلیط',
                    labelEn: 'Ticket Reservations',
                    count: activityStats.reservations,
                  },
                  {
                    id: 'SCHEDULES',
                    labelFa: 'تغییرات زمانبندی و خطوط',
                    labelEn: 'Schedule Modifications',
                    count: activityStats.schedules,
                  },
                  {
                    id: 'STAFF',
                    labelFa: 'مدیریت کارشناسان',
                    labelEn: 'Staff Governance',
                    count: activityStats.staff,
                  },
                  {
                    id: 'FINANCIAL',
                    labelFa: 'تراکنش‌های کیف پول',
                    labelEn: 'Wallet & Financial',
                    count: activityStats.financial,
                  },
                ] as const
              ).map((tab) => {
                const active = activityCategoryFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActivityCategoryFilter(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{isFa ? tab.labelFa : tab.labelEn}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {formatNumber(tab.count, lang)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bulk Selection Action Bar */}
            <AnimatePresence>
              {selectedExportLogs.length > 0 && (
                <motion.div
                  key="activity-bulk-selection-bar"
                  data-testid="activity-bulk-selection-bar"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={SOFT_SPRING_TRANSITION}
                  className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/30 text-xs"
                >
                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-semibold">
                    <CheckCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span data-testid="activity-selected-count-label">
                      {isFa
                        ? `${formatNumber(selectedExportLogs.length, 'fa')} رخداد ممیزی برای صدور گروهی گزارش انتخاب شده است`
                        : `${selectedExportLogs.length} audit log ${
                            selectedExportLogs.length === 1 ? 'entry' : 'entries'
                          } selected for bulk CSV export`}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <motion.button
                      type="button"
                      data-testid="activity-export-selected-csv"
                      onClick={() => handleExportAuditCsv('SELECTED')}
                      {...BUTTON_HOVER_PROPS}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>
                        {isFa
                          ? `صدور گزارش موارد انتخاب‌شده (${formatNumber(selectedExportLogs.length, 'fa')})`
                          : `Export Selected to CSV (${selectedExportLogs.length})`}
                      </span>
                    </motion.button>

                    <motion.button
                      type="button"
                      data-testid="activity-clear-selection"
                      onClick={handleClearAuditSelection}
                      {...BUTTON_HOVER_PROPS}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{isFa ? 'لغو انتخاب' : 'Clear Selection'}</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Audit Logs Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        ref={selectAllCheckboxRef}
                        type="checkbox"
                        data-testid="activity-select-all-checkbox"
                        checked={auditBulkSelection.isAllVisibleSelected}
                        aria-checked={
                          auditBulkSelection.isIndeterminate
                            ? 'mixed'
                            : auditBulkSelection.isAllVisibleSelected
                        }
                        disabled={visibleAuditLogs.length === 0}
                        onChange={handleToggleSelectAllAuditLogs}
                        aria-label={
                          isFa
                            ? 'انتخاب همه رخدادهای جدول ممیزی برای خروجی گزارش'
                            : 'Select all audit log entries for CSV export'
                        }
                        title={
                          isFa
                            ? 'انتخاب یا لغو انتخاب همه رخدادهای نمایش‌داده‌شده'
                            : 'Select or deselect all displayed audit log entries'
                        }
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 disabled:opacity-40 disabled:cursor-not-allowed align-middle"
                      />
                    </th>
                    <th className="py-2.5 px-3 text-start">
                      {isFa ? 'زمان ثبت' : 'Timestamp'}
                    </th>
                    <th className="py-2.5 px-3 text-start">
                      {isFa ? 'کاربر عامل' : 'Actor'}
                    </th>
                    <th className="py-2.5 px-3 text-start">
                      {isFa ? 'دسته‌بندی و نوع عملیات' : 'Category & Action'}
                    </th>
                    <th className="py-2.5 px-3 text-start">
                      {isFa ? 'شرح کامل فعالیت' : 'Activity Description'}
                    </th>
                    <th className="py-2.5 px-3 text-end">
                      {isFa ? 'جزئیات' : 'Inspect'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {visibleAuditLogs.map((log) => {
                    const cat = classifyAuditCategory(log.action);
                    const isRowSelected = selectedAuditLogIds.includes(log.id);
                    const badgeStyle =
                      cat === 'RESERVATIONS'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                        : cat === 'SCHEDULES'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                        : cat === 'STAFF'
                        ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                        : cat === 'FINANCIAL'
                        ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20'
                        : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';

                    return (
                      <tr
                        key={log.id}
                        className={`transition-colors ${
                          isRowSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            data-testid={`activity-row-checkbox-${log.id}`}
                            checked={isRowSelected}
                            onChange={() => handleToggleSingleAuditLog(log.id)}
                            aria-label={
                              isFa
                                ? `انتخاب رخداد ممیزی ${log.id}`
                                : `Select audit log entry ${log.id}`
                            }
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 align-middle"
                          />
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                          {formatDateTime(log.timestamp, lang, 'full')}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            dir="ltr"
                            className="font-mono font-semibold text-slate-800 dark:text-slate-200"
                          >
                            @{log.actorUsername}
                          </span>{' '}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {localizeRole(log.actorRole, lang)}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${badgeStyle}`}
                          >
                            {cat === 'RESERVATIONS' && <Ticket className="w-3 h-3" />}
                            {cat === 'SCHEDULES' && <Train className="w-3 h-3" />}
                            {cat === 'STAFF' && <Users className="w-3 h-3" />}
                            {cat === 'FINANCIAL' && <Wallet className="w-3 h-3" />}
                            {cat === 'SYSTEM' && <ShieldCheck className="w-3 h-3" />}
                            <span>
                              {isFa
                                ? localizeAuditAction(log.action, 'fa')
                                : localizeAuditAction(log.action, 'en').replace(/_/g, ' ')}
                            </span>
                          </span>
                          {log.entityId && (
                            <span
                              dir="ltr"
                              className="ms-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              {toPersianDigits(log.entityId, lang)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 leading-relaxed">
                          {isFa ? toPersianDigits(log.detailsFa, 'fa') : log.detailsEn}
                        </td>
                        <td className="py-3 px-3 text-end whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setInspectingLog(log)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                          >
                            {isFa ? 'مشاهده' : 'Inspect'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredAuditLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-slate-400 text-xs"
                      >
                        {isFa
                          ? 'هیچ رخدادی مطابق با فیلترهای انتخاب‌شده یافت نشد.'
                          : 'No activity log entries match the selected filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Audit Event Inspector Modal */}
          {inspectingLog && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label={isFa ? 'جزئیات رخداد ممیزی' : 'Audit Event Inspector'}
              onClick={() => setInspectingLog(null)}
              className="rp-modal-backdrop fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
            >
              <div
                ref={inspectLogModalRef}
                onClick={(e) => e.stopPropagation()}
                className="rp-modal-content bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {isFa ? 'بازرسی شناسنامه رخداد ممیزی' : 'Activity Event Inspector'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectingLog(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-400 mb-1">
                      {isFa ? 'شناسه یکتای رخداد' : 'Event ID'}
                    </div>
                    <div dir="ltr" className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {toPersianDigits(inspectingLog.id, lang)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-400 mb-1">
                      {isFa ? 'زمان دقیق ثبت' : 'Timestamp'}
                    </div>
                    <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {formatDateTime(inspectingLog.timestamp, lang, 'full')}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-400 mb-1">
                      {isFa ? 'کاربر عامل و سطح دسترسی' : 'Actor & Role'}
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      <span dir="ltr" className="font-mono">
                        @{inspectingLog.actorUsername}
                      </span>{' '}
                      ({localizeRole(inspectingLog.actorRole, lang)})
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-400 mb-1">
                      {isFa ? 'نوع عملیات' : 'Operation Code'}
                    </div>
                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                      {isFa
                        ? localizeAuditAction(inspectingLog.action, 'fa')
                        : localizeAuditAction(inspectingLog.action, 'en').replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    {isFa ? 'شرح کامل رخداد (فارسی / انگلیسی):' : 'Bilingual Audit Record:'}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {toPersianDigits(inspectingLog.detailsFa, 'fa')}
                  </p>
                  <p
                    dir="ltr"
                    className="text-slate-500 dark:text-slate-400 font-mono text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800"
                  >
                    {inspectingLog.detailsEn}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(JSON.stringify(inspectingLog, null, 2));
                      setCopiedLogId(inspectingLog.id);
                      setTimeout(() => setCopiedLogId(null), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>
                      {copiedLogId === inspectingLog.id
                        ? isFa
                          ? 'کپی شد!'
                          : 'Copied JSON!'
                        : isFa
                        ? 'کپی ساختار داده'
                        : 'Copy Raw JSON'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectingLog(null)}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    {isFa ? 'بستن' : 'Close'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SECTION 1.5: REAL-TIME EXECUTIVE ALERT CENTER & RADAR STREAM
          ===================================================================== */}
      {activeSection === 'ALERT_CENTER' && (
        <div className="space-y-6 rp-animate-in">
          {/* 4 Alert Center KPI Summary Cards */}
          <motion.div
            variants={kpiGridVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <motion.div
              variants={kpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs cursor-default"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'هشدارهای خوانده‌نشده آنی' : 'Unread Real-Time Alerts'}
                </span>
                <motion.span
                  variants={kpiIconVariants}
                  className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 inline-flex items-center justify-center"
                >
                  <BellRing className="w-4 h-4" />
                </motion.span>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {formatNumber(unreadAlertsCount, lang)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isFa
                  ? `از مجموع ${formatNumber(alerts.length, lang)} اعلان ثبت‌شده در مرکز`
                  : `Out of ${alerts.length} total pushed notifications`}
              </div>
            </motion.div>

            <motion.div
              variants={kpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs cursor-default"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'اعلان‌های رزرو کلان (درآمد بالا)' : 'High-Revenue Booking Alerts'}
                </span>
                <motion.span
                  variants={kpiIconVariants}
                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 inline-flex items-center justify-center"
                >
                  <Wallet className="w-4 h-4" />
                </motion.span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatNumber(
                  alerts.filter((a) => a.category === 'HIGH_REVENUE_BOOKING').length,
                  lang
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isFa
                  ? `آستانه پایش: ${formatCurrency(HIGH_REVENUE_THRESHOLD_RIAL, 'Rial')}`
                  : `Threshold: ${formatCurrency(HIGH_REVENUE_THRESHOLD_RIAL, 'USD')}`}
              </div>
            </motion.div>

            <motion.div
              variants={kpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs cursor-default"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'تداخل‌های مسدودشده رادار ایمنی' : 'Safety Radar Conflicts Blocked'}
                </span>
                <motion.span
                  variants={kpiIconVariants}
                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 inline-flex items-center justify-center"
                >
                  <Radar className="w-4 h-4" />
                </motion.span>
              </div>
              <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                {formatNumber(
                  alerts.filter((a) => a.category === 'SAFETY_RADAR_CONFLICT').length,
                  lang
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isFa
                  ? 'پایش همپوشانی سکو و سرفاصله ۵ دقیقه‌ای'
                  : 'Platform overlap & 5m headway guard'}
              </div>
            </motion.div>

            <motion.div
              variants={kpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs cursor-default"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">
                  {isFa ? 'وضعیت استریم تله‌متری آنی' : 'Live Telemetry Stream'}
                </span>
                <motion.span
                  variants={kpiIconVariants}
                  className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 inline-flex items-center justify-center"
                >
                  <Radio className="w-4 h-4" />
                </motion.span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {autoStreamActive
                    ? isFa
                      ? 'ارسال خودکار فعال (۹ ثانیه)'
                      : 'Auto-Stream Active (9s)'
                    : isFa
                    ? 'گوش‌به‌زنگ رویدادهای زنده'
                    : 'Listening for Live Events'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isFa
                  ? 'متصل به موتور رزرو بلیط و رادار اعزام'
                  : 'Bound to Booking Engine & Collision Radar'}
              </div>
            </motion.div>
          </motion.div>

          {/* Real-Time Push Control & Filter Bar */}
          <motion.div
            variants={fadeSlideUpVariants}
            initial="hidden"
            animate="visible"
            className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span>
                    {isFa
                      ? 'کنسول مدیریت و شبیه‌سازی اعلان‌های بلادرنگ'
                      : 'Real-Time Push Notification Dispatch & Filter Console'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isFa
                    ? 'هرگونه خرید بلیط با درآمد بالا یا تداخل در رادار ایمنی به‌صورت خودکار در سایدبار و این پنل اعلان می‌شود.'
                    : 'Every high-revenue ticket purchase or collision radar conflict automatically pushes a live notification to the sidebar and this console.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <motion.button
                  type="button"
                  onClick={() => simulateHighRevenueBookingPush(db)}
                  {...BUTTON_HOVER_PROPS}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>
                    {isFa
                      ? 'ارسال اعلان آنی رزرو کلان'
                      : 'Push High-Revenue Booking Alert'}
                  </span>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => simulateSafetyRadarConflictPush(db)}
                  {...BUTTON_HOVER_PROPS}
                  className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Radar className="w-3.5 h-3.5" />
                  <span>
                    {isFa
                      ? 'ارسال هشدار آنی تداخل رادار ایمنی'
                      : 'Push Safety Radar Conflict Alert'}
                  </span>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => setAutoStreamActive((prev) => !prev)}
                  {...BUTTON_HOVER_PROPS}
                  className={`px-3.5 py-2 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    autoStreamActive
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>
                    {autoStreamActive
                      ? isFa
                        ? 'توقف استریم خودکار'
                        : 'Stop Auto-Stream'
                      : isFa
                      ? 'فعال‌سازی استریم خودکار'
                      : 'Start Live Auto-Stream'}
                  </span>
                </motion.button>

                {unreadAlertsCount > 0 && (
                  <motion.button
                    type="button"
                    onClick={() => markAllExecutiveAlertsRead()}
                    {...BUTTON_HOVER_PROPS}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>
                      {isFa ? 'خواندن همه اعلان‌ها' : 'Mark All Read'}
                    </span>
                  </motion.button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <motion.button
                type="button"
                onClick={() => setWorkspaceAlertFilter('ALL')}
                {...BUTTON_HOVER_PROPS}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  workspaceAlertFilter === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {isFa ? 'همه هشدارها' : 'All Notifications'} (
                {formatNumber(alerts.length, lang)})
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setWorkspaceAlertFilter('HIGH_REVENUE_BOOKING')}
                {...BUTTON_HOVER_PROPS}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  workspaceAlertFilter === 'HIGH_REVENUE_BOOKING'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {isFa ? 'رزروهای کلان و ویژه' : 'High-Revenue Bookings'} (
                {formatNumber(
                  alerts.filter((a) => a.category === 'HIGH_REVENUE_BOOKING').length,
                  lang
                )}
                )
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setWorkspaceAlertFilter('SAFETY_RADAR_CONFLICT')}
                {...BUTTON_HOVER_PROPS}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  workspaceAlertFilter === 'SAFETY_RADAR_CONFLICT'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {isFa ? 'تداخل‌های رادار ایمنی' : 'Safety Radar Conflicts'} (
                {formatNumber(
                  alerts.filter((a) => a.category === 'SAFETY_RADAR_CONFLICT').length,
                  lang
                )}
                )
              </motion.button>
            </div>

            {/* Alert Cards Stream */}
            <div className="space-y-3 pt-2">
              <AnimatePresence initial={false}>
                {filteredWorkspaceAlerts.map((alert) => {
                  const isRadar = alert.category === 'SAFETY_RADAR_CONFLICT';
                  return (
                    <motion.div
                      key={alert.id}
                      layout
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      whileHover={{ scale: 1.05, y: -4 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                      className={`rp-card-hover rounded-xl p-4 border transition-all ${
                        isRadar
                          ? alert.read
                            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            : 'bg-rose-500/5 border-rose-500/40'
                          : alert.read
                          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          : 'bg-emerald-500/5 border-emerald-500/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={`p-2.5 rounded-xl shrink-0 ${
                              isRadar
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isRadar ? (
                              <Radar className="w-5 h-5" />
                            ) : (
                              <Wallet className="w-5 h-5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  isRadar
                                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {isRadar
                                  ? isFa
                                    ? 'هشدار رادار ضدبرخورد'
                                    : 'SAFETY RADAR CONFLICT'
                                  : isFa
                                  ? 'رزرو با درآمد بالا'
                                  : 'HIGH-REVENUE BOOKING'}
                              </span>
                              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {isFa ? alert.titleFa : alert.titleEn}
                              </h3>
                              {!alert.read && (
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-600 text-white">
                                  {isFa ? 'جدید' : 'NEW'}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                              {isFa
                                ? toPersianDigits(alert.messageFa, 'fa')
                                : alert.messageEn}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                              {alert.amountIrr && (
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                  {formatCurrency(alert.amountIrr, isFa ? 'Rial' : 'USD')}
                                </span>
                              )}
                              {alert.pnr && (
                                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  {isFa ? 'کد رزرو:' : 'PNR:'} {toPersianDigits(alert.pnr, lang)}
                                </span>
                              )}
                              {alert.trainId && (
                                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  {isFa ? 'قطار:' : 'Train:'} {toPersianDigits(alert.trainId, lang)}
                                </span>
                              )}
                              {alert.lineName && (
                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  {localizeText(alert.lineName, lang)}
                                </span>
                              )}
                              {alert.overlapWindow && (
                                <span className="font-mono text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                                  {isFa ? 'بازه تداخل:' : 'Overlap:'}{' '}
                                  {formatTime(alert.overlapWindow, lang)}
                                </span>
                              )}
                              {alert.suggestedSafeDeparture && (
                                <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                  {isFa ? 'پیشنهاد اعزام ایمن:' : 'Safe Slot:'}{' '}
                                  {formatTime(alert.suggestedSafeDeparture, lang)}
                                </span>
                              )}
                              <span className="font-mono">
                                {formatDateTime(alert.timestamp, lang, 'full')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!alert.read && (
                            <motion.button
                              type="button"
                              onClick={() => markExecutiveAlertRead(alert.id)}
                              {...BUTTON_HOVER_PROPS}
                              className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold cursor-pointer"
                            >
                              {isFa ? 'خوانده شد' : 'Mark Read'}
                            </motion.button>
                          )}
                          <motion.button
                            type="button"
                            onClick={() => dismissExecutiveAlert(alert.id)}
                            {...BUTTON_HOVER_PROPS}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title={isFa ? 'حذف اعلان' : 'Dismiss Alert'}
                          >
                            <X className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}

      {/* =====================================================================
          SECTION 4: 5-PHASE AUTOMATED QA SUITE
          ===================================================================== */}
      {activeSection === 'QA_SUITE' && <QATestSuitePanel lang={lang} />}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div
          onClick={() => setEditingStaff(null)}
          className="rp-modal-backdrop fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            ref={editStaffModalRef}
            onClick={(e) => e.stopPropagation()}
            className="rp-modal-content bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl"
          >
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
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="Dispatch & Traffic Control">
                      {isFa
                        ? 'مرکز کنترل ترافیک و اعزام'
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
        <div
          onClick={() => setDeletingStaff(null)}
          className="rp-modal-backdrop fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            ref={deleteStaffModalRef}
            onClick={(e) => e.stopPropagation()}
            className="rp-modal-content bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
              {isFa
                ? 'تأیید لغو دسترسی و حذف کارشناس'
                : 'Confirm Specialist Removal'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
              {isFa
                ? `آیا از حذف حساب کاربری کارشناس «${localizeText(deletingStaff.name, 'fa')} ${localizeText(deletingStaff.lastname, 'fa')}» (@${deletingStaff.username}) اطمینان دارید؟`
                : `Are you sure you want to revoke access and remove "${localizeText(deletingStaff.name, 'en')} ${localizeText(deletingStaff.lastname, 'en')}" (@${deletingStaff.username})?`}
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
