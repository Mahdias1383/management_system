import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
  formatNumber,
  formatCurrency,
  formatDateTime,
  formatTime,
  hashPassword,
  isValidEmail,
  localizeQuality,
  localizeText,
  normalizeCurrencyInputToIrr,
  normalizeIdentifier,
  toDisplayCurrencyInput,
  toPersianDigits,
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
import {
  BUTTON_HOVER_PROPS,
  fadeSlideUpVariants,
  interactiveCardVariants,
  staggerGridVariants,
} from '../components/ui/motionPrimitives';

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
  const [depositAmount, setDepositAmount] = useState(() =>
    toDisplayCurrencyInput(10_000_000, lang)
  );
  const [withdrawAmount, setWithdrawAmount] = useState(() =>
    toDisplayCurrencyInput(5_000_000, lang)
  );

  useEffect(() => {
    setDepositAmount(toDisplayCurrencyInput(10_000_000, lang));
    setWithdrawAmount(toDisplayCurrencyInput(5_000_000, lang));
  }, [lang]);

  // --- PROFILE STATE (Strictly scoped to currentUser.id) ---
  const [profName, setProfName] = useState(() => localizeText(currentUser.name, lang));
  const [profEmail, setProfEmail] = useState(currentUser.email);
  const [profUsername, setProfUsername] = useState(currentUser.username);
  const [profPassword, setProfPassword] = useState('');

  useEffect(() => {
    setProfName(localizeText(currentUser.name, lang));
    setProfEmail(currentUser.email);
    setProfUsername(currentUser.username);
  }, [currentUser.id, currentUser.name, currentUser.email, currentUser.username, lang]);

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

  const handleDeposit = (amountVal: unknown, isBaseIrrPreset = false) => {
    const normalizedAmount = isBaseIrrPreset
      ? amountVal
      : normalizeCurrencyInputToIrr(amountVal, lang);
    const res = depositToWallet(db, currentUser.id, normalizedAmount);
    if (!res.success) {
      notify(res.errorEn || 'Invalid deposit', res.errorFa || 'مبلغ وارد شده معتبر نیست', 'error');
      return;
    }
    onUpdateDb(res.db);
    setLowBalanceShortfall(null);
    notify(
      `Wallet credited! New balance: ${formatCurrency(res.newBalance || 0, 'USD')}`,
      `کیف پول شما شارژ شد! موجودی جدید: ${formatCurrency(res.newBalance || 0, 'Rial')}`
    );
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedWithdraw = normalizeCurrencyInputToIrr(withdrawAmount, lang);
    const res = withdrawFromWallet(db, currentUser.id, normalizedWithdraw);
    if (!res.success) {
      notify(res.errorEn || 'Withdrawal failed', res.errorFa || 'خطا در برداشت وجه', 'error');
      return;
    }
    onUpdateDb(res.db);
    notify(
      `Withdrawal complete! Remaining balance: ${formatCurrency(res.newBalance || 0, 'USD')}`,
      `برداشت وجه انجام شد! موجودی باقیمانده: ${formatCurrency(res.newBalance || 0, 'Rial')}`
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
      `Ticket ${res.ticket?.pnr} refunded to your wallet (${formatCurrency(res.ticket?.totalPrice || 0, 'USD')}).`,
      `بلیط ${res.ticket?.pnr} لغو و مبلغ ${formatCurrency(res.ticket?.totalPrice || 0, 'Rial')} به کیف پول شما بازگردانده شد.`
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
      <motion.div
        variants={fadeSlideUpVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5"
      >
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
          <motion.button
            type="button"
            onClick={() => setActiveTab('BOOKING')}
            {...BUTTON_HOVER_PROPS}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'BOOKING'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {isFa ? 'جستجو و رزرو آنلاین بلیط' : 'Search & Book Tickets'}
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setActiveTab('TICKETS')}
            {...BUTTON_HOVER_PROPS}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'TICKETS'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {isFa
              ? `بلیط‌های من و کارت سوارشدن (${formatNumber(userTickets.length, lang)})`
              : `My Tickets & Boarding Passes (${userTickets.length})`}
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setActiveTab('WALLET')}
            {...BUTTON_HOVER_PROPS}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'WALLET'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {isFa ? 'کیف پول دیجیتال و تراکنش‌ها' : 'Digital Wallet & Ledger'}
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setActiveTab('PROFILE')}
            {...BUTTON_HOVER_PROPS}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {isFa ? 'تنظیمات حساب کاربری' : 'Account Profile'}
          </motion.button>
        </div>

        {/* Active Passenger Balance Indicator */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isFa ? 'موجودی کیف پول شما:' : 'Available Balance:'}
          </div>
          <div className="font-mono text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(currentUser.balance, isFa ? 'Rial' : 'USD')}
          </div>
          <motion.button
            type="button"
            onClick={() => setActiveTab('WALLET')}
            {...BUTTON_HOVER_PROPS}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 cursor-pointer"
          >
            + {isFa ? 'افزایش اعتبار' : 'Top Up'}
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* TAB 1: SMART TRAIN SEARCH & TICKET BOOKING */}
          {activeTab === 'BOOKING' && (
            <div className="space-y-5">
          <motion.div
            variants={fadeSlideUpVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-xs"
          >
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
                  {localizeText(l.name_line, lang)}
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
          </motion.div>

          <motion.div
            variants={staggerGridVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
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
                <motion.div
                  key={train.id}
                  variants={interactiveCardVariants}
                  whileHover="hover"
                  className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                            {toPersianDigits(train.id_train, lang)}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            {localizeQuality(train.quality, lang)}
                          </span>
                        </div>
                        <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">
                          {localizeText(train.name_train, lang)}
                        </h4>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {localizeText(train.name_line, lang)}
                        </div>
                      </div>

                      <div className="text-end">
                        <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(train.cost_ticket, isFa ? 'Rial' : 'USD')}
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
                              {localizeText(line.origin, lang)}
                            </div>
                            <div className="font-mono text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(train.departureTime, lang)}
                            </div>
                          </div>
                          <div className="text-center px-2">
                            <div className="text-[11px] font-mono text-slate-400">
                              {formatNumber(train.speed, lang)} {isFa ? 'کیلومتر/ساعت' : 'km/h'} ·{' '}
                              {formatNumber(line.num_state, lang)} {isFa ? 'توقف' : 'stops'}
                            </div>
                            <div className="w-24 h-0.5 bg-slate-300 dark:bg-slate-700 my-1 mx-auto" />
                          </div>
                          <div className="text-end">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {localizeText(line.destination, lang)}
                            </div>
                            <div className="font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                              {formatTime(destArrival, lang)}
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
                        {formatNumber(train.capacity, lang)} / {formatNumber(train.totalCapacity, lang)} (
                        {toPersianDigits(capPercent, lang)}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, capPercent)}%` }}
                      />
                    </div>

                    <motion.button
                      type="button"
                      onClick={() => {
                        setSelectedTrain(train);
                        setLowBalanceShortfall(null);
                      }}
                      {...BUTTON_HOVER_PROPS}
                      className="rp-btn-primary w-full py-2.5 px-4 rounded-xl text-white text-xs font-semibold cursor-pointer"
                    >
                      {isFa ? 'انتخاب صندلی از نقشه واگن و رزرو' : 'Select Coach Seats & Book'}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* TAB 2: MY TICKETS & QR BOARDING PASS */}
      {activeTab === 'TICKETS' && (
        <div className="space-y-4">
          {userTickets.length === 0 ? (
            <motion.div
              variants={interactiveCardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center"
            >
              <Ticket className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {isFa ? 'هنوز بلیطی خریداری نکرده‌اید' : 'No Tickets Purchased Yet'}
              </div>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                {isFa
                  ? 'از بخش جستجو و رزرو بلیط، قطار و صندلی مورد نظر خود را انتخاب کنید.'
                  : 'Browse available trains to book your first digital boarding pass.'}
              </p>
              <motion.button
                type="button"
                onClick={() => setActiveTab('BOOKING')}
                {...BUTTON_HOVER_PROPS}
                className="rp-btn-primary px-4 py-2 rounded-lg text-white text-xs font-medium cursor-pointer"
              >
                {isFa ? 'مشاهده سرویس‌های قطار' : 'Browse Trains'}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              variants={staggerGridVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {userTickets.map((tkt) => (
                <motion.div
                  key={tkt.id}
                  variants={interactiveCardVariants}
                  whileHover="hover"
                  className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
                      <div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {isFa ? 'کد رهگیری (PNR)' : 'PNR REFERENCE'}
                        </span>
                        <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
                          {toPersianDigits(tkt.pnr, lang)}
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
                          {formatDateTime(tkt.purchasedAt, lang, 'date')}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isFa ? 'قطار:' : 'Train:'}</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {toPersianDigits(tkt.id_train, lang)} — {localizeText(tkt.name_train, lang)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isFa ? 'مسیر سفر:' : 'Route:'}</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {localizeText(tkt.origin, lang)} {isFa ? '←' : '→'}{' '}
                          {localizeText(tkt.destination, lang)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isFa ? 'ساعت حرکت:' : 'Departure:'}</span>
                        <span className="font-mono font-semibold">
                          {formatTime(tkt.departureTime, lang)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isFa ? 'واگن و صندلی‌ها:' : 'Coach & Seats:'}</span>
                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {isFa
                            ? `واگن ${toPersianDigits(tkt.coachNumber || 1, lang)}`
                            : `Coach ${tkt.coachNumber || 1}`}{' '}
                          · {toPersianDigits((tkt.seatNumbers || ['1A']).join(isFa ? '، ' : ', '), lang)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isFa ? 'مبلغ کل:' : 'Total Paid:'}</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(tkt.totalPrice, isFa ? 'Rial' : 'USD')}
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
                    <motion.button
                      type="button"
                      onClick={() => setViewingTicketModal(tkt)}
                      {...BUTTON_HOVER_PROPS}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isFa ? 'کارت سوارشدن' : 'Boarding Pass'}</span>
                    </motion.button>

                    {tkt.status === 'Confirmed' && (
                      <motion.button
                        type="button"
                        onClick={() => handleRefundTicket(tkt.id)}
                        {...BUTTON_HOVER_PROPS}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isFa ? 'لغو و استرداد وجه' : 'Cancel & Refund'}</span>
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* TAB 3: DIGITAL WALLET & FINANCIAL LEDGER */}
      {activeTab === 'WALLET' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-5">
            <motion.div
              variants={interactiveCardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white rounded-2xl p-6 border border-slate-800 shadow-lg"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <span className="text-xs font-semibold text-slate-300">
                    {isFa ? 'کیف پول اختصاصی مسافر ریل‌پالس' : 'RAILPULSE PASSENGER WALLET'}
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-400">
                  {isFa ? 'فعال' : 'ACTIVE'}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {isFa ? 'موجودی قابل خرید بلیط و برداشت آنی' : 'Available Balance'}
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums mt-1">
                {formatCurrency(currentUser.balance, isFa ? 'Rial' : 'USD')}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-6 pt-4 border-t border-slate-800">
                <span>{localizeText(currentUser.name, lang)}</span>
                <span dir="ltr" className="font-mono">@{currentUser.username}</span>
              </div>
            </motion.div>

            {/* Increase Balance */}
            <motion.div
              variants={interactiveCardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs"
            >
              <div className="flex items-center gap-2 mb-3">
                <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isFa ? 'افزایش اعتبار کیف پول (ریال)' : 'Top Up Wallet Balance (USD)'}
                </h4>
              </div>

              <div className="flex items-center gap-2 mb-3">
                {[5000000, 10000000, 25000000].map((preset) => (
                  <motion.button
                    key={preset}
                    type="button"
                    onClick={() => handleDeposit(preset, true)}
                    {...BUTTON_HOVER_PROPS}
                    className="flex-1 py-1.5 px-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
                  >
                    +{formatCurrency(preset, isFa ? 'Rial' : 'USD')}
                  </motion.button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  dir="ltr"
                  min={isFa ? 10000 : 1}
                  step={isFa ? '10000' : '1'}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
                <motion.button
                  type="button"
                  onClick={() => handleDeposit(depositAmount, false)}
                  {...BUTTON_HOVER_PROPS}
                  className="rp-btn-emerald px-4 py-2 rounded-lg text-white text-xs font-semibold cursor-pointer"
                >
                  {isFa ? 'افزایش موجودی' : 'Deposit'}
                </motion.button>
              </div>
            </motion.div>

            {/* Withdraw Balance */}
            <motion.div
              variants={interactiveCardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs"
            >
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpRight className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isFa ? 'برداشت وجه و انتقال به حساب بانکی (ریال)' : 'Withdraw Funds (USD)'}
                </h4>
              </div>
              <form onSubmit={handleWithdraw} className="flex gap-2">
                <input
                  type="number"
                  dir="ltr"
                  min={isFa ? 10000 : 1}
                  step={isFa ? '10000' : '1'}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
                <motion.button
                  type="submit"
                  {...BUTTON_HOVER_PROPS}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isFa ? 'ثبت برداشت' : 'Withdraw'}
                </motion.button>
              </form>
            </motion.div>
          </div>

          {/* Immutable Transaction Ledger */}
          <motion.div
            variants={fadeSlideUpVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs"
          >
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
                      <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {isFa ? toPersianDigits(tx.descriptionFa, 'fa') : tx.descriptionEn}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {formatDateTime(tx.timestamp, lang, 'full')}
                          </div>
                        </td>
                        <td
                          className={`py-3 px-3 text-end font-mono font-semibold ${
                            isCredit
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {isCredit ? '+' : '-'}{formatCurrency(tx.amount, isFa ? 'Rial' : 'USD')}
                        </td>
                        <td className="py-3 px-3 text-end font-mono text-slate-700 dark:text-slate-300">
                          {formatCurrency(tx.runningBalance, isFa ? 'Rial' : 'USD')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {/* TAB 4: AUTHENTICATED PROFILE MANAGEMENT */}
      {activeTab === 'PROFILE' && (
        <motion.div
          variants={interactiveCardVariants}
          initial="hidden"
          animate="visible"
          whileHover="hover"
          className="rp-card-hover max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs"
        >
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
            <div className="group">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                {isFa ? 'نام و نام خانوادگی' : 'Full Name'}
              </label>
              <input
                type="text"
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>

            <div className="group">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
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

            <div className="group">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
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

            <div className="group">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
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

            <motion.button
              type="submit"
              {...BUTTON_HOVER_PROPS}
              className="rp-btn-primary w-full py-2.5 px-4 rounded-xl text-white text-sm font-semibold cursor-pointer"
            >
              {isFa ? 'ذخیره تغییرات حساب کاربری' : 'Save Profile Changes'}
            </motion.button>
          </form>
        </motion.div>
      )}
        </motion.div>
      </AnimatePresence>

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
          onQuickDeposit={(amt) => handleDeposit(amt, true)}
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
