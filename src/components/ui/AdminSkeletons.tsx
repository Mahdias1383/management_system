import React from 'react';
import { motion } from 'framer-motion';
import { Language } from '../../types/domain';
import {
  skeletonBarGrowVariants,
  skeletonPulseVariants,
  skeletonRowVariants,
  skeletonStaggerContainerVariants,
} from './motionPrimitives';

export type AdminChartSkeletonVariant = 'AREA' | 'BAR' | 'LINE';
export type AdminTableSkeletonVariant = 'AUDIT_LOGS' | 'STAFF_DIRECTORY';
export type AdminKpiSkeletonVariant =
  | 'EXECUTIVE_5'
  | 'REVENUE_4'
  | 'REVENUE_3'
  | 'AUDIT_4';

export interface ChartSkeletonBarPoint {
  index: number;
  primaryHeightPct: number;
  secondaryHeightPct: number;
  showAxisTick: boolean;
}

export interface TableSkeletonColumnSpec {
  key: string;
  align: 'start' | 'center' | 'end';
  primaryWidthClass: string;
  secondaryWidthClass?: string;
  isCheckbox?: boolean;
  isBadge?: boolean;
  isAction?: boolean;
}

export interface TableSkeletonSpec {
  variant: AdminTableSkeletonVariant;
  rowCount: number;
  columnCount: number;
  rowHeightClass: string;
  columns: TableSkeletonColumnSpec[];
}

/**
 * Pure deterministic generator for chart skeleton bar/wave heights.
 * Ensures zero random layout jitter across renders while providing a natural
 * financial time-series silhouette.
 */
export function computeChartSkeletonBars(
  barCount: number = 16,
  variant: AdminChartSkeletonVariant = 'AREA'
): ChartSkeletonBarPoint[] {
  const safeCount = Math.max(6, Math.min(Math.floor(barCount) || 16, 32));
  const basePattern = [
    42, 54, 48, 66, 61, 74, 58, 82, 70, 88, 76, 64, 79, 91, 73, 85,
  ];
  const tickInterval = Math.max(2, Math.floor(safeCount / 6));

  const points: ChartSkeletonBarPoint[] = [];
  for (let i = 0; i < safeCount; i++) {
    const rawPrimary = basePattern[i % basePattern.length];
    const primaryHeightPct =
      variant === 'LINE'
        ? Math.max(35, Math.min(86, rawPrimary - 4))
        : rawPrimary;
    const secondaryHeightPct = Math.max(
      22,
      Math.round(primaryHeightPct * (variant === 'AREA' ? 0.68 : 0.58))
    );
    points.push({
      index: i,
      primaryHeightPct,
      secondaryHeightPct,
      showAxisTick: i % tickInterval === 0 || i === safeCount - 1,
    });
  }
  return points;
}

/**
 * Pure deterministic specification for Admin data table skeleton rows & columns.
 * Guarantees exact column count and row height parity with loaded tables to prevent CLS.
 */
export function computeTableSkeletonSpec(
  variant: AdminTableSkeletonVariant,
  requestedRows: number = 6
): TableSkeletonSpec {
  const rowCount = Math.max(1, Math.min(Math.floor(requestedRows) || 6, 20));

  if (variant === 'STAFF_DIRECTORY') {
    const columns: TableSkeletonColumnSpec[] = [
      {
        key: 'fullName',
        align: 'start',
        primaryWidthClass: 'w-24',
        secondaryWidthClass: 'w-28',
      },
      {
        key: 'credentials',
        align: 'start',
        primaryWidthClass: 'w-20',
        secondaryWidthClass: 'w-28',
      },
      {
        key: 'department',
        align: 'start',
        primaryWidthClass: 'w-28',
      },
      {
        key: 'status',
        align: 'start',
        primaryWidthClass: 'w-14',
        isBadge: true,
      },
      {
        key: 'actions',
        align: 'end',
        primaryWidthClass: 'w-14',
        isAction: true,
      },
    ];
    return {
      variant,
      rowCount,
      columnCount: columns.length,
      rowHeightClass: 'h-[61px]',
      columns,
    };
  }

  // Default: AUDIT_LOGS (6 columns matching Activity Monitor table)
  const columns: TableSkeletonColumnSpec[] = [
    {
      key: 'select',
      align: 'center',
      primaryWidthClass: 'w-4',
      isCheckbox: true,
    },
    {
      key: 'timestamp',
      align: 'start',
      primaryWidthClass: 'w-32',
    },
    {
      key: 'actor',
      align: 'start',
      primaryWidthClass: 'w-24',
      secondaryWidthClass: 'w-16',
    },
    {
      key: 'categoryAction',
      align: 'start',
      primaryWidthClass: 'w-36',
      isBadge: true,
    },
    {
      key: 'description',
      align: 'start',
      primaryWidthClass: 'w-full max-w-[320px]',
      secondaryWidthClass: 'w-3/5 max-w-[200px]',
    },
    {
      key: 'inspect',
      align: 'end',
      primaryWidthClass: 'w-16',
      isAction: true,
    },
  ];

  return {
    variant: 'AUDIT_LOGS',
    rowCount,
    columnCount: columns.length,
    rowHeightClass: 'h-[53px]',
    columns,
  };
}

