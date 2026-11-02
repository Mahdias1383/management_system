import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  MapPin,
  QrCode,
  Search,
  ShieldCheck,
  Ticket,
  Train,
  Wallet,
} from 'lucide-react';
import { Language, PlatformDatabaseV2, QualityTier, TicketRecord, TrainSchedule } from '../types/domain';
import {
  formatNumber,
  formatCurrency,
  formatTime,
  localizeQuality,
  localizeText,
  normalizeIdentifier,
  toPersianDigits,
} from '../services/authService';
import { computeTrainStationTimings } from '../services/collisionEngine';
import { DigitalBoardingPassModal } from '../components/DigitalBoardingPassModal';

interface PublicHomePageProps {
  db: PlatformDatabaseV2;
  lang: Language;
  onSelectTrainForBooking: (train: TrainSchedule) => void;
}

export const PublicHomePage: React.FC<PublicHomePageProps> = ({
  db,
  lang,
  onSelectTrainForBooking,
}) => {
  const isFa = lang === 'fa';

  // Extract unique stations from all lines
  const allOrigins = Array.from(new Set(db.lines.map((l) => l.origin)));
  const allDestinations = Array.from(new Set(db.lines.map((l) => l.destination)));

  // Hero Search Engine State
  const [originFilter, setOriginFilter] = useState<string>('ALL');
  const [destinationFilter, setDestinationFilter] = useState<string>('ALL');
  const [qualityFilter, setQualityFilter] = useState<string>('ALL');
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // PNR Ticket Lookup State
  const [pnrInput, setPnrInput] = useState<string>('');
  const [foundTicket, setFoundTicket] = useState<TicketRecord | null>(null);
  const [pnrSearched, setPnrSearched] = useState<boolean>(false);

  const handleSwapStations = () => {
    const temp = originFilter;
    setOriginFilter(destinationFilter);
    setDestinationFilter(temp);
  };

  const filteredTrains = db.trains.filter((t) => {
    const line = db.lines.find(
      (l) => normalizeIdentifier(l.name_line) === normalizeIdentifier(t.name_line)
    );
    if (originFilter !== 'ALL' && line && line.origin !== originFilter) {
      return false;
    }
    if (destinationFilter !== 'ALL' && line && line.destination !== destinationFilter) {
      return false;
    }
    if (qualityFilter !== 'ALL' && t.quality !== (qualityFilter as QualityTier)) {
      return false;
    }
    if (t.capacity < passengerCount) {
      return false;
    }
    if (searchKeyword.trim()) {
      const q = searchKeyword.trim().toLowerCase();
      const hay = `${t.id_train} ${t.name_train} ${t.name_line} ${line?.origin || ''} ${
        line?.destination || ''
      } ${(line?.list_state || []).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const handleLookupPnr = (e: React.FormEvent) => {
    e.preventDefault();
    setPnrSearched(true);
    const norm = normalizeIdentifier(pnrInput);
    if (!norm) {
      setFoundTicket(null);
      return;
    }
    const match = db.tickets.find((t) => normalizeIdentifier(t.pnr) === norm);
    setFoundTicket(match || null);
  };

  return (
    <div className="space-y-14 pb-8 rp-animate-in">
      {/* 1. HERO BOOKING ENGINE SECTION */}
      <section id="search-engine" className="space-y-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white rounded-2xl p-6 sm:p-10 border border-slate-800 shadow-xl">
          <div className="relative z-10 max-w-3xl">
            <div className="text-xs font-semibold text-blue-400 mb-2">
              {isFa
                ? 'شبکه یکپارچه قطارهای سریع‌السیر و مسافربری کشور'
                : 'National High-Speed & Intercity Railway Reservation'}
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight text-balance">
              {isFa
                ? 'رزرو آنلاین بلیط قطار با انتخاب نقشه صندلی و صدور آنی کارت سوارشدن'
                : 'Book High-Speed Train Tickets with Interactive Coach Seat Selection'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed">
              {isFa
                ? 'جستجوی زنده در میان خطوط ریلی کشور، مشاهده زمان دقیق ورود و توقف در ایستگاه‌های میانی، پرداخت امن با کیف پول دیجیتال و تضمین استرداد آنلاین وجه.'
                : 'Search real-time departures across national railway corridors, inspect intermediate station schedules, and receive verifiable QR digital boarding passes.'}
            </p>
          </div>

          {/* Interactive Search Engine Widget */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.05 }}
            whileHover={{ y: -2 }}
            className="relative z-10 mt-8 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md text-slate-900 dark:text-slate-100 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
              {/* Origin */}
              <div className="md:col-span-3 group">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 mb-1.5">
                  {isFa ? 'ایستگاه مبدا' : 'Origin Station'}
                </label>
                <select
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                >
                  <option value="ALL">{isFa ? 'همه ایستگاه‌های مبدا' : 'All Origins'}</option>
                  {allOrigins.map((orig) => (
                    <option key={orig} value={orig}>
                      {localizeText(orig, lang)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button with 180-deg Rotation Animation */}
              <div className="md:col-span-1 flex justify-center">
                <button
                  type="button"
                  onClick={handleSwapStations}
                  className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all duration-200 cursor-pointer group"
                  title={isFa ? 'جابجایی مبدا و مقصد' : 'Swap Origin & Destination'}
                >
                  <ArrowLeftRight className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
                </button>
              </div>

              {/* Destination */}
              <div className="md:col-span-3 group">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 mb-1.5">
                  {isFa ? 'ایستگاه مقصد' : 'Destination Station'}
                </label>
                <select
                  value={destinationFilter}
                  onChange={(e) => setDestinationFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                >
                  <option value="ALL">{isFa ? 'همه ایستگاه‌های مقصد' : 'All Destinations'}</option>
                  {allDestinations.map((dest) => (
                    <option key={dest} value={dest}>
                      {localizeText(dest, lang)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Tier */}
              <div className="md:col-span-2 group">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 mb-1.5">
                  {isFa ? 'کلاس سالن' : 'Travel Class'}
                </label>
                <select
                  value={qualityFilter}
                  onChange={(e) => setQualityFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                >
                  <option value="ALL">{isFa ? 'همه کلاس‌ها' : 'All Classes'}</option>
                  <option value="VIP 5-Star">{isFa ? '۵ ستاره ویژه (VIP)' : 'VIP 5-Star'}</option>
                  <option value="Business 4-Star">{isFa ? '۴ ستاره تجاری' : 'Business 4-Star'}</option>
                  <option value="Economy 3-Star">{isFa ? '۳ ستاره اقتصادی' : 'Economy 3-Star'}</option>
                </select>
              </div>

              {/* Passenger Count */}
              <div className="md:col-span-1 group">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 mb-1.5">
                  {isFa ? 'مسافران' : 'Seats'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={passengerCount}
                  onChange={(e) => setPassengerCount(Math.max(1, Number(e.target.value)))}
                  className="w-full px-2.5 py-2.5 text-xs font-mono font-bold text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              {/* Search CTA */}
              <div className="md:col-span-2">
                <a
                  href="#live-departures"
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl rp-btn-primary text-white text-xs font-semibold transition-all whitespace-nowrap"
                >
                  <Search className="w-4 h-4" />
                  <span>{isFa ? 'جستجوی قطارها' : 'Search Trains'}</span>
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. LIVE NATIONAL DEPARTURES BOARD */}
      <section id="live-departures" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {isFa
                ? 'تابلوی زنده حرکت قطارها و سرویس‌های آماده رزرو'
                : 'Live National Train Departures & Seat Availability'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {isFa
                ? 'قطار مورد نظر خود را انتخاب کنید تا نقشه صندلی‌های واگن و جزئیات ایستگاه‌های مسیر نمایش داده شود.'
                : 'Select any scheduled train to inspect intermediate station timings and choose your seats.'}
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute top-2.5 start-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder={isFa ? 'جستجوی نام قطار، شهر یا ایستگاه...' : 'Filter by train or station...'}
              className="w-full ps-9 pe-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
        </div>

        {filteredTrains.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center rp-animate-in">
            <Train className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {isFa
                ? 'هیچ سرویس قطاری با فیلترهای انتخابی یافت نشد'
                : 'No Scheduled Trains Match Your Filters'}
            </div>
            <button
              type="button"
              onClick={() => {
                setOriginFilter('ALL');
                setDestinationFilter('ALL');
                setQualityFilter('ALL');
                setSearchKeyword('');
              }}
              className="mt-4 px-4 py-2 rounded-xl rp-btn-primary text-white text-xs font-semibold cursor-pointer"
            >
              {isFa ? 'نمایش همه قطارها' : 'Reset All Filters'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredTrains.map((train, idx) => {
                const line = db.lines.find(
                  (l) => normalizeIdentifier(l.name_line) === normalizeIdentifier(train.name_line)
                );
                const timings = line ? computeTrainStationTimings(train, line) : [];
                const arrivalFormatted =
                  timings.length > 0 ? timings[timings.length - 1].arrivalFormatted : '--:--';

                return (
                  <motion.div
                    key={train.id}
                    layout
                    initial={{ opacity: 0, y: 18, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
                    transition={{
                      type: 'spring',
                      stiffness: 310,
                      damping: 25,
                      delay: (idx % 6) * 0.045,
                    }}
                    whileHover={{ y: -5, scale: 1.012 }}
                    whileTap={{ scale: 0.994 }}
                    className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between rp-card-hover"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">
                            {toPersianDigits(train.id_train, lang)} · {localizeQuality(train.quality, lang)}
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {localizeText(train.name_train, lang)}
                          </h3>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {localizeText(train.name_line, lang)}
                          </div>
                        </div>

                        <div className="text-end">
                          <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(train.cost_ticket, isFa ? 'Rial' : 'USD')}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {isFa ? 'بهای هر صندلی' : 'per seat'}
                          </div>
                        </div>
                      </div>

                      {line && (
                        <div className="my-4 p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-950/90 border border-slate-200/80 dark:border-slate-800 text-xs">
                          <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              {localizeText(line.origin, lang)}
                            </span>
                            <span className="text-blue-500 font-mono">{isFa ? '◄───' : '───►'}</span>
                            <span>{localizeText(line.destination, lang)}</span>
                          </div>

                          <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 mt-2">
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                              <Clock className="w-3 h-3" />
                              {formatTime(train.departureTime, lang)}
                            </span>
                            <span>
                              {formatNumber(train.speed, lang)} {isFa ? 'کیلومتر/ساعت' : 'km/h'}
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              {isFa ? 'ورود:' : 'Arr:'} {formatTime(arrivalFormatted, lang)}
                            </span>
                          </div>

                          {line.list_state.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-[11px] text-slate-500 truncate">
                              {isFa ? 'ایستگاه‌های عبوری:' : 'Stops:'}{' '}
                              {line.list_state.map((st) => localizeText(st, lang)).join(' · ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400">
                        {isFa
                          ? `${formatNumber(train.capacity, lang)} صندلی خالی`
                          : `${train.capacity} seats left`}
                      </span>

                      <button
                        type="button"
                        onClick={() => onSelectTrainForBooking(train)}
                        className="px-4 py-2 rounded-xl rp-btn-primary text-white text-xs font-semibold cursor-pointer"
                      >
                        {isFa ? 'انتخاب صندلی و خرید' : 'Select Seats & Book'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* 3. PNR TICKET TRACKER & DIGITAL BOARDING PASS VERIFICATION */}
      <section
        id="pnr-tracker"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 rp-card-hover"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-1.5">
              <QrCode className="w-4 h-4" />
              <span>
                {isFa
                  ? 'استعلام آنلاین بلیط و کارت سوارشدن دیجیتال'
                  : 'Instant PNR Boarding Pass Lookup'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {isFa
                ? 'پیگیری وضعیت رزرو و دریافت مجدد کارت سوارشدن با کد رهگیری (PNR)'
                : 'Verify Your Reservation & Retrieve Digital Boarding Pass'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isFa
                ? 'کد رزرو ۵ رقمی بلیط خود (مانند RP-89412 یا RP-90234) را وارد کنید تا جزئیات واگن، شماره صندلی و بارکد سوارشدن نمایش داده شود.'
                : 'Enter your PNR booking reference (e.g., RP-89412 or RP-90234) to view and print your digital boarding pass.'}
            </p>
          </div>

          <div className="lg:col-span-5">
            <form onSubmit={handleLookupPnr} className="flex gap-2.5">
              <input
                type="text"
                dir="ltr"
                value={pnrInput}
                onChange={(e) => setPnrInput(e.target.value)}
                placeholder="e.g. RP-89412"
                className="flex-1 px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl rp-btn-primary text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                {isFa ? 'بررسی بلیط' : 'Track PNR'}
              </button>
            </form>

            {pnrSearched && !foundTicket && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400 rp-animate-in">
                {isFa
                  ? 'بلیطی با این کد رزرو یافت نشد. لطفاً کد PNR را بررسی کنید.'
                  : 'No ticket found matching that PNR reference code.'}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. WHY RAILPULSE ENTERPRISE GUARANTEES */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 rp-card-hover">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3.5">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {isFa ? 'سیستم هوشمند ایمنی و پیشگیری از تداخل' : 'Automated Dispatch Collision Safety'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            {isFa
              ? 'تمامی قطارهای شبکه پیش از صدور مجوز حرکت، توسط رادار ریاضی زمان-مسافت و رعایت سرفاصله ایمنی ۵ دقیقه‌ای پایش می‌شوند.'
              : 'Every train timetable is verified by our mathematical temporal-spatial safety engine with mandatory 5-minute block headway.'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 rp-card-hover">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3.5">
            <Ticket className="w-5 h-5 text-blue-500" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {isFa ? 'انتخاب صندلی از روی نقشه شماتیک واگن' : 'Interactive Coach Seat Map Selection'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            {isFa
              ? 'مسافران هنگام خرید بلیط می‌توانند واگن و شماره صندلی دلخواه خود را انتخاب کرده و بلافاصله کارت سوارشدن QR دریافت کنند.'
              : 'Choose your exact coach and window/aisle seat numbers visually and receive an instant verifiable QR boarding pass.'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 rp-card-hover">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3.5">
            <Wallet className="w-5 h-5 text-amber-500" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {isFa ? 'کیف پول اختصاصی و استرداد آنی وجه' : 'Instant Online Cancellation & Wallet Refund'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            {isFa
              ? 'در صورت انصراف از سفر، با یک کلیک بلیط خود را لغو کنید تا کل مبلغ بلافاصله به موجودی کیف پول شما بازگردانده شود.'
              : 'Plans changed? Cancel your confirmed ticket in one click for an immediate, full refund credited back to your personal wallet.'}
          </p>
        </div>
      </section>

      {foundTicket && (
        <DigitalBoardingPassModal
          ticket={foundTicket}
          lang={lang}
          onClose={() => setFoundTicket(null)}
        />
      )}
    </div>
  );
};
