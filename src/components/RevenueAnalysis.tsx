import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, RotateCcw, TrendingUp } from 'lucide-react';
import { Language, TicketRecord, TrainLine, WalletTransaction } from '../types/domain';
import {
  formatCompactRial,
  formatDateTime,
  formatNumber,
  formatCurrency,
  localizeText,
  toPersianDigits,
} from '../services/authService';
import {
  BUTTON_HOVER_PROPS,
  fadeSlideUpVariants,
} from './ui/motionPrimitives';
import {
  AdminChartSkeleton,
  AdminKpiStripSkeleton,
} from './ui/AdminSkeletons';

interface RevenueAnalysisProps {
  transactions: WalletTransaction[];
  tickets?: TicketRecord[];
  lines?: TrainLine[];
  lang: Language;
  isLoading?: boolean;
}

export interface DailyRevenuePoint {
  dateKey: string;
  label: string;
  grossRevenue: number;
  refundedAmount: number;
  netRevenue: number;
  transactionCount: number;
}

const revenueKpiGridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

const revenueKpiCardVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 320, damping: 24 },
  },
  hover: {
    y: -5,
    scale: 1.05,
    boxShadow:
      '0 14px 28px -8px rgba(37, 99, 235, 0.14), 0 6px 12px -4px rgba(15, 23, 42, 0.06)',
    transition: { type: 'spring', stiffness: 380, damping: 22 },
  },
};

