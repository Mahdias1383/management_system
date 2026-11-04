import { describe, expect, it } from 'vitest';
import {
  computeChartSkeletonBars,
  computeKpiSkeletonConfig,
  computeTableSkeletonSpec,
} from '../AdminSkeletons';

describe('AdminSkeletons pure geometry & CLS-prevention calculations', () => {
  it('generates deterministic chart skeleton bars within safe percentage bounds', () => {
    const areaBars = computeChartSkeletonBars(16, 'AREA');
    const areaBarsRepeat = computeChartSkeletonBars(16, 'AREA');

    expect(areaBars).toHaveLength(16);
    expect(areaBars).toEqual(areaBarsRepeat);
    areaBars.forEach((bar, idx) => {
      expect(bar.index).toBe(idx);
      expect(bar.primaryHeightPct).toBeGreaterThanOrEqual(28);
      expect(bar.primaryHeightPct).toBeLessThanOrEqual(95);
      expect(bar.secondaryHeightPct).toBeGreaterThanOrEqual(20);
      expect(bar.secondaryHeightPct).toBeLessThan(bar.primaryHeightPct);
    });
    expect(areaBars[0].showAxisTick).toBe(true);
    expect(areaBars[areaBars.length - 1].showAxisTick).toBe(true);
  });

  it('clamps out-of-range chart skeleton bar counts safely', () => {
    expect(computeChartSkeletonBars(2, 'BAR')).toHaveLength(6);
    expect(computeChartSkeletonBars(100, 'LINE')).toHaveLength(32);
  });

  it('produces exact 6-column specification for Activity Monitor AUDIT_LOGS table', () => {
    const auditSpec = computeTableSkeletonSpec('AUDIT_LOGS', 8);
    expect(auditSpec.variant).toBe('AUDIT_LOGS');
    expect(auditSpec.rowCount).toBe(8);
    expect(auditSpec.columnCount).toBe(6);
    expect(auditSpec.rowHeightClass).toBe('h-[53px]');
    expect(auditSpec.columns[0].isCheckbox).toBe(true);
    expect(auditSpec.columns[3].isBadge).toBe(true);
    expect(auditSpec.columns[5].isAction).toBe(true);
  });

  it('produces exact 5-column specification for Operations STAFF_DIRECTORY table', () => {
    const staffSpec = computeTableSkeletonSpec('STAFF_DIRECTORY', 4);
    expect(staffSpec.variant).toBe('STAFF_DIRECTORY');
    expect(staffSpec.rowCount).toBe(4);
    expect(staffSpec.columnCount).toBe(5);
    expect(staffSpec.rowHeightClass).toBe('h-[61px]');
    expect(staffSpec.columns[3].isBadge).toBe(true);
    expect(staffSpec.columns[4].isAction).toBe(true);
  });

  it('computes accurate KPI card counts and responsive grid classes', () => {
    expect(computeKpiSkeletonConfig('EXECUTIVE_5')).toEqual({
      cardCount: 5,
      gridClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4',
      compact: false,
    });
    expect(computeKpiSkeletonConfig('AUDIT_4').cardCount).toBe(4);
    expect(computeKpiSkeletonConfig('REVENUE_4').cardCount).toBe(4);
    expect(computeKpiSkeletonConfig('REVENUE_3').cardCount).toBe(3);
  });
});
