import React, { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CreditCard,
  Eye,
  MapPin,
  QrCode,
  RotateCcw,
  Search,
  Ticket,
  Train,
  UserCheck,
  Wallet,
} from 'lucide-react';
import {
  Language,
  PassengerUser,
  PlatformDatabaseV2,
  TicketRecord,
  TrainSchedule,
} from '../types/domain';
import {
  formatRial,
  hashPassword,
  isValidEmail,
  normalizeIdentifier,
} from '../services/authService';
import {
  depositToWallet,
  purchaseTrainTicket,
  refundTrainTicket,
  withdrawFromWallet,
} from '../services/bookingEngine';
import { computeTrainStationTimings } from '../services/collisionEngine';
import { deepClone } from '../services/storageAndMigration';
import { SeatMapSelector } from '../components/SeatMapSelector';
import { DigitalBoardingPassModal } from '../components/DigitalBoardingPassModal';

interface PassengerDashboardProps {
  db: PlatformDatabaseV2;
  onUpdateDb: (nextDb: PlatformDatabaseV2) => void;
  currentUser: PassengerUser;
  initialTab?: 'BOOKING' | 'TICKETS' | 'WALLET' | 'PROFILE';
  preselectedTrain?: TrainSchedule | null;
  onClearPreselectedTrain?: () => void;
  onUpdateSessionUsername: (newUsername: string, newDisplayName: string, newEmail: string) => void;
  lang: Language;
  notify: (msgEn: string, msgFa: string, type?: 'success' | 'error') => void;
}