export const RevenueAnalysis: React.FC<RevenueAnalysisProps> = ({
  transactions,
  lines = [],
  lang,
  isLoading = false,
}) => {
  const isFa = lang === 'fa';
  const [chartMode, setChartMode] = useState<'AREA' | 'BAR'>('AREA');
  const [corridorFilter, setCorridorFilter] = useState<string>('ALL');
  const [isInternalRefreshing, setIsInternalRefreshing] = useState(false);
  const refreshTimerRef = useRef<number | null>(null);

  const triggerChartRefresh = (durationMs: number = 420) => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }
    setIsInternalRefreshing(true);
    refreshTimerRef.current = window.setTimeout(() => {
      setIsInternalRefreshing(false);
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const showSkeleton = Boolean(isLoading || isInternalRefreshing);

  const dailyData = useMemo<DailyRevenuePoint[]>(() => {
    const ticketTxList = (transactions || []).filter(
      (tx) => tx.type === 'TICKET_PURCHASE' || tx.type === 'TICKET_REFUND'
    );

    const filteredTransactions =
      corridorFilter === 'ALL'
        ? ticketTxList
        : ticketTxList.filter(
            (tx) =>
              tx.descriptionEn.toLowerCase().includes(corridorFilter.trim().toLowerCase()) ||
              tx.descriptionFa.toLowerCase().includes(corridorFilter.trim().toLowerCase())
          );

    let anchorDate = new Date();
    if (ticketTxList.length > 0) {
      const validTimestamps = ticketTxList
        .map((tx) => new Date(tx.timestamp).getTime())
        .filter((ts) => Number.isFinite(ts));
      if (validTimestamps.length > 0) {
        anchorDate = new Date(Math.max(...validTimestamps, Date.now()));
      }
    }

    const points: DailyRevenuePoint[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(anchorDate);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const shortLabel = formatDateTime(d, lang, 'shortDate');

      let dayPurchases = 0;
      let dayRefunds = 0;
      let txCount = 0;

      filteredTransactions.forEach((tx) => {
        const txDateKey = String(tx.timestamp || '').slice(0, 10);
        if (txDateKey === dateKey) {
          if (tx.type === 'TICKET_PURCHASE') {
            dayPurchases += Number(tx.amount) || 0;
            txCount += 1;
          } else if (tx.type === 'TICKET_REFUND') {
            dayRefunds += Number(tx.amount) || 0;
          }
        }
      });

      const grossRevenue = Math.round(dayPurchases * 100) / 100;
      const refundedAmount = Math.round(dayRefunds * 100) / 100;
      const netRevenue = Math.max(0, Math.round((grossRevenue - refundedAmount) * 100) / 100);

      points.push({
        dateKey,
        label: shortLabel,
        grossRevenue,
        refundedAmount,
        netRevenue,
        transactionCount: txCount,
      });
    }

    return points;
  }, [transactions, corridorFilter, isFa, lang]);

  const summary = useMemo(() => {
    const totalGross30d = dailyData.reduce((acc, p) => acc + p.grossRevenue, 0);
    const totalNet30d = dailyData.reduce((acc, p) => acc + p.netRevenue, 0);
    const totalTxCount30d = dailyData.reduce((acc, p) => acc + p.transactionCount, 0);
    const avgDaily = totalNet30d / Math.max(1, dailyData.length);
    const peakDay = dailyData.reduce(
      (best, curr) => (curr.netRevenue > best.netRevenue ? curr : best),
      dailyData[0] || { label: '--', netRevenue: 0, grossRevenue: 0 }
    );
    return {
      totalGross30d,
      totalNet30d,
      totalTxCount30d,
      avgDaily,
      peakDay,
    };
  }, [dailyData]);

  return (
    <motion.div
      variants={fadeSlideUpVariants}
      initial="hidden"
      animate="visible"
      className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs"
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {isFa
                ? 'تحلیل ۳۰ روزه درآمد فروش بلیط در شبکه ریلی (ریال)'
                : '30-Day Ticket Sales Revenue Analytics (USD)'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isFa
                ? 'گزارش تجمیعی فروش و استرداد بلیط بر اساس تاریخچه تراکنش‌های مالی'
                : 'Daily gross and net ticket revenue aggregated from passenger ledger transactions'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {lines.length > 0 && (
            <select
              value={corridorFilter}
              onChange={(e) => {
                setCorridorFilter(e.target.value);
                triggerChartRefresh(320);
              }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">{isFa ? 'همه خطوط ریلی' : 'All Railway Corridors'}</option>
              {lines.map((line) => (
                <option key={line.id} value={line.name_line}>
                  {localizeText(line.name_line, lang)}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
            <motion.button
              type="button"
              onClick={() => {
                if (chartMode !== 'AREA') {
                  setChartMode('AREA');
                  triggerChartRefresh(260);
                }
              }}
              {...BUTTON_HOVER_PROPS}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                chartMode === 'AREA'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {isFa ? 'نمودار مساحتی' : 'Area Trend'}
            </motion.button>
            <motion.button
              type="button"
              onClick={() => {
                if (chartMode !== 'BAR') {
                  setChartMode('BAR');
                  triggerChartRefresh(260);
                }
              }}
              {...BUTTON_HOVER_PROPS}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                chartMode === 'BAR'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {isFa ? 'نمودار ستونی' : 'Daily Bars'}
            </motion.button>
          </div>

          <motion.button
            type="button"
            data-testid="revenue-30d-refresh-btn"
            onClick={() => triggerChartRefresh(680)}
            {...BUTTON_HOVER_PROPS}
            aria-label={
              isFa ? 'همگام‌سازی مجدد نمودار ۳۰ روزه' : 'Refresh 30-day revenue chart'
            }
            title={
              isFa ? 'همگام‌سازی مجدد نمودار ۳۰ روزه' : 'Refresh 30-day revenue chart'
            }
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <RotateCcw
              className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${
                showSkeleton ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden sm:inline">
              {isFa ? 'بروزرسانی' : 'Sync'}
            </span>
          </motion.button>
        </div>
      </div>

      {/* 30-Day Financial Metrics Strip (with zero-CLS Framer Motion Skeleton) */}
      {showSkeleton ? (
        <AdminKpiStripSkeleton
          key="rev-30d-kpi-skeleton"
          variant="REVENUE_4"
          className="mb-5"
          testId="revenue-30d-kpi-skeleton"
        />
      ) : (
        <motion.div
          key="rev-30d-kpi-loaded"
          variants={revenueKpiGridVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5"
        >
            <motion.div
              variants={revenueKpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              className="rp-card-hover p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 cursor-default"
            >
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {isFa ? 'درآمد خالص ۳۰ روزه' : '30-Day Net Ticket Revenue'}
              </div>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(summary.totalNet30d, isFa ? 'Rial' : 'USD')}
              </div>
            </motion.div>

            <motion.div
              variants={revenueKpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              className="rp-card-hover p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 cursor-default"
            >
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {isFa ? 'میانگین درآمد روزانه' : 'Average Daily Revenue'}
              </div>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                {formatCurrency(summary.avgDaily, isFa ? 'Rial' : 'USD')}
              </div>
            </motion.div>

            <motion.div
              variants={revenueKpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              className="rp-card-hover p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 cursor-default"
            >
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {isFa ? 'بیشترین فروش روزانه' : 'Peak Revenue Day'}
              </div>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
                {formatCurrency(summary.peakDay.netRevenue, isFa ? 'Rial' : 'USD')}{' '}
                <span className="text-xs font-normal text-slate-400">
                  ({toPersianDigits(summary.peakDay.label, lang)})
                </span>
              </div>
            </motion.div>

            <motion.div
              variants={revenueKpiCardVariants}
              whileHover="hover"
              whileTap={{ scale: 0.985 }}
              className="rp-card-hover p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 cursor-default"
            >
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {isFa ? 'تعداد تراکنش‌های خرید بلیط' : 'Completed Ticket Orders'}
              </div>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                {formatNumber(summary.totalTxCount30d, lang)}
              </div>
            </motion.div>
          </motion.div>
        )}

      {/* Recharts 30-Day Visualization (locked h-72 w-full container to prevent CLS) */}
      <div
        className="h-72 w-full"
        dir="ltr"
        style={{
          fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
        }}
      >
        {showSkeleton ? (
          <AdminChartSkeleton
            key="rev-30d-chart-skeleton"
            heightClass="h-72"
            variant={chartMode}
            barCount={20}
            lang={lang}
            testId="revenue-30d-chart-skeleton"
          />
        ) : (
          <motion.div
            key={`rev-30d-chart-loaded-${chartMode}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'AREA' ? (
            <AreaChart
              data={dailyData}
              margin={{ top: 10, right: 16, left: 8, bottom: 0 }}
              style={{
                fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
              }}
            >
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis
                dataKey="label"
                tickFormatter={(v) => toPersianDigits(v, lang)}
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
                minTickGap={16}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v, isFa ? 'Rial' : 'USD')}
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
                width={isFa ? 120 : 85}
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
                      isFa ? 'درآمد خالص بلیط' : 'Net Ticket Revenue',
                    ];
                  }
                  if (name === 'grossRevenue') {
                    return [
                      formatCurrency(Number(value), currencyUnit),
                      isFa ? 'فروش ناخالص' : 'Gross Sales',
                    ];
                  }
                  return [formatCurrency(Number(value), currencyUnit), name];
                }}
                labelFormatter={(label) =>
                  isFa
                    ? `تاریخ: ${toPersianDigits(label, lang)}`
                    : `Date: ${label}`
                }
              />
              <Area
                type="monotone"
                dataKey="netRevenue"
                stroke="#3B82F6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#revGradient)"
              />
            </AreaChart>
          ) : (
            <BarChart
              data={dailyData}
              margin={{ top: 10, right: 16, left: 8, bottom: 0 }}
              style={{
                fontFamily: "'Vazirmatn FD', 'Vazirmatn', 'Plus Jakarta Sans', sans-serif",
                fontFeatureSettings: isFa ? '"ss01" 1, "tnum" 1' : '"ss01" 0, "tnum" 1',
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis
                dataKey="label"
                tickFormatter={(v) => toPersianDigits(v, lang)}
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
                minTickGap={16}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v, isFa ? 'Rial' : 'USD')}
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
                width={isFa ? 120 : 85}
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
                  if (name === 'netRevenue') {
                    return [
                      formatCurrency(Number(value), isFa ? 'Rial' : 'USD'),
                      isFa ? 'درآمد خالص بلیط' : 'Net Ticket Revenue',
                    ];
                  }
                  return [formatCurrency(Number(value), isFa ? 'Rial' : 'USD'), name];
                }}
                labelFormatter={(label) =>
                  isFa
                    ? `تاریخ: ${toPersianDigits(label, lang)}`
                    : `Date: ${label}`
                }
              />
              <Bar dataKey="netRevenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/70 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
          <span>
            {isFa
              ? 'بروزرسانی آنی نمودار بر اساس دفتر کل تراکنش‌های مالی سامانه'
              : 'Real-time synchronization with the platform financial transaction ledger'}
          </span>
        </div>
        <span>{isFa ? 'بازه زمانی ۳۰ روزه' : '30-Day Rolling Window'}</span>
      </div>
    </motion.div>
  );
};
