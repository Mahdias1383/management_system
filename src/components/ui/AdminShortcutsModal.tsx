import React, { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Command,
  FileSpreadsheet,
  Globe,
  Keyboard,
  Moon,
  Navigation,
  RotateCcw,
  Sun,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Language } from '../../types/domain';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import { getDefaultShortcutsCatalog } from '../../utils/commandPaletteUtils';

interface AdminShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const AdminShortcutsModal: React.FC<AdminShortcutsModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const isFa = lang === 'fa';
  const modalRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(modalRef, onClose, { enabled: isOpen });

  const catalog = getDefaultShortcutsCatalog(lang);
  const isMac =
    typeof window !== 'undefined' &&
    /mac|iphone|ipad|ipod/i.test(window.navigator.userAgent);

  const sections: {
    category: 'NAVIGATION' | 'ACTIONS' | 'REPORTS' | 'SYSTEM';
    titleFa: string;
    titleEn: string;
    icon: React.ReactNode;
  }[] = [
    {
      category: 'NAVIGATION',
      titleFa: 'جهت‌یابی و تعویض صفحات',
      titleEn: 'Screen Navigation',
      icon: <Navigation className="w-4 h-4 text-blue-500" />,
    },
    {
      category: 'REPORTS',
      titleFa: 'گزارش‌ها و ممیزی انطباق',
      titleEn: 'Reports & Audit Compliance',
      icon: <FileSpreadsheet className="w-4 h-4 text-emerald-500" />,
    },
    {
      category: 'ACTIONS',
      titleFa: 'عملیات مدیریتی و پرسنلی',
      titleEn: 'Management & Operations',
      icon: <UserPlus className="w-4 h-4 text-amber-500" />,
    },
    {
      category: 'SYSTEM',
      titleFa: 'دستورات عمومی و سامانه',
      titleEn: 'Global & System Commands',
      icon: <Command className="w-4 h-4 text-purple-500" />,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-modal-title"
          data-testid="admin-shortcuts-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150"
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            data-testid="admin-shortcuts-modal"
            dir={isFa ? 'rtl' : 'ltr'}
            className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 max-h-[88vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="shortcuts-modal-title"
                    className="text-base font-bold text-slate-900 dark:text-white"
                  >
                    {isFa ? 'کلیدهای میانبر سامانه سازمانی' : 'Admin Keyboard Shortcuts'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isFa
                      ? 'جهت‌یابی سریع میان گزارش‌ها، کارشناسان و لاگ‌های ممیزی بدون موس'
                      : 'Fast navigation across reports, staff, and audit trails without a mouse'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label={isFa ? 'بستن پنجره' : 'Close modal'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grouped Shortcuts Grid */}
            <div className="space-y-4">
              {sections.map((section) => {
                const sectionItems = catalog.filter(
                  (item) => item.category === section.category
                );
                if (sectionItems.length === 0) return null;

                return (
                  <div
                    key={section.category}
                    className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {section.icon}
                      <span>{isFa ? section.titleFa : section.titleEn}</span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {sectionItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 py-1 px-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-900/60 transition-colors"
                        >
                          <span className="text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs">
                            {isFa ? item.descriptionFa : item.descriptionEn}
                          </span>

                          <div className="flex items-center gap-1 shrink-0">
                            {item.keys.map((key, kIdx) => (
                              <React.Fragment key={kIdx}>
                                <kbd className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs">
                                  {key === 'Ctrl' && isMac
                                    ? '⌘'
                                    : key === 'Alt' && isMac
                                    ? '⌥'
                                    : key}
                                </kbd>
                                {kIdx < item.keys.length - 1 && (
                                  <span className="text-[10px] text-slate-400">
                                    {item.keys[0] === 'G' ? 'سپس' : '+'}
                                  </span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer with Pro Tip */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                {isFa
                  ? '💡 کلیدهای تک‌حرفی هنگام تایپ در فیلدهای متنی غیرفعال می‌شوند.'
                  : '💡 Single-letter shortcuts are paused while typing in text inputs.'}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors"
              >
                {isFa ? 'متوجه شدم' : 'Got it'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
