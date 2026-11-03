import React, { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { Language } from '../../types/domain';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

export interface ToastNotificationItem {
  id: number;
  msgEn: string;
  msgFa: string;
  type: 'success' | 'error';
}

interface ToastNotificationBannerProps {
  toast: ToastNotificationItem | null;
  lang: Language;
  onDismiss?: () => void;
}

export const ToastNotificationBanner: React.FC<ToastNotificationBannerProps> = ({
  toast,
  lang,
  onDismiss,
}) => {
  const isFa = lang === 'fa';
  const toastRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(
    toastRef,
    () => {
      if (onDismiss) onDismiss();
    },
    { enabled: Boolean(toast && onDismiss) }
  );

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          ref={toastRef}
          key={toast.id}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-5 end-5 z-50 max-w-md bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white border border-slate-700/80 rounded-xl px-4 py-3.5 shadow-2xl flex items-center gap-3 text-xs"
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="leading-relaxed flex-1">
            {isFa ? toast.msgFa : toast.msgEn}
          </span>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label={isFa ? 'بستن اعلان' : 'Dismiss notification'}
              className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

