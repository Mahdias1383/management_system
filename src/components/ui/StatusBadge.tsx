import React from 'react';

interface StatusBadgeProps {
  tone?: 'emerald' | 'blue' | 'amber' | 'red' | 'slate';
  children: React.ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  emerald:
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  amber:
    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  slate:
    'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  tone = 'slate',
  children,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-semibold ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
};