/**
 * Pure deterministic layout configuration for Admin KPI card strips.
 */
export function computeKpiSkeletonConfig(variant: AdminKpiSkeletonVariant): {
  cardCount: number;
  gridClass: string;
  compact: boolean;
} {
  switch (variant) {
    case 'EXECUTIVE_5':
      return {
        cardCount: 5,
        gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4',
        compact: false,
      };
    case 'AUDIT_4':
      return {
        cardCount: 4,
        gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
        compact: false,
      };
    case 'REVENUE_3':
      return {
        cardCount: 3,
        gridClass: 'grid grid-cols-3 gap-3 text-xs',
        compact: true,
      };
    case 'REVENUE_4':
    default:
      return {
        cardCount: 4,
        gridClass: 'grid grid-cols-2 sm:grid-cols-4 gap-3',
        compact: true,
      };
  }
}

interface AdminKpiStripSkeletonProps {
  variant: AdminKpiSkeletonVariant;
  className?: string;
  testId?: string;
}

export const AdminKpiStripSkeleton: React.FC<AdminKpiStripSkeletonProps> = ({
  variant,
  className = '',
  testId = 'admin-kpi-skeleton',
}) => {
  const { cardCount, gridClass, compact } = computeKpiSkeletonConfig(variant);

  return (
    <motion.div
      data-testid={testId}
      aria-busy="true"
      variants={skeletonStaggerContainerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`${gridClass} ${className}`.trim()}
    >
      {Array.from({ length: cardCount }).map((_, idx) => (
        <motion.div
          key={`kpi-skel-${variant}-${idx}`}
          custom={idx}
          variants={skeletonRowVariants}
          className={
            compact
              ? 'overflow-hidden p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800'
              : 'overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs'
          }
        >
          {compact ? (
            <div className="space-y-2">
              <motion.div
                variants={skeletonPulseVariants}
                initial="initial"
                animate="animate"
                className="h-3 w-3/4 max-w-[92px] rounded bg-slate-200 dark:bg-slate-700/75"
              />
              <motion.div
                variants={skeletonPulseVariants}
                initial="initial"
                animate="animate"
                className="h-5 w-4/5 max-w-[112px] rounded bg-slate-300 dark:bg-slate-600/75"
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <motion.div
                  variants={skeletonPulseVariants}
                  initial="initial"
                  animate="animate"
                  className="h-3.5 w-2/3 max-w-[120px] rounded bg-slate-200 dark:bg-slate-700/75"
                />
                <motion.div
                  variants={skeletonPulseVariants}
                  initial="initial"
                  animate="animate"
                  className="h-7 w-7 shrink-0 rounded-lg bg-blue-500/15 dark:bg-blue-400/15"
                />
              </div>
              <motion.div
                variants={skeletonPulseVariants}
                initial="initial"
                animate="animate"
                className="h-7 w-1/2 max-w-[96px] rounded-md bg-slate-300 dark:bg-slate-600/80"
              />
              <motion.div
                variants={skeletonPulseVariants}
                initial="initial"
                animate="animate"
                className="h-3 w-4/5 max-w-[148px] rounded bg-slate-200 dark:bg-slate-800 mt-2"
              />
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
};

interface AdminChartSkeletonProps {
  heightClass?: 'h-72' | 'h-80' | string;
  variant?: AdminChartSkeletonVariant;
  barCount?: number;
  lang: Language;
  testId?: string;
}

export const AdminChartSkeleton: React.FC<AdminChartSkeletonProps> = ({
  heightClass = 'h-72',
  variant = 'AREA',
  barCount = 16,
  lang,
  testId = 'admin-chart-skeleton',
}) => {
  const isFa = lang === 'fa';
  const bars = React.useMemo(
    () => computeChartSkeletonBars(barCount, variant),
    [barCount, variant]
  );

  return (
    <motion.div
      data-testid={testId}
      role="status"
      aria-busy="true"
      aria-label={
        isFa
          ? 'در حال بارگذاری و همگام‌سازی نمودار تحلیلی'
          : 'Loading analytics chart visualization'
      }
      variants={skeletonStaggerContainerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      dir="ltr"
      className={`${heightClass} w-full relative overflow-hidden rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 p-4 flex flex-col justify-between select-none`}
    >
      {/* Subtle Top Status Pill */}
      <div className="flex items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-2">
          <motion.span
            variants={skeletonPulseVariants}
            initial="initial"
            animate="animate"
            className="inline-block w-2 h-2 rounded-full bg-blue-500"
          />
          <span
            dir={isFa ? 'rtl' : 'ltr'}
            className="text-[11px] font-medium text-slate-500 dark:text-slate-400"
          >
            {isFa
              ? 'در حال واکشی و ترسیم داده‌های سری زمانی...'
              : 'Synchronizing time-series telemetry...'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            variants={skeletonPulseVariants}
            initial="initial"
            animate="animate"
            className="h-2.5 w-16 rounded bg-slate-200 dark:bg-slate-700/75"
          />
          <motion.div
            variants={skeletonPulseVariants}
            initial="initial"
            animate="animate"
            className="h-2.5 w-14 rounded bg-slate-200 dark:bg-slate-700/75"
          />
        </div>
      </div>

      {/* Main Plot Area: Y-Axis Ticks + Gridlines + Animated Framer Motion Bars */}
      <div className="relative flex-1 flex items-stretch gap-3 my-2">
        {/* Simulated Y-Axis Column */}
        <div className="w-16 sm:w-20 flex flex-col justify-between py-1 shrink-0">
          {[0, 1, 2, 3].map((tick) => (
            <motion.div
              key={`y-tick-${tick}`}
              variants={skeletonPulseVariants}
              initial="initial"
              animate="animate"
              className="h-2.5 w-14 sm:w-16 rounded bg-slate-200 dark:bg-slate-700/75"
            />
          ))}
        </div>

        {/* Plot Canvas with Dashed Gridlines & Animated Series */}
        <div className="relative flex-1 flex items-end gap-1.5 sm:gap-2 pt-3 pb-1 px-2 border-b border-l border-slate-200 dark:border-slate-800">
          {/* Dashed Horizontal Gridlines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-2">
            {[0, 1, 2, 3].map((lineIdx) => (
              <div
                key={`grid-line-${lineIdx}`}
                className="w-full border-t border-dashed border-slate-200/80 dark:border-slate-800/80"
              />
            ))}
          </div>

          {/* Animated Series Silhouette */}
          {bars.map((bar) => (
            <div
              key={`chart-skel-bar-${bar.index}`}
              className="relative flex-1 h-full flex flex-col justify-end items-center z-10"
            >
              <motion.div
                custom={bar.index}
                variants={skeletonBarGrowVariants}
                initial="initial"
                animate="animate"
                style={{
                  height: `${bar.primaryHeightPct}%`,
                  transformOrigin: 'bottom',
                }}
                className={`w-full rounded-t-md ${
                  variant === 'AREA'
                    ? 'bg-gradient-to-t from-blue-500/20 via-blue-500/35 to-emerald-500/45 dark:from-blue-500/15 dark:via-blue-500/30 dark:to-emerald-400/45 border-t-2 border-blue-500/60'
                    : variant === 'LINE'
                    ? 'bg-gradient-to-t from-transparent via-emerald-500/20 to-emerald-500/40 border-t-2 border-emerald-500/70'
                    : 'bg-blue-500/35 dark:bg-blue-500/30 border border-blue-500/40'
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Simulated X-Axis Labels */}
      <div className="flex items-center justify-between ps-20 pe-2">
        {bars
          .filter((b) => b.showAxisTick)
          .map((tick) => (
            <motion.div
              key={`x-tick-${tick.index}`}
              variants={skeletonPulseVariants}
              initial="initial"
              animate="animate"
              className="h-2.5 w-10 sm:w-12 rounded bg-slate-200 dark:bg-slate-700/75"
            />
          ))}
      </div>
    </motion.div>
  );
};

interface AdminTableSkeletonRowsProps {
  variant: AdminTableSkeletonVariant;
  rowCount?: number;
  lang: Language;
  testId?: string;
}

export const AdminTableSkeletonRows: React.FC<AdminTableSkeletonRowsProps> = ({
  variant,
  rowCount = 6,
  lang,
  testId = 'admin-table-skeleton',
}) => {
  const isFa = lang === 'fa';
  const spec = React.useMemo(
    () => computeTableSkeletonSpec(variant, rowCount),
    [variant, rowCount]
  );

  return (
    <>
      {Array.from({ length: spec.rowCount }).map((_, rowIdx) => (
        <motion.tr
          key={`table-skel-${variant}-row-${rowIdx}`}
          data-testid={rowIdx === 0 ? testId : `${testId}-row-${rowIdx}`}
          custom={rowIdx}
          variants={skeletonRowVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          aria-busy="true"
          aria-label={
            rowIdx === 0
              ? isFa
                ? 'در حال بارگذاری ردیف‌های جدول'
                : 'Loading table rows'
              : undefined
          }
          className={`${spec.rowHeightClass} border-b border-slate-200/70 dark:border-slate-800/70`}
        >
          {spec.columns.map((col) => {
            const alignClass =
              col.align === 'center'
                ? 'text-center'
                : col.align === 'end'
                ? 'text-end'
                : 'text-start';

            return (
              <td
                key={`table-skel-${variant}-${rowIdx}-${col.key}`}
                className={`py-3 px-3 ${alignClass} align-middle`}
              >
                {col.isCheckbox ? (
                  <div className="inline-flex items-center justify-center">
                    <motion.div
                      variants={skeletonPulseVariants}
                      initial="initial"
                      animate="animate"
                      className="w-4 h-4 rounded bg-slate-300 dark:bg-slate-700/85"
                    />
                  </div>
                ) : col.isBadge ? (
                  <div className="inline-flex items-center gap-1.5">
                    <motion.div
                      variants={skeletonPulseVariants}
                      initial="initial"
                      animate="animate"
                      className={`h-5 ${col.primaryWidthClass} rounded-md bg-slate-200 dark:bg-slate-700/80`}
                    />
                  </div>
                ) : col.isAction ? (
                  <div className="inline-flex items-center justify-end gap-1.5 ms-auto">
                    <motion.div
                      variants={skeletonPulseVariants}
                      initial="initial"
                      animate="animate"
                      className={`h-6 ${col.primaryWidthClass} rounded-lg bg-slate-200 dark:bg-slate-700/80`}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <motion.div
                      variants={skeletonPulseVariants}
                      initial="initial"
                      animate="animate"
                      className={`h-3.5 ${col.primaryWidthClass} rounded bg-slate-200 dark:bg-slate-700/80`}
                    />
                    {col.secondaryWidthClass && (
                      <motion.div
                        variants={skeletonPulseVariants}
                        initial="initial"
                        animate="animate"
                        className={`h-2.5 ${col.secondaryWidthClass} rounded bg-slate-200/75 dark:bg-slate-800`}
                      />
                    )}
                  </div>
                )}
              </td>
            );
          })}
        </motion.tr>
      ))}
    </>
  );
};
