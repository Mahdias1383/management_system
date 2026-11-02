import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import { Employee, Language, PlatformDatabaseV2 } from '../types/domain';
import {
  evaluatePasswordStrength,
  hashPassword,
  isValidEmail,
  normalizeIdentifier,
} from '../services/authService';
import { deepClone, resetToDefaultSeedDatabase } from '../services/storageAndMigration';
import { RevenueAnalysis } from './RevenueAnalysis';

interface AdminPortalProps {
  db: PlatformDatabaseV2;
  onUpdateDb: (nextDb: PlatformDatabaseV2) => void;
  lang: Language;
  notify: (msgEn: string, msgFa: string, type?: 'success' | 'error') => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ db, onUpdateDb, lang, notify }) => {
  const isFa = lang === 'fa';

  // Add Employee Form State
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('High-Speed Dispatch & Signalling');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit / Delete Modal State
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState('');
  const [editLastname, setEditLastname] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editStatus, setEditStatus] = useState<Employee['status']>('Active');
  const [editPassword, setEditPassword] = useState('');

  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);

  const pwStrength = evaluatePasswordStrength(password);

  // Executive KPI calculations pulled from database transaction history & active tickets
  const totalRevenue = db.transactions
    .filter((tx) => tx.type === 'TICKET_PURCHASE' || tx.type === 'TICKET_REFUND')
    .reduce((sum, tx) => (tx.type === 'TICKET_PURCHASE' ? sum + tx.amount : sum - tx.amount), 0);

  const totalSeatsBooked = db.tickets
    .filter((t) => t.status === 'Confirmed')
    .reduce((sum, t) => sum + t.ticketCount, 0);

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const trimName = name.trim();
    const trimLastname = lastname.trim();
    const trimUser = username.trim();
    const trimEmail = email.trim();

    if (!trimName || !trimLastname || !trimUser || !trimEmail || !password) {
      notify(
        'All employee fields are required and cannot be empty.',
        'تمامی فیلدهای اطلاعات کارمند الزامی است و نمی‌تواند خالی باشد.',
        'error'
      );
      return;
    }

    if (!isValidEmail(trimEmail)) {
      notify(
        'Please enter a valid RFC-compliant email address (e.g. name@railpulse.ir).',
        'لطفاً یک آدرس ایمیل معتبر وارد کنید (مثال: name@railpulse.ir).',
        'error'
      );
      return;
    }

    const normUser = normalizeIdentifier(trimUser);
    const normEmail = normalizeIdentifier(trimEmail);

    if (
      db.employees.some((emp) => normalizeIdentifier(emp.username) === normUser) ||
      normalizeIdentifier(db.admin.username) === normUser
    ) {
      notify(
        'Username is already taken! Please enter a different username.',
        'این نام کاربری قبلاً ثبت شده است! لطفاً نام کاربری دیگری انتخاب کنید.',
        'error'
      );
      return;
    }

    if (db.employees.some((emp) => normalizeIdentifier(emp.email) === normEmail)) {
      notify(
        'Email address is already registered to another employee!',
        'این آدرس ایمیل قبلاً برای کارمند دیگری ثبت شده است!',
        'error'
      );
      return;
    }

    const nextDb = deepClone(db);
    const newEmp: Employee = {
      id: `emp_${Date.now()}`,
      name: trimName,
      lastname: trimLastname,
      username: trimUser,
      email: trimEmail.toLowerCase(),
      passwordHash: hashPassword(password),
      department,
      status: 'Active',
      createdAt: new Date().toISOString(),
      linesCreated: 0,
      trainsScheduled: 0,
    };

    nextDb.employees.unshift(newEmp);
    nextDb.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      timestamp: newEmp.createdAt,
      actorRole: 'admin',
      actorUsername: db.admin.username,
      action: 'EMPLOYEE_ADDED',
      detailsEn: `Added railway operations employee "${newEmp.username}" (${newEmp.email}).`,
      detailsFa: `کارمند عملیات ریلی با نام کاربری «${newEmp.username}» (${newEmp.email}) اضافه شد.`,
    });

    onUpdateDb(nextDb);
    setName('');
    setLastname('');
    setUsername('');
    setEmail('');
    setPassword('');
    notify(
      `Employee "${newEmp.username}" added to Railway Operations Staff.`,
      `کارمند «${newEmp.username}» با موفقیت به سیستم اضافه شد.`
    );
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditName(emp.name);
    setEditLastname(emp.lastname);
    setEditEmail(emp.email);
    setEditDepartment(emp.department);
    setEditStatus(emp.status);
    setEditPassword('');
  };

  const handleSaveEditEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    if (!editName.trim() || !editLastname.trim() || !editEmail.trim()) {
      notify('Name, Last Name, and Email cannot be empty.', 'نام، نام خانوادگی و ایمیل نمی‌توانند خالی باشند.', 'error');
      return;
    }
    if (!isValidEmail(editEmail)) {
      notify('Invalid email format.', 'فرمت ایمیل وارد شده معتبر نیست.', 'error');
      return;
    }

    const normEmail = normalizeIdentifier(editEmail);
    if (
      db.employees.some(
        (emp) => emp.id !== editingEmployee.id && normalizeIdentifier(emp.email) === normEmail
      )
    ) {
      notify('Email is already used by another employee.', 'این ایمیل متعلق به کارمند دیگری است.', 'error');
      return;
    }

    const nextDb = deepClone(db);
    const idx = nextDb.employees.findIndex((item) => item.id === editingEmployee.id);
    if (idx !== -1) {
      nextDb.employees[idx].name = editName.trim();
      nextDb.employees[idx].lastname = editLastname.trim();
      nextDb.employees[idx].email = editEmail.trim().toLowerCase();
      nextDb.employees[idx].department = editDepartment;
      nextDb.employees[idx].status = editStatus;
      if (editPassword.trim()) {
        nextDb.employees[idx].passwordHash = hashPassword(editPassword.trim());
      }
      nextDb.auditLogs.unshift({
        id: `aud_${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorRole: 'admin',
        actorUsername: db.admin.username,
        action: 'EMPLOYEE_UPDATED',
        detailsEn: `Updated employee record for "${editingEmployee.username}".`,
        detailsFa: `اطلاعات کارمند «${editingEmployee.username}» بروزرسانی شد.`,
      });
      onUpdateDb(nextDb);
      setEditingEmployee(null);
      notify(
        `Updated employee "${editingEmployee.username}".`,
        `اطلاعات کارمند «${editingEmployee.username}» با موفقیت ویرایش شد.`
      );
    }
  };

  const handleConfirmDeleteEmployee = () => {
    if (!deletingEmployee) return;
    const nextDb = deepClone(db);
    nextDb.employees = nextDb.employees.filter((e) => e.id !== deletingEmployee.id);
    nextDb.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorRole: 'admin',
      actorUsername: db.admin.username,
      action: 'EMPLOYEE_REMOVED',
      detailsEn: `Removed employee "${deletingEmployee.username}" from system.`,
      detailsFa: `کارمند «${deletingEmployee.username}» از سامانه حذف شد.`,
    });
    onUpdateDb(nextDb);
    notify(
      `Employee "${deletingEmployee.username}" has been deleted.`,
      `حساب کارمند «${deletingEmployee.username}» با موفقیت حذف شد.`
    );
    setDeletingEmployee(null);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `railpulse_enterprise_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Exported platform JSON snapshot.', 'فایل پشتیبان JSON سامانه با موفقیت دانلود شد.');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed && Array.isArray(parsed.lines) && Array.isArray(parsed.trains)) {
          onUpdateDb(parsed);
          notify('Platform database restored from JSON.', 'بانک اطلاعاتی با موفقیت از فایل JSON بازیابی شد.');
        } else {
          notify('Invalid JSON schema file.', 'ساختار فایل JSON انتخاب شده معتبر نیست.', 'error');
        }
      } catch {
        notify('Failed to parse JSON file.', 'خطا در خواندن فایل JSON.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleResetSeed = () => {
    const fresh = resetToDefaultSeedDatabase();
    onUpdateDb(fresh);
    notify(
      'Database reset to default v2 enterprise seed data.',
      'داده‌های سامانه به حالت پیش‌فرض اولیه بازنشانی شد.'
    );
  };

  const filteredEmployees = db.employees.filter((emp) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.lastname.toLowerCase().includes(q) ||
      emp.username.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* Executive KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isFa ? 'خطوط ریلی فعال' : 'Active Railway Lines'}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {db.lines.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isFa ? 'پوشش کریدورهای سراسری' : 'National corridor topology'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isFa ? 'قطارهای در حال سیر' : 'Operating Trains'}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {db.trains.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isFa ? `${totalSeatsBooked} صندلی رزرو شده` : `${totalSeatsBooked} seats reserved`}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isFa ? 'مهندسان و کارمندان ریلی' : 'Operations Staff'}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {db.employees.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isFa ? 'احراز هویت نقش‌محور (RBAC)' : 'RBAC authenticated staff'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isFa ? 'مسافران ثبت‌نام شده' : 'Registered Passengers'}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {db.passengers.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isFa ? `${db.tickets.length} بلیط صادر شده` : `${db.tickets.length} tickets issued`}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isFa ? 'مجموع درآمد فروش بلیط' : 'Total Platform Revenue'}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            ${totalRevenue.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isFa ? 'تراکنش‌های اتمیک کیف پول' : 'Atomic ledger verified'}
          </div>
        </div>
      </div>

      {/* 30-Day Ticket Sales Revenue Analysis Chart (Recharts - from db.transactions) */}
      <RevenueAnalysis
        transactions={db.transactions}
        tickets={db.tickets}
        lines={db.lines}
        lang={lang}
      />

      {/* Main 2-Column Admin Grid: Add Employee + Employee Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Add Employee Form */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {isFa ? 'افزودن کارمند عملیات ریلی (add_employee)' : 'Add Operations Employee (add_employee)'}
            </h3>
          </div>

          <form onSubmit={handleAddEmployee} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'نام (name)' : 'First Name (name)'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isFa ? 'مثال: کامران' : 'e.g. Kamran'}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'نام خانوادگی (lastname)' : 'Last Name (lastname)'}
                </label>
                <input
                  type="text"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  placeholder={isFa ? 'مثال: نادری' : 'e.g. Naderi'}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isFa ? 'نام کاربری یکتا (username)' : 'Unique Username (username)'}
              </label>
              <input
                type="text"
                dir="ltr"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="kamran_ops"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isFa ? 'پست الکترونیک سازمانی (email)' : 'Corporate Email (email)'}
              </label>
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamran.naderi@railpulse.ir"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isFa ? 'دپارتمان تخصصی' : 'Operations Department'}
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="High-Speed Dispatch & Signalling">
                  {isFa ? 'مرکز کنترل و سیگنالینگ قطارهای سریع‌السیر' : 'High-Speed Dispatch & Signalling'}
                </option>
                <option value="Corridor Topology & Safety">
                  {isFa ? 'مهندسی خطوط و ایمنی سیر و حرکت' : 'Corridor Topology & Safety'}
                </option>
                <option value="Fleet Scheduling & Rolling Stock">
                  {isFa ? 'زمانبندی ناوگان و مدیریت واگن‌ها' : 'Fleet Scheduling & Rolling Stock'}
                </option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isFa ? 'رمز عبور (password)' : 'Password (password)'}
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isFa ? `امنیت: ${pwStrength.labelFa}` : `Strength: ${pwStrength.labelEn}`}
                </span>
              </div>
              <input
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-4 gap-1 mt-1.5">
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={`h-1 rounded-full transition-colors ${
                      pwStrength.score >= bar
                        ? pwStrength.score >= 3
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
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isFa ? 'ثبت کارمند در سامانه' : 'Register Operations Employee'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Employee Directory Table */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {isFa
                    ? 'فهرست کارمندان عملیات ریلی (employees_information)'
                    : 'Railway Operations Staff Directory (employees_information)'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isFa
                    ? 'جستجو، ویرایش اطلاعات دسترسی و حذف ایمن کارمندان با تاییدیه'
                    : 'Search, update credentials, and remove staff records with confirmation'}
                </p>
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isFa ? 'جستجوی نام، نام کاربری، ایمیل...' : 'Search name, username, email...'}
                className="w-full ps-9 pe-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3 text-start">{isFa ? 'نام و نام خانوادگی' : 'Full Name'}</th>
                  <th className="py-2.5 px-3 text-start">{isFa ? 'نام کاربری' : 'Username'}</th>
                  <th className="py-2.5 px-3 text-start">{isFa ? 'ایمیل سازمانی' : 'Email'}</th>
                  <th className="py-2.5 px-3 text-start">{isFa ? 'دپارتمان و وضعیت' : 'Department & Status'}</th>
                  <th className="py-2.5 px-3 text-end">{isFa ? 'عملیات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-xs">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                      {isFa ? 'هیچ کارمندی با این مشخصات یافت نشد.' : 'No employees matching filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {emp.name} {emp.lastname}
                      </td>
                      <td className="py-3 px-3 font-mono text-blue-600 dark:text-blue-400">{emp.username}</td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">{emp.email}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        <span>{emp.department}</span>
                        <span className="mx-1.5">·</span>
                        <span
                          className={
                            emp.status === 'On-Duty' || emp.status === 'Active'
                              ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                              : 'text-amber-600 dark:text-amber-400 font-medium'
                          }
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-end">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(emp)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={isFa ? 'ویرایش کارمند' : 'Edit Employee'}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingEmployee(emp)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title={isFa ? 'حذف کارمند' : 'Remove Employee'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* System Audit Log & Data Backup/Reset Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {isFa
                ? 'لاگ ممیزی رویدادهای سیستم و مدیریت داده (Audit Log & Snapshot Controls)'
                : 'System Audit Log & Enterprise Data Management'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isFa
                ? 'ردیابی تمام تراکنش‌ها، تغییرات خطوط و مدیریت پشتیبان‌گیری نسخه ۲'
                : 'Complete immutable trace of administrative, dispatch, and financial events'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isFa ? 'خروجی JSON' : 'Export JSON'}</span>
            </button>

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{isFa ? 'ورود JSON' : 'Import JSON'}</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>

            <button
              type="button"
              onClick={handleResetSeed}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isFa ? 'بازنشانی به داده پیش‌فرض' : 'Reset to Seed Data'}</span>
            </button>
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
          {db.auditLogs.slice(0, 20).map((log) => (
            <div key={log.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {log.action}
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600 dark:text-slate-300">
                  {isFa ? log.detailsFa : log.detailsEn}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                {log.actorUsername} · {new Date(log.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 shadow-xl">
            <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
              {isFa
                ? `ویرایش اطلاعات کارمند: ${editingEmployee.username}`
                : `Edit Employee: ${editingEmployee.username}`}
            </h4>
            <form onSubmit={handleSaveEditEmployee} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{isFa ? 'نام' : 'First Name'}</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{isFa ? 'نام خانوادگی' : 'Last Name'}</label>
                  <input
                    type="text"
                    value={editLastname}
                    onChange={(e) => setEditLastname(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{isFa ? 'ایمیل' : 'Email'}</label>
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
                  <label className="block text-xs text-slate-500 mb-1">{isFa ? 'وضعیت' : 'Status'}</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Employee['status'])}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="Active">Active</option>
                    <option value="On-Duty">On-Duty</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    {isFa ? 'رمز عبور جدید (اختیاری)' : 'New Password (optional)'}
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder={isFa ? 'بدون تغییر' : 'Keep current'}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {isFa ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                >
                  {isFa ? 'ذخیره تغییرات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 shadow-xl">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-3">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-semibold">
                {isFa ? 'تایید حذف کارمند (remove_employee)' : 'Confirm Employee Deletion (remove_employee)'}
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              {isFa
                ? `آیا از حذف حساب کاربری کارمند «${deletingEmployee.username}» (${deletingEmployee.name} ${deletingEmployee.lastname}) اطمینان دارید؟`
                : `Are you sure you want to permanently remove employee "${deletingEmployee.username}" (${deletingEmployee.name} ${deletingEmployee.lastname})?`}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingEmployee(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {isFa ? 'انصراف (خیر)' : 'Cancel (No)'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEmployee}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                {isFa ? 'بله، حذف شود' : 'Yes, Delete Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