export const PassengerDashboard: React.FC<PassengerDashboardProps> = ({
  db,
  onUpdateDb,
  currentUser,
  initialTab = 'BOOKING',
  preselectedTrain = null,
  onClearPreselectedTrain,
  onUpdateSessionUsername,
  lang,
  notify,
}) => {
  const isFa = lang === 'fa';
  const [activeTab, setActiveTab] = useState<'BOOKING' | 'TICKETS' | 'WALLET' | 'PROFILE'>(
    initialTab
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // --- SEARCH & FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLineFilter, setSelectedLineFilter] = useState('ALL');
  const [selectedQualityFilter, setSelectedQualityFilter] = useState('ALL');
  const [minSeatsFilter, setMinSeatsFilter] = useState(1);

  // --- SEAT MAP BOOKING MODAL STATE ---
  const [selectedTrain, setSelectedTrain] = useState<TrainSchedule | null>(preselectedTrain);
  const [lowBalanceShortfall, setLowBalanceShortfall] = useState<number | null>(null);
  const [viewingTicketModal, setViewingTicketModal] = useState<TicketRecord | null>(null);

  useEffect(() => {
    if (preselectedTrain) {
      setSelectedTrain(preselectedTrain);
      setActiveTab('BOOKING');
    }
  }, [preselectedTrain]);

  // --- WALLET STATE ---
  const [depositAmount, setDepositAmount] = useState('10000000');
  const [withdrawAmount, setWithdrawAmount] = useState('5000000');

  // --- PROFILE STATE (Strictly scoped to currentUser.id) ---
  const [profName, setProfName] = useState(currentUser.name);
  const [profEmail, setProfEmail] = useState(currentUser.email);
  const [profUsername, setProfUsername] = useState(currentUser.username);
  const [profPassword, setProfPassword] = useState('');

  useEffect(() => {
    setProfName(currentUser.name);
    setProfEmail(currentUser.email);
    setProfUsername(currentUser.username);
  }, [currentUser.id, currentUser.name, currentUser.email, currentUser.username]);

  const filteredTrains = db.trains.filter((t) => {
    if (
      selectedLineFilter !== 'ALL' &&
      normalizeIdentifier(t.name_line) !== normalizeIdentifier(selectedLineFilter)
    ) {
      return false;
    }
    if (selectedQualityFilter !== 'ALL' && t.quality !== selectedQualityFilter) {
      return false;
    }
    if (t.capacity < minSeatsFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const line = db.lines.find(
        (l) => normalizeIdentifier(l.name_line) === normalizeIdentifier(t.name_line)
      );
      const hay = `${t.id_train} ${t.name_train} ${t.name_line} ${line?.origin || ''} ${
        line?.destination || ''
      }`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const userTickets = db.tickets.filter((t) => t.userId === currentUser.id);
  const userTransactions = db.transactions.filter((tx) => tx.userId === currentUser.id);

  const handleConfirmSeatPurchase = (
    ticketCount: number,
    selectedSeats: string[],
    coachNumber: number
  ) => {
    if (!selectedTrain) return;
    setLowBalanceShortfall(null);

    const res = purchaseTrainTicket(
      db,
      currentUser.id,
      selectedTrain.id_train,
      ticketCount,
      selectedSeats,
      coachNumber
    );
    if (!res.success) {
      if (res.lowBalanceRedirect && res.requiredShortfall) {
        setLowBalanceShortfall(res.requiredShortfall);
      }
      notify(res.errorEn || 'Booking failed', res.errorFa || 'خطا در رزرو بلیط', 'error');
      return;
    }

    onUpdateDb(res.db);
    setSelectedTrain(null);
    if (onClearPreselectedTrain) onClearPreselectedTrain();
    setActiveTab('TICKETS');
    if (res.ticket) {
      setViewingTicketModal(res.ticket);
    }
    notify(
      `Ticket booked! PNR: ${res.ticket?.pnr}`,
      `رزرو بلیط با موفقیت انجام شد! کد رهگیری: ${res.ticket?.pnr}`
    );
  };

  const handleDeposit = (amountVal: unknown) => {
    const res = depositToWallet(db, currentUser.id, amountVal);
    if (!res.success) {
      notify(res.errorEn || 'Invalid deposit', res.errorFa || 'مبلغ وارد شده معتبر نیست', 'error');
      return;
    }
    onUpdateDb(res.db);
    setLowBalanceShortfall(null);
    notify(
      `Wallet credited! New balance: ${formatRial(res.newBalance || 0, 'en')}`,
      `کیف پول شما شارژ شد! موجودی جدید: ${formatRial(res.newBalance || 0, 'fa')}`
    );
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const res = withdrawFromWallet(db, currentUser.id, withdrawAmount);
    if (!res.success) {
      notify(res.errorEn || 'Withdrawal failed', res.errorFa || 'خطا در برداشت وجه', 'error');
      return;
    }
    onUpdateDb(res.db);
    notify(
      `Withdrawal complete! Remaining balance: ${formatRial(res.newBalance || 0, 'en')}`,
      `برداشت وجه انجام شد! موجودی باقیمانده: ${formatRial(res.newBalance || 0, 'fa')}`
    );
  };

  const handleRefundTicket = (ticketId: string) => {
    const res = refundTrainTicket(db, currentUser.id, ticketId);
    if (!res.success) {
      notify(res.errorEn || 'Refund failed', res.errorFa || 'خطا در استرداد بلیط', 'error');
      return;
    }
    onUpdateDb(res.db);
    notify(
      `Ticket ${res.ticket?.pnr} refunded to your wallet (${formatRial(res.ticket?.totalPrice || 0, 'en')}).`,
      `بلیط ${res.ticket?.pnr} لغو و مبلغ ${formatRial(res.ticket?.totalPrice || 0, 'fa')} به کیف پول شما بازگردانده شد.`
    );
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimName = profName.trim();
    const trimEmail = profEmail.trim();
    const trimUsername = profUsername.trim();

    if (!trimName || !trimEmail || !trimUsername) {
      notify(
        'Name, Email, and Username cannot be empty.',
        'نام، ایمیل و نام کاربری نمی‌توانند خالی باشند.',
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

    const normEmail = normalizeIdentifier(trimEmail);
    const normUser = normalizeIdentifier(trimUsername);

    if (
      db.passengers.some(
        (u) => u.id !== currentUser.id && normalizeIdentifier(u.email) === normEmail
      )
    ) {
      notify(
        'This email is already taken by another user!',
        'این ایمیل قبلاً توسط کاربر دیگری ثبت شده است!',
        'error'
      );
      return;
    }

    if (
      db.passengers.some(
        (u) => u.id !== currentUser.id && normalizeIdentifier(u.username) === normUser
      ) ||
      db.employees.some((emp) => normalizeIdentifier(emp.username) === normUser) ||
      normalizeIdentifier(db.admin.username) === normUser
    ) {
      notify(
        'This username is already taken!',
        'این نام کاربری قبلاً انتخاب شده است!',
        'error'
      );
      return;
    }

    const nextDb = deepClone(db);
    const idx = nextDb.passengers.findIndex((u) => u.id === currentUser.id);
    if (idx !== -1) {
      nextDb.passengers[idx].name = trimName;
      nextDb.passengers[idx].email = trimEmail.toLowerCase();
      nextDb.passengers[idx].username = trimUsername;
      if (profPassword.trim()) {
        nextDb.passengers[idx].passwordHash = hashPassword(profPassword.trim());
      }

      nextDb.tickets.forEach((t) => {
        if (t.userId === currentUser.id) {
          t.passengerName = trimName;
          t.passengerUsername = trimUsername;
        }
      });
      nextDb.transactions.forEach((tx) => {
        if (tx.userId === currentUser.id) {
          tx.username = trimUsername;
        }
      });

      nextDb.auditLogs.unshift({
        id: `aud_${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorRole: 'passenger',
        actorUsername: trimUsername,
        action: 'PROFILE_UPDATED',
        detailsEn: `Passenger updated own profile (${currentUser.id}).`,
        detailsFa: `مسافر اطلاعات پروفایل حساب خود را بروزرسانی کرد.`,
      });

      onUpdateDb(nextDb);
      onUpdateSessionUsername(trimUsername, trimName, trimEmail.toLowerCase());
      setProfPassword('');
      notify(
        'Your profile has been updated!',
        'اطلاعات حساب کاربری شما با موفقیت بروزرسانی شد!'
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Passenger Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('BOOKING')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'BOOKING'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {isFa ? 'جستجو و رزرو آنلاین بلیط' : 'Search & Book Tickets'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TICKETS')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'TICKETS'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {isFa
              ? `بلیط‌های من و کارت سوارشدن (${userTickets.length})`
              : `My Tickets & Boarding Passes (${userTickets.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('WALLET')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'WALLET'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {isFa ? 'کیف پول دیجیتال و تراکنش‌ها' : 'Digital Wallet & Ledger'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PROFILE')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {isFa ? 'تنظیمات حساب کاربری' : 'Account Profile'}
          </button>
        </div>

        {/* Active Passenger Balance Indicator */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isFa ? 'موجودی کیف پول شما:' : 'Available Balance:'}
          </div>
          <div className="font-mono text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
            {formatRial(currentUser.balance, lang)}
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('WALLET')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 cursor-pointer"
          >
            + {isFa ? 'افزایش اعتبار' : 'Top Up'}
          </button>
        </div>
      </div>

      {/* TAB 1: SMART TRAIN SEARCH & TICKET BOOKING */}
      {activeTab === 'BOOKING' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isFa ? 'جستجوی شهر، قطار یا شماره سرویس...' : 'Search station or train...'}
                className="w-full ps-9 pe-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>

            <select
              value={selectedLineFilter}
              onChange={(e) => setSelectedLineFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            >
              <option value="ALL">{isFa ? 'همه خطوط ریلی' : 'All Railway Corridors'}</option>
              {db.lines.map((l) => (
                <option key={l.id} value={l.name_line}>
                  {l.name_line}
                </option>
              ))}
            </select>

            <select
              value={selectedQualityFilter}
              onChange={(e) => setSelectedQualityFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            >
              <option value="ALL">{isFa ? 'همه کلاس‌های سالن' : 'All Travel Classes'}</option>
              <option value="VIP 5-Star">{isFa ? '۵ ستاره ویژه (VIP)' : 'VIP 5-Star'}</option>
              <option value="Business 4-Star">{isFa ? '۴ ستاره تجاری' : 'Business 4-Star'}</option>
              <option value="Economy 3-Star">{isFa ? '۳ ستاره اقتصادی' : 'Economy 3-Star'}</option>
            </select>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {isFa ? 'حداقل صندلی خالی:' : 'Min Seats:'}
              </span>
              <input
                type="number"
                min={1}
                max={50}
                value={minSeatsFilter}
                onChange={(e) => setMinSeatsFilter(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTrains.map((train) => {
              const line = db.lines.find(
                (l) => normalizeIdentifier(l.name_line) === normalizeIdentifier(train.name_line)
              );
              const timings = line ? computeTrainStationTimings(train, line) : [];
              const destArrival =
                timings.length > 0 ? timings[timings.length - 1].arrivalFormatted : '--:--';
              const capPercent = Math.round(
                (train.capacity / Math.max(1, train.totalCapacity)) * 100
              );

              return (
                <div
                  key={train.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-blue-500/50 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                            {train.id_train}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            {train.quality}
                          </span>
                        </div>
                        <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">
                          {train.name_train}
                        </h4>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {train.name_line}
                        </div>
                      </div>

                      <div className="text-end">
                        <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {formatRial(train.cost_ticket, lang)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {isFa ? 'بهای هر صندلی' : 'per passenger'}
                        </div>
                      </div>
                    </div>

                    {line && (
                      <div className="my-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-blue-500" />
                              {line.origin}
                            </div>
                            <div className="font-mono text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {train.departureTime}
                            </div>
                          </div>
                          <div className="text-center px-2">
                            <div className="text-[11px] font-mono text-slate-400">
                              {train.speed} km/h · {line.num_state} {isFa ? 'توقف' : 'stops'}
                            </div>
                            <div className="w-24 h-0.5 bg-slate-300 dark:bg-slate-700 my-1 mx-auto" />
                          </div>
                          <div className="text-end">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {line.destination}
                            </div>
                            <div className="font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                              {destArrival}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500">
                        {isFa ? 'ظرفیت صندلی باقیمانده:' : 'Remaining Seat Capacity:'}
                      </span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {train.capacity} / {train.totalCapacity} ({capPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${Math.min(100, capPercent)}%` }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTrain(train);
                        setLowBalanceShortfall(null);
                      }}
                      className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {isFa ? 'انتخاب صندلی از نقشه واگن و رزرو' : 'Select Coach Seats & Book'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MY TICKETS & QR BOARDING PASS */}
      {activeTab === 'TICKETS' && (
        <div className="space-y-4">
          {userTickets.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
              <Ticket className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {isFa ? 'هنوز بلیطی خریداری نکرده‌اید' : 'No Tickets Purchased Yet'}
              </div>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                {isFa
                  ? 'از بخش جستجو و رزرو بلیط، قطار و صندلی مورد نظر خود را انتخاب کنید.'
                  : 'Browse available trains to book your first digital boarding pass.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('BOOKING')}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer"
              >
                {isFa ? 'مشاهده سرویس‌های قطار' : 'Browse Trains'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userTickets.map((tkt) => (
                <div
                  key={tkt.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
                      <div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {isFa ? 'کد رهگیری (PNR)' : 'PNR REFERENCE'}
                        </span>
                        <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
                          {tkt.pnr}
                        </div>
                      </div>
                      <div className="text-end">
                        <span
                          className={`text-xs font-semibold ${
                            tkt.status === 'Confirmed'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-500'
                          }`}
                        >
                          {tkt.status === 'Confirmed'
                            ? isFa
                              ? 'قطعی و تایید شده'
                              : 'Confirmed'
                            : isFa
                            ? 'لغو و مسترد شده'
                            : 'Refunded'}
                        </span>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {new Date(tkt.purchasedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isFa ? 'قطار:' : 'Train:'}</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {tkt.id_train} — {tkt.name_train}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isFa ? 'مسیر سفر:' : 'Route:'}</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {tkt.origin} → {tkt.destination}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isFa ? 'ساعت حرکت:' : 'Departure:'}</span>
                        <span className="font-mono font-semibold">{tkt.departureTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isFa ? 'واگن و صندلی‌ها:' : 'Coach & Seats:'}</span>
                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {isFa ? `واگن ${tkt.coachNumber || 1}` : `Coach ${tkt.coachNumber || 1}`} ·{' '}
                          {(tkt.seatNumbers || ['1A']).join(', ')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isFa ? 'مبلغ کل:' : 'Total Paid:'}</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatRial(tkt.totalPrice, lang)}
                        </span>
                      </div>
                    </div>

                    {/* Digital QR Payload Visual */}
                    <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                        <QrCode className="w-10 h-10 text-slate-900 dark:text-slate-100" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-[10px] font-semibold text-slate-500">
                          {isFa ? 'بارکد دیجیتال کارت سوارشدن' : 'DIGITAL BOARDING PASS QR'}
                        </div>
                        <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 truncate mt-0.5" dir="ltr">
                          {tkt.qrPayload}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingTicketModal(tkt)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isFa ? 'کارت سوارشدن' : 'Boarding Pass'}</span>
                    </button>

                    {tkt.status === 'Confirmed' && (
                      <button
                        type="button"
                        onClick={() => handleRefundTicket(tkt.id)}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isFa ? 'لغو و استرداد وجه' : 'Cancel & Refund'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DIGITAL WALLET & FINANCIAL LEDGER */}
      {activeTab === 'WALLET' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <span className="text-xs font-mono tracking-wider text-slate-300">
                    RAILPULSE PASSENGER WALLET
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-400">ACTIVE</span>
              </div>
              <div className="text-xs text-slate-400">
                {isFa ? 'موجودی قابل خرید بلیط و برداشت آنی' : 'Available Balance'}
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums mt-1">
                {formatRial(currentUser.balance, lang)}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-6 pt-4 border-t border-slate-800 font-mono">
                <span>{currentUser.name}</span>
                <span>@{currentUser.username}</span>
              </div>
            </div>

            {/* Increase Balance */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isFa ? 'افزایش اعتبار کیف پول (ریال)' : 'Top Up Wallet Balance (IRR)'}
                </h4>
              </div>

              <div className="flex items-center gap-2 mb-3">
                {[5000000, 10000000, 25000000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleDeposit(preset)}
                    className="flex-1 py-1.5 px-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-[11px] font-mono font-semibold cursor-pointer"
                  >
                    +{formatRial(preset, lang)}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  dir="ltr"
                  min={10000}
                  step="10000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
                <button
                  type="button"
                  onClick={() => handleDeposit(depositAmount)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  {isFa ? 'افزایش موجودی' : 'Deposit'}
                </button>
              </div>
            </div>

            {/* Withdraw Balance */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpRight className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isFa ? 'برداشت وجه و انتقال به حساب بانکی (ریال)' : 'Withdraw Funds (IRR)'}
                </h4>
              </div>
              <form onSubmit={handleWithdraw} className="flex gap-2">
                <input
                  type="number"
                  dir="ltr"
                  min={10000}
                  step="10000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                >
                  {isFa ? 'ثبت برداشت' : 'Withdraw'}
                </button>
              </form>
            </div>
          </div>

          {/* Immutable Transaction Ledger */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {isFa ? 'صورتحساب و گردش مالی کیف پول شما' : 'Personal Wallet Transaction History'}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-3 text-start">{isFa ? 'شرح تراکنش' : 'Description'}</th>
                    <th className="py-2.5 px-3 text-end">{isFa ? 'مبلغ' : 'Amount'}</th>
                    <th className="py-2.5 px-3 text-end">{isFa ? 'مانده حساب' : 'Running Balance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-xs">
                  {userTransactions.map((tx) => {
                    const isCredit = tx.type === 'DEPOSIT' || tx.type === 'TICKET_REFUND';
                    return (
                      <tr key={tx.id}>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {isFa ? tx.descriptionFa : tx.descriptionEn}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {new Date(tx.timestamp).toLocaleString()}
                          </div>
                        </td>
                        <td
                          className={`py-3 px-3 text-end font-mono font-semibold ${
                            isCredit
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {isCredit ? '+' : '-'}{formatRial(tx.amount, lang)}
                        </td>
                        <td className="py-3 px-3 text-end font-mono text-slate-700 dark:text-slate-300">
                          {formatRial(tx.runningBalance, lang)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUTHENTICATED PROFILE MANAGEMENT */}
      {activeTab === 'PROFILE' && (
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-2">
            <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {isFa ? 'تنظیمات و مشخصات حساب کاربری مسافر' : 'Personal Account Profile Settings'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            {isFa
              ? 'اطلاعات حساب کاربری شما به صورت اختصاصی و ایمن مدیریت می‌شود.'
              : 'Update your personal traveler details and account security credentials.'}
          </p>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isFa ? 'نام و نام خانوادگی' : 'Full Name'}
              </label>
              <input
                type="text"
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isFa ? 'نام کاربری یکتا' : 'Username'}
              </label>
              <input
                type="text"
                dir="ltr"
                value={profUsername}
                onChange={(e) => setProfUsername(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isFa ? 'آدرس پست الکترونیک' : 'Email Address'}
              </label>
              <input
                type="email"
                dir="ltr"
                value={profEmail}
                onChange={(e) => setProfEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isFa ? 'رمز عبور جدید (اختیاری)' : 'New Password (optional)'}
              </label>
              <input
                type="password"
                dir="ltr"
                value={profPassword}
                onChange={(e) => setProfPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {isFa ? 'ذخیره تغییرات حساب کاربری' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Interactive Coach Seat Map Selector Modal */}
      {selectedTrain && (
        <SeatMapSelector
          train={selectedTrain}
          timings={(() => {
            const line = db.lines.find(
              (l) => normalizeIdentifier(l.name_line) === normalizeIdentifier(selectedTrain.name_line)
            );
            return line ? computeTrainStationTimings(selectedTrain, line) : [];
          })()}
          passengerBalance={currentUser.balance}
          occupiedSeats={db.tickets
            .filter(
              (t) =>
                t.status === 'Confirmed' &&
                normalizeIdentifier(t.id_train) === normalizeIdentifier(selectedTrain.id_train)
            )
            .flatMap((t) => t.seatNumbers || [])}
          lang={lang}
          lowBalanceShortfall={lowBalanceShortfall}
          onQuickDeposit={(amt) => handleDeposit(amt)}
          onConfirmPurchase={handleConfirmSeatPurchase}
          onClose={() => {
            setSelectedTrain(null);
            if (onClearPreselectedTrain) onClearPreselectedTrain();
          }}
        />
      )}

      {/* Perforated Digital Boarding Pass Modal */}
      {viewingTicketModal && (
        <DigitalBoardingPassModal
          ticket={viewingTicketModal}
          lang={lang}
          onClose={() => setViewingTicketModal(null)}
        />
      )}
    </div>
  );
};
