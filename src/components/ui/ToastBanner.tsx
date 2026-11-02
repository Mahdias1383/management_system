import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Language } from '../../types/domain';

export interface ToastNotificationItem {
  id: number;
  msgEn: string;
  msgFa: string;
  type: 'success' | 'error';
}

interface ToastBannerProps {
  toast: ToastNotificationItem | null;
  lang: Language;
}

export const ToastBanner: React.FC<ToastBannerProps> = ({ toast, lang }) => {
  const isFa = lang === 'fa';

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
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
          <span className="leading-relaxed">
            {isFa ? toast.msgFa : toast.msgEn}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
