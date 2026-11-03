import React, { useRef, useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

interface PWAInstallButtonProps {
  isFa?: boolean;
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  isFa = true,
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const iosModalRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(iosModalRef, () => setShowIOSModal(false), { enabled: showIOSModal });

  // If already running in standalone PWA mode, suppress the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setJustInstalled(true);
        setTimeout(() => setJustInstalled(false), 4000);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Ambient fallback instructions if browser hasn't fired beforeinstallprompt yet
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        aria-label={isFa ? 'نصب برنامه ریل‌پالس روی دستگاه' : 'Install RailPulse App'}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 border cursor-pointer ${
          justInstalled
            ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-blue-600/10 hover:bg-blue-600/20 border-blue-500/20 text-blue-700 dark:text-blue-300 hover:border-blue-500/40'
        } ${className}`}
      >
        {justInstalled ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span>{isFa ? 'برنامه نصب شد' : 'Installed'}</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>
              {variant === 'full'
                ? isFa
                  ? 'نصب وب‌اپلیکیشن ریل‌پالس'
                  : 'Install RailPulse PWA'
                : isFa
                ? 'نصب اپلیکیشن'
                : 'Install App'}
            </span>
          </>
        )}
      </button>

      {/* iOS Safari / Fallback Installation Guidance Modal */}
      {showIOSModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            ref={iosModalRef}
            className="rp-modal-content w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            dir={isFa ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 id="pwa-install-title" className="text-sm font-bold text-slate-900 dark:text-white">
                  {isFa ? 'نصب سریع اپلیکیشن ریل‌پالس' : 'Install RailPulse App'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                aria-label={isFa ? 'بستن راهنما' : 'Close guide'}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isFa
                ? 'با نصب وب‌اپلیکیشن ریل‌پالس، بدون نیاز به اپ‌استور می‌توانید مانند یک نرم‌افزار بومی به سامانه رزرواسیون، نقشه صندلی‌ها و کارت‌های سوارشدن دیجیتال دسترسی داشته باشید:'
                : 'Install RailPulse as a Progressive Web App for instant access to high-speed train booking, real-time dispatch radar, and offline tickets:'}
            </p>

            <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {isFa ? '۱' : '1'}
                </div>
                <div className="flex-1 text-slate-700 dark:text-slate-300">
                  <span className="font-semibold flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 inline" />
                    {isFa ? 'دکمه اشتراک‌گذاری مرورگر' : 'Tap the Share button'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {isFa
                      ? 'در نوار ابزار مرورگر خود روی آیکون اشتراک‌گذاری بزنید.'
                      : 'In the browser toolbar (bottom on iOS Safari, or top address bar on Chrome).'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {isFa ? '۲' : '2'}
                </div>
                <div className="flex-1 text-slate-700 dark:text-slate-300">
                  <span className="font-semibold flex items-center gap-1">
                    <PlusSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 inline" />
                    {isFa ? 'افزودن به صفحه اصلی دستگاه' : 'Select Add to Home Screen'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {isFa
                      ? 'گزینه افزودن به صفحه اصلی را انتخاب کرده و تأیید نمایید.'
                      : 'Choose "Add to Home Screen" and tap "Add" in the top corner.'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-colors"
            >
              {isFa ? 'متوجه شدم' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
