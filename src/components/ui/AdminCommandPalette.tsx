import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCheck,
  Command,
  CornerDownLeft,
  Download,
  FileCode2,
  FileSpreadsheet,
  Filter,
  Globe,
  Keyboard,
  Moon,
  PlayCircle,
  RotateCcw,
  Search,
  ShieldCheck,
  Sun,
  Ticket,
  Train,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Language } from '../../types/domain';
import {
  CommandCategory,
  CommandIconName,
  CommandItem,
} from '../../types/shortcuts';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import {
  filterCommands,
  formatShortcutForPlatform,
  getCategoryLabel,
} from '../../utils/commandPaletteUtils';

interface AdminCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
  lang: Language;
  onOpenShortcutsHelp?: () => void;
}

const renderCommandIcon = (iconName: CommandIconName, className: string = 'w-4 h-4') => {
  switch (iconName) {
    case 'BarChart3':
      return <BarChart3 className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'Activity':
      return <Activity className={className} />;
    case 'BellRing':
      return <BellRing className={className} />;
    case 'FileCode2':
      return <FileCode2 className={className} />;
    case 'FileSpreadsheet':
      return <FileSpreadsheet className={className} />;
    case 'Download':
      return <Download className={className} />;
    case 'RotateCcw':
      return <RotateCcw className={className} />;
    case 'UserPlus':
      return <UserPlus className={className} />;
    case 'Ticket':
      return <Ticket className={className} />;
    case 'Train':
      return <Train className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'PlayCircle':
      return <PlayCircle className={className} />;
    case 'Globe':
      return <Globe className={className} />;
    case 'Sun':
      return <Sun className={className} />;
    case 'Moon':
      return <Moon className={className} />;
    case 'Keyboard':
      return <Keyboard className={className} />;
    case 'TrendingUp':
      return <TrendingUp className={className} />;
    case 'CheckCheck':
      return <CheckCheck className={className} />;
    case 'Filter':
      return <Filter className={className} />;
    case 'Search':
    default:
      return <Search className={className} />;
  }
};

