import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
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
  TrainSchedule,
} from '../types/domain';
import {
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

interface PassengerPortalProps {
  db: PlatformDatabaseV2;
  onUpdateDb: (nextDb: PlatformDatabaseV2) => void;
  currentUser: PassengerUser;
  onUpdateSessionUsername: (newUsername: string, newDisplayName: string, newEmail: string) => void;
  lang: Language;
  notify: (msgEn: string, msgFa: string, type?: 'success' | 'error') => void;
}

export const PassengerPortal: React.FC<PassengerPortalProps> = ({
  db,
  onUpdateDb,
  currentUser,
  onUpdateSessionUsername,
  lang,
  notify,
}) => {
  const isFa = lang === 'fa';
  const [activeTab, setActiveTab] = useState<'BOOKING' | 'TICKETS' | 'WALLET' | 'PROFILE'>('BOOKING');

  // --- SEARCH & FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLineFilter, setSelectedLineFilter] = useState('ALL');
  const [selectedQualityFilter, setSelectedQualityFilter] = useState('ALL');
  const [minSeatsFilter, setMinSeatsFilter] = useState(1);

  // --- BOOKING DRAWER / MODAL STATE ---
  const [selectedTrain, setSelectedTrain] = useState<TrainSchedule | null>(null);
  const [ticketCount, setTicketCount] = useState(1);
  const [lowBalanceShortfall, setLowBalanceShortfall] = useState<number | null>(null);

  // --- WALLET STATE ---
  const [depositAmount, setDepositAmount] = useState('100');
  const [withdrawAmount, setWithdrawAmount] = useState('50');

  // --- PROFILE STATE (Strictly scoped to currentUser.id!) ---
  const [profName, setProfName] = useState(currentUser.name);
  const [profEmail, setProfEmail] = useState(currentUser.email);
  const [profUsername, setProfUsername] = useState(currentUser.username);
  const [profPassword, setProfPassword] = useState('');

  // Filter available trains
  const filteredTrains = db.trains.filter((t) => {
    if (selectedLineFilter !== 'ALL' && normalizeIdentifier(t.name_line) !== normalizeIdentifier(selectedLineFilter)) {
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
      const line = db.lines.find((l) => normalizeIdentifier(l.name_line) === normalizeIdentifier(t.name_line));
      const hay = `${t.id_train} ${t.name_train} ${t.name_line} ${line?.origin || ''} ${line?.destination || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const userTickets = db.tickets.filter((t) => t.userId === currentUser.id);
  const userTransactions = db.transactions.filter((tx) => tx.userId === currentUser.id);

  const handleConfirmBooking = () => {
    if (!selectedTrain) return;
    setLowBalanceShortfall(null);

    const res = purchaseTrainTicket(db, currentUser.id, selectedTrain.id_train, ticketCount);
    if (!res.success) {
      if (res.lowBalanceRedirect && res.requiredShortfall) {
        setLowBalanceShortfall(res.requiredShortfall);
      }
      notify(res.errorEn || 'Booking failed', res.errorFa || 'خطا در خرید بلیط', 'error');
      return;
    }

    onUpdateDb(res.db);
    setSelectedTrain(null);
    setActiveTab('TICKETS');
    notify(
      `Ticket booked! PNR: ${res.ticket?.pnr}`,
      `خرید بلیط با موفقیت انجام شد! کد رزرو (PNR): ${res.ticket?.pnr}`
    );
  };

  const handleDeposit = (amountVal: unknown) => {
    const res = depositToWallet(db, currentUser.id, amountVal);
    if (!res.success) {
      notify(res.errorEn || 'Invalid deposit', res.errorFa || 'مبلغ نامعتبر است', 'error');
      return;
    }
    onUpdateDb(res.db);
    setLowBalanceShortfall(null);
    notify(
      `Wallet credited! New balance: $${res.newBalance?.toFixed(2)}`,
      `کیف پول شارژ شد! موجودی جدید: $${res.newBalance?.toFixed(2)}`
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
      `Withdrawal complete! Remaining balance: $${res.newBalance?.toFixed(2)}`,
      `برداشت با موفقیت انجام شد! موجودی باقیمانده: $${res.newBalance?.toFixed(2)}`
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
      `Ticket ${res.ticket?.pnr} refunded to your wallet ($${res.ticket?.totalPrice.toFixed(2)}).`,
      `بلیط ${res.ticket?.pnr} لغو و مبلغ $${res.ticket?.totalPrice.toFixed(2)} به کیف پول شما بازگشت داده شد.`
    );
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimName = profName.trim();
    const trimEmail = profEmail.trim();
    const trimUsername = profUsername.trim();

    if (!trimName || !trimEmail || !trimUsername) {
      notify('Name, Email, and Username cannot be empty.', 'نام، ایمیل و نام کاربری نمی‌توانند خالی باشند.', 'error');
      return;
    }

    if (!isValidEmail(trimEmail)) {
      notify('Please enter a valid email address.', 'لطفاً یک آدرس ایمیل معتبر وارد کنید.', 'error');
      return;
    }

    const normEmail = normalizeIdentifier(trimEmail);
    const normUser = normalizeIdentifier(trimUsername);

    if (
      db.passengers.some(
        (u) => u.id !== currentUser.id && normalizeIdentifier(u.email) === normEmail
      )
    ) {
      notify('This email is already taken by another user!', 'این ایمیل قبلاً توسط کاربر دیگری ثبت شده است!', 'error');
      return;
    }

    if (
      db.passengers.some(
        (u) => u.id !== currentUser.id && normalizeIdentifier(u.username) === normUser
      ) ||
      db.employees.some((emp) => normalizeIdentifier(emp.username) === normUser) ||
      normalizeIdentifier(db.admin.username) === normUser
    ) {
      notify('This username is already taken!', 'این نام کاربری قبلاً انتخاب شده است!', 'error');
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

      // Cascade username update across user's tickets & transactions
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
        detailsEn: `Passenger updated own profile (scoped to userId: ${currentUser.id}).`,
        detailsFa: `مسافر اطلاعات پروفایل خود را بروزرسانی کرد (ایزوله برای شناسه ${currentUser.id}).`,
      });

      onUpdateDb(nextDb);
      onUpdateSessionUsername(trimUsername, trimName, trimEmail.toLowerCase());
      setProfPassword('');
      notify('Your profile has been updated!', 'اطلاعات حساب کاربری شما با موفقیت بروزرسانی شد!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Passenger Summary & Sub-Navigation */}
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
            {isFa ? 'جستجو و رزرو بلیط (user_shopping)' : 'Search & Book Trains (user_shopping)'}
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
              : `My Tickets & Boarding Pass (${userTickets.length})`}
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
            {isFa ? 'کیف پول دیجیتال (Wallet)' : 'Digital Wallet & Ledger'}
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
            {isFa ? 'ویرایش پروفایل (edit_profile)' : 'Edit Profile (edit_profile)'}
          </button>
        </div>

        {/* Active Passenger Balance Indicator */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isFa ? 'موجودی کیف پول شما:' : 'Your Wallet Balance:'}
          </div>
          <div className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
            ${currentUser.balance.toFixed(2)}
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('WALLET')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 cursor-pointer"
          >
            + {isFa ? 'شارژ سریع' : 'Top Up'}
          </button>
        </div>
      </div>

      {/* TAB 1: SMART TRAIN SEARCH & TICKET BOOKING */}
      {activeTab === 'BOOKING' && (
        <div className="space-y-5">
          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute top-2.5 start-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isFa ? 'جستجوی شهر، قطار یا شناسه...' : 'Search station, train ID...'}
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
              <option value="ALL">{isFa ? 'همه کلاس‌های سالن' : 'All Quality Tiers'}</option>
              <option value="VIP 5-Star">VIP 5-Star</option>
              <option value="Business 4-Star">Business 4-Star</option>
              <option value="Economy 3-Star">Economy 3-Star</option>
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

          {/* Train Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTrains.map((train) => {
              const line = db.lines.find(
                (l) => normalizeIdentifier(l.name_line) === normalizeIdentifier(train.name_line)
              );
              const timings = line ? computeTrainStationTimings(train, line) : [];
              const destArrival = timings.length > 0 ? timings[timings.length - 1].arrivalFormatted : '--:--';
              const capPercent = Math.round((train.capacity / Math.max(1, train.totalCapacity)) * 100);

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
                        <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          ${train.cost_ticket.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {isFa ? 'هر صندلی' : 'per passenger'}
                        </div>
                      </div>
                    </div>

                    {/* Route & Timing Summary */}
                    {line && (
                      <div className="my-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {line.origin}
                            </div>
                            <div className="font-mono text-blue-600 dark:text-blue-400 mt-0.5">
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
                        setTicketCount(1);
                        setLowBalanceShortfall(null);
                      }}
                      className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {isFa ? 'انتخاب قطار و رزرو بلیط' : 'Select Train & Book Tickets'}
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
                  ? 'از بخش جستجو و رزرو بلیط، قطار مورد نظر خود را انتخاب کنید.'
                  : 'Browse available trains to book your first digital boarding pass.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('BOOKING')}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer"
              >
                {isFa ? 'مشاهده قطارها' : 'Browse Trains'}
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
                        <span className="text-[11px] text-slate-400 font-mono">PNR CODE</span>
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
                              ? 'تایید شده (Confirmed)'
                              : 'Confirmed'
                            : isFa
                            ? 'مسترد شده (Refunded)'
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
                        <span className="text-slate-500">{isFa ? 'مسیر:' : 'Route:'}</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {tkt.origin} → {tkt.destination}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isFa ? 'ساعت حرکت:' : 'Departure:'}</span>
                        <span className="font-mono font-semibold">{tkt.departureTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isFa ? 'مسافر:' : 'Passenger:'}</span>
                        <span>{tkt.passengerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isFa ? 'تعداد صندلی و مبلغ کل:' : 'Seats & Total Paid:'}</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {tkt.ticketCount}x (${tkt.unitPrice}) = ${tkt.totalPrice.toFixed(2)}
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
                          {isFa ? 'امضای دیجیتال کارت سوارشدن' : 'VERIFIED QR BOARDING PAYLOAD'}
                        </div>
                        <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 truncate mt-0.5">
                          {tkt.qrPayload}
                        </div>
                      </div>
                    </div>
                  </div>

                  {tkt.status === 'Confirmed' && (
                    <button
                      type="button"
                      onClick={() => handleRefundTicket(tkt.id)}
                      className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isFa ? 'لغو بلیط و استرداد وجه به کیف پول' : 'Cancel Ticket & Refund to Wallet'}</span>
                    </button>
                  )}
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
            {/* Interactive Visual Bank Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <span className="text-xs font-mono tracking-wider text-slate-300">
                    RAILPULSE PAY WALLET
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-400">ACTIVE</span>
              </div>
              <div className="text-xs text-slate-400">
                {isFa ? 'موجودی قابل برداشت و خرید بلیط' : 'Available Balance'}
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums mt-1">
                ${currentUser.balance.toFixed(2)}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-6 pt-4 border-t border-slate-800 font-mono">
                <span>{currentUser.name}</span>
                <span>@{currentUser.username}</span>
              </div>
            </div>

            {/* Increase Balance (`add_money`) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isFa ? 'افزایش موجودی کیف پول (add_money)' : 'Increase Wallet Balance (add_money)'}
                </h4>
              </div>

              <div className="flex items-center gap-2 mb-3">
                {[50, 100, 250].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleDeposit(preset)}
                    className="flex-1 py-1.5 px-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-mono font-semibold cursor-pointer"
                  >
                    +${preset}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  dir="ltr"
                  min={1}
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
                <button
                  type="button"
                  onClick={() => handleDeposit(depositAmount)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  {isFa ? 'شارژ حساب' : 'Deposit'}
                </button>
              </div>
            </div>

            {/* Decrease Balance (`decrease_money`) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpRight className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isFa ? 'برداشت وجه از کیف پول (decrease_money)' : 'Withdraw Balance (decrease_money)'}
                </h4>
              </div>
              <form onSubmit={handleWithdraw} className="flex gap-2">
                <input
                  type="number"
                  dir="ltr"
                  min={1}
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                >
                  {isFa ? 'برداشت وجه' : 'Withdraw'}
                </button>
              </form>
            </div>
          </div>

          {/* Immutable Transaction Ledger */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {isFa ? 'دفتر کل تراکنش‌های مالی مسافر' : 'Immutable Passenger Financial Ledger'}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-3 text-start">{isFa ? 'شرح تراکنش' : 'Description'}</th>
                    <th className="py-2.5 px-3 text-start">{isFa ? 'نوع' : 'Type'}</th>
                    <th className="py-2.5 px-3 text-end">{isFa ? 'مبلغ' : 'Amount'}</th>
                    <th className="py-2.5 px-3 text-end">{isFa ? 'مانده حساب' : 'Balance'}</th>
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
                        <td className="py-3 px-3 font-mono text-[11px]">{tx.type}</td>
                        <td
                          className={`py-3 px-3 text-end font-mono font-semibold ${
                            isCredit
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {isCredit ? '+' : '-'}${tx.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-end font-mono text-slate-700 dark:text-slate-300">
                          ${tx.runningBalance.toFixed(2)}
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

      {/* TAB 4: AUTHENTICATED PROFILE MANAGEMENT (`edit_profile`) */}
      {activeTab === 'PROFILE' && (
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-2">
            <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {isFa
                ? 'ویرایش اطلاعات حساب کاربری شخصی (edit_profile)'
                : 'Authenticated Passenger Profile Management (edit_profile)'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            {isFa
              ? `ایزوله شده برای نشست فعال شما (${currentUser.id}) — رفع باگ امنیتی نسخه پایتون که اجازه ویرایش سایر کاربران را می‌داد.`
              : `Strictly bound to your active session (${currentUser.id}) — prevents cross-account profile tampering.`}
          </p>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isFa ? 'نام و نام خانوادگی (name)' : 'Full Name (name)'}
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
                {isFa ? 'نام کاربری یکتا (username)' : 'Username (username)'}
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
                {isFa ? 'آدرس ایمیل یکتا (email)' : 'Email Address (email)'}
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
                {isFa ? 'رمز عبور جدید (اختیاری)' : 'New Password (leave blank to keep current)'}
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
              {isFa ? 'ذخیره تغییرات پروفایل' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Interactive Ticket Booking Drawer / Modal */}
      {selectedTrain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Train className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {selectedTrain.id_train} — {selectedTrain.name_train}
                  </h4>
                  <div className="text-xs text-slate-500">{selectedTrain.name_line}</div>
                </div>
              </div>
              <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                ${selectedTrain.cost_ticket.toFixed(2)}
              </span>
            </div>

            {/* Station-by-Station Timetable inside Booking Modal */}
            {(() => {
              const line = db.lines.find(
                (l) => normalizeIdentifier(l.name_line) === normalizeIdentifier(selectedTrain.name_line)
              );
              const timings = line ? computeTrainStationTimings(selectedTrain, line) : [];
              return (
                timings.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-slate-500 mb-2">
                      {isFa ? 'جدول زمانبندی ایستگاه‌ها و توقف‌ها:' : 'Station-by-Station Timetable:'}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                      {timings.map((node) => (
                        <div
                          key={node.stationIndex}
                          className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]"
                        >
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {node.stationName}
                          </div>
                          <div className="font-mono text-slate-500">
                            {node.arrivalFormatted} → {node.departureFormatted}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              );
            })()}

            <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span>{isFa ? 'تعداد بلیط درخواستی:' : 'Number of Tickets:'}</span>
                <input
                  type="number"
                  dir="ltr"
                  min={1}
                  max={selectedTrain.capacity}
                  value={ticketCount}
                  onChange={(e) => setTicketCount(Math.max(1, Math.round(Number(e.target.value))))}
                  className="w-24 px-2.5 py-1 text-sm font-mono text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span>{isFa ? 'ظرفیت صندلی موجود:' : 'Available Seats:'}</span>
                <span className="font-mono">{selectedTrain.capacity}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span>{isFa ? 'موجودی فعلی کیف پول شما:' : 'Your Wallet Balance:'}</span>
                <span className="font-mono font-semibold">${currentUser.balance.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>{isFa ? 'مبلغ قابل پرداخت (کل):' : 'Total Cost:'}</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  ${(ticketCount * selectedTrain.cost_ticket).toFixed(2)}
                </span>
              </div>
            </div>

            {lowBalanceShortfall !== null && (
              <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-700 dark:text-amber-300">
                <span>
                  {isFa
                    ? `کمبود موجودی کیف پول: $${lowBalanceShortfall.toFixed(2)}`
                    : `Wallet shortfall: $${lowBalanceShortfall.toFixed(2)}`}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeposit(Math.ceil(lowBalanceShortfall))}
                  className="px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-medium cursor-pointer whitespace-nowrap"
                >
                  {isFa
                    ? `شارژ آنی +$${Math.ceil(lowBalanceShortfall)}`
                    : `Instant Top-Up +$${Math.ceil(lowBalanceShortfall)}`}
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedTrain(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmBooking}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {isFa ? 'پرداخت از کیف پول و صدور بلیط' : 'Pay with Wallet & Issue Boarding Pass'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
