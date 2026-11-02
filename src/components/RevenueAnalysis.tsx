import React, { useMemo, useState } from 'react';
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
import { BarChart3, TrendingUp } from 'lucide-react';
import { Language, TicketRecord, TrainLine, WalletTransaction } from '../types/domain';
import { formatCompactRial, formatRial } from '../services/authService';

interface RevenueAnalysisProps {
  transactions: WalletTransaction[];
  tickets?: TicketRecord[];
  lines?: TrainLine[];
  lang: Language;
}

export interface DailyRevenuePoint {
  dateKey: string;
  label: string;
  grossRevenue: number;
  refundedAmount: number;
  netRevenue: number;
  transactionCount: number;
}

export const RevenueAnalysis: React.FC<RevenueAnalysisProps> = ({
  transactions,
  lines = [],
  lang,
}) => {
  const isFa = lang === 'fa';
  const [chartMode, setChartMode] = useState<'AREA' | 'BAR'>('AREA');
  const [corridorFilter, setCorridorFilter] = useState<string>('ALL');

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
      const shortLabel = `${mm}/${dd}`;

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
  }, [transactions, corridorFilter]);

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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {isFa
                ? 'تحلیل ۳۰ روزه درآمد فروش بلیط در شبکه ریلی (ریال)'
                : '30-Day Ticket Sales Revenue Analytics (IRR)'}
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
              onChange={(e) => setCorridorFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">{isFa ? 'همه خطوط ریلی' : 'All Railway Corridors'}</option>
              {lines.map((line) => (
                <option key={line.id} value={line.name_line}>
                  {line.name_line}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setChartMode('AREA')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                chartMode === 'AREA'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {isFa ? 'نمودار مساحتی' : 'Area Trend'}
            </button>
            <button
              type="button"
              onClick={() => setChartMode('BAR')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                chartMode === 'BAR'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {isFa ? 'نمودار ستونی' : 'Daily Bars'}
            </button>
          </div>
        </div>
      </div>

      {/* 30-Day Financial Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {isFa ? 'درآمد خالص ۳۰ روزه' : '30-Day Net Ticket Revenue'}
          </div>
          <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatRial(summary.totalNet30d, lang)}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {isFa ? 'میانگین درآمد روزانه' : 'Average Daily Revenue'}
          </div>
          <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
            {formatRial(summary.avgDaily, lang)}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {isFa ? 'بیشترین فروش روزانه' : 'Peak Revenue Day'}
          </div>
          <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
            {formatRial(summary.peakDay.netRevenue, lang)}{' '}
            <span className="text-xs font-normal text-slate-400">({summary.peakDay.label})</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {isFa ? 'تعداد تراکنش‌های خرید بلیط' : 'Completed Ticket Orders'}
          </div>
          <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
            {summary.totalTxCount30d}
          </div>
        </div>
      </div>

      {/* Recharts 30-Day Visualization */}
      <div className="h-72 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'AREA' ? (
            <AreaChart data={dailyData} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'JetBrains Mono, Vazirmatn, monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#475569', opacity: 0.4 }}
                minTickGap={16}
              />
              <YAxis
                tickFormatter={(v) => formatCompactRial(v, lang)}
                tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'JetBrains Mono, Vazirmatn, monospace' }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#1E293B',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#F8FAFC',
                  fontFamily: 'JetBrains Mono, Vazirmatn, monospace',
                }}
                formatter={(value: any, name: any) => {
                  if (name === 'netRevenue') {
                    return [formatRial(Number(value), lang), isFa ? 'درآمد خالص بلیط' : 'Net Ticket Revenue'];
                  }
                  if (name === 'grossRevenue') {
                    return [formatRial(Number(value), lang), isFa ? 'فروش ناخالص' : 'Gross Sales'];
                  }
                  return [value, name];
                }}
                labelFormatter={(label) => (isFa ? `تاریخ: ${label}` : `Date: ${label}`)}
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
            <BarChart data={dailyData} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'JetBrains Mono, Vazirmatn, monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#475569', opacity: 0.4 }}
                minTickGap={16}
              />
              <YAxis
                tickFormatter={(v) => formatCompactRial(v, lang)}
                tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'JetBrains Mono, Vazirmatn, monospace' }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#1E293B',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#F8FAFC',
                  fontFamily: 'JetBrains Mono, Vazirmatn, monospace',
                }}
                formatter={(value: any, name: any) => {
                  if (name === 'netRevenue') {
                    return [formatRial(Number(value), lang), isFa ? 'درآمد خالص بلیط' : 'Net Ticket Revenue'];
                  }
                  return [value, name];
                }}
                labelFormatter={(label) => (isFa ? `تاریخ: ${label}` : `Date: ${label}`)}
              />
              <Bar dataKey="netRevenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
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
    </div>
  );
};