export const AdminCommandPalette: React.FC<AdminCommandPaletteProps> = ({
  isOpen,
  onClose,
  commands,
  lang,
  onOpenShortcutsHelp,
}) => {
  const isFa = lang === 'fa';
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CommandCategory>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(containerRef, onClose, { enabled: isOpen });

  // Reset state whenever palette opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveCategory('ALL');
      setSelectedIndex(0);
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const filteredItems = useMemo(
    () => filterCommands(commands, query, activeCategory, lang),
    [commands, query, activeCategory, lang]
  );

  // Keep selected index in bounds
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (filteredItems.length === 0) return 0;
      if (prev >= filteredItems.length) return filteredItems.length - 1;
      return prev < 0 ? 0 : prev;
    });
  }, [filteredItems]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(
      `[data-command-index="${selectedIndex}"]`
    );
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const executeItem = (item: CommandItem) => {
    onClose();
    // Run action on next tick so modal dismiss animation doesn't jitter
    window.setTimeout(() => {
      item.action();
    }, 60);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredItems.length === 0 ? 0 : (prev + 1) % filteredItems.length
      );
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredItems.length === 0
          ? 0
          : (prev - 1 + filteredItems.length) % filteredItems.length
      );
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredItems[selectedIndex];
      if (item) {
        executeItem(item);
      }
    }
  };

  const isMac =
    typeof window !== 'undefined' &&
    /mac|iphone|ipad|ipod/i.test(window.navigator.userAgent);

  const categories: { id: CommandCategory; label: string }[] = [
    { id: 'ALL', label: isFa ? 'همه' : 'All' },
    { id: 'NAVIGATION', label: isFa ? 'صفحات' : 'Screens' },
    { id: 'ACTIONS', label: isFa ? 'عملیات' : 'Actions' },
    { id: 'REPORTS', label: isFa ? 'گزارش‌ها' : 'Reports' },
    { id: 'SYSTEM', label: isFa ? 'سامانه' : 'System' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isFa ? 'پالت دستورات سازمانی' : 'Enterprise Command Palette'}
          data-testid="admin-command-palette-backdrop"
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150"
        >
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            data-testid="admin-command-palette-modal"
            dir={isFa ? 'rtl' : 'ltr'}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
            onKeyDown={handleKeyDown}
          >
            {/* Top Search Input Bar */}
            <div className="relative flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 gap-3 shrink-0">
              <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  isFa
                    ? 'جستجو در گزارش‌ها، کارشناسان، لاگ‌ها، دستورات یا جهت‌یابی...'
                    : 'Search reports, staff, audit logs, commands or navigation...'
                }
                data-testid="command-palette-input"
                className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title={isFa ? 'پاک کردن جستجو' : 'Clear search'}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="flex items-center gap-1.5 shrink-0">
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Category Filter Chips Bar */}
            <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/70 dark:border-slate-800/80 overflow-x-auto shrink-0 text-xs">
              {categories.map((cat) => {
                const isSelected = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setSelectedIndex(0);
                      inputRef.current?.focus();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Scrollable Command Items List */}
            <div
              ref={listRef}
              data-testid="command-palette-results"
              className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/50"
            >
              {filteredItems.length === 0 ? (
                <div className="py-12 px-6 text-center space-y-2">
                  <Command className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {isFa
                      ? `هیچ دستوری با «${query}» یافت نشد.`
                      : `No commands found matching "${query}".`}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isFa
                      ? 'می‌توانید عنوان گزارش‌ها، نام کارشناس، کلمات کلیدی یا لاگ‌ها را جستجو کنید.'
                      : 'Try searching for report names, staff members, audit keywords, or navigation.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setActiveCategory('ALL');
                      inputRef.current?.focus();
                    }}
                    className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {isFa ? 'پاک کردن فیلترها' : 'Clear search filters'}
                  </button>
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      data-command-index={idx}
                      data-testid={`command-item-${item.id}`}
                      onClick={() => executeItem(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`group flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-start cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {renderCommandIcon(item.iconName, 'w-4 h-4')}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold truncate">
                              {isFa ? item.titleFa : item.titleEn}
                            </span>
                            {item.badge && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                                  isSelected
                                    ? 'bg-white/25 text-white'
                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[11px] truncate mt-0.5 ${
                              isSelected
                                ? 'text-blue-100'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {isFa ? item.descriptionFa : item.descriptionEn}
                          </p>
                        </div>
                      </div>

                      {/* Right Shortcut Badge / Execute Arrow */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.shortcut && item.shortcut.length > 0 && (
                          <div className="flex items-center gap-1">
                            {item.shortcut.map((key) => (
                              <kbd
                                key={key}
                                className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded ${
                                  isSelected
                                    ? 'bg-white/25 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {key === 'Ctrl' && isMac ? '⌘' : key === 'Alt' && isMac ? '⌥' : key}
                              </kbd>
                            ))}
                          </div>
                        )}

                        <CornerDownLeft
                          className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                            isSelected ? 'opacity-100 text-white' : 'text-slate-400'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Keyboard Navigation Cues & Shortcuts Link */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-mono text-[10px]">
                    ↑↓
                  </kbd>{' '}
                  {isFa ? 'پیمایش' : 'Navigate'}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-mono text-[10px]">
                    ↵
                  </kbd>{' '}
                  {isFa ? 'انتخاب' : 'Select'}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-mono text-[10px]">
                    ESC
                  </kbd>{' '}
                  {isFa ? 'بستن' : 'Close'}
                </span>
              </div>

              {onOpenShortcutsHelp && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenShortcutsHelp();
                  }}
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>{isFa ? 'راهنمای کلیدهای میانبر (?)' : 'Shortcuts Guide (?)'}</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
