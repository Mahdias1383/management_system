import React from 'react';
import { motion } from 'framer-motion';

export interface KpiStatCardProps {
  label: string;
  value: React.ReactNode;
  sublabel?: React.ReactNode;
  icon?: React.ReactNode;
  valueClassName?: string;
  delay?: number;
}

export const KpiStatCard: React.FC<KpiStatCardProps> = ({
  label,
  value,
  sublabel,
  icon,
  valueClassName = 'text-2xl font-bold font-mono text-slate-900 dark:text-slate-100',
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24, delay }}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.99 }}
      className="rp-card-hover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs"
    >
      <div className="flex items-center justify-between text-slate-400 mb-2">
        <span className="text-xs font-medium">{label}</span>
        {icon}
      </div>
      <div className={valueClassName}>{value}</div>
      {sublabel && <div className="text-[11px] text-slate-500 mt-1">{sublabel}</div>}
    </motion.div>
  );
};
