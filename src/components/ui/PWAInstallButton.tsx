import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Smartphone,
  X,
  CheckCircle2,
  Share2,
  PlusSquare,
  Sparkles,
  Sun,
  Moon,
  Layers,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import {
  computeAdaptiveSplashSpec,
  MaskableShape,
  renderAdaptiveSplashToCanvas,
  SplashTheme,
} from '../../utils/pwaSplashGenerator';

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
  const [previewSplashTheme, setPreviewSplashTheme] = useState<SplashTheme>('dark');
  const [previewMaskShape, setPreviewMaskShape] = useState<MaskableShape>('squircle');

  const iosModalRef = useRef<HTMLDivElement>(null);
  const splashCanvasRef = useRef<HTMLCanvasElement>(null);

  useOnClickOutside(iosModalRef, () => setShowIOSModal(false), { enabled: showIOSModal });

  useEffect(() => {
    if (!showIOSModal || !splashCanvasRef.current) return;
    const spec = computeAdaptiveSplashSpec({
      viewportWidth: 390,
      viewportHeight: 844,
      devicePixelRatio: 2,
      theme: previewSplashTheme,
      lang: isFa ? 'fa' : 'en',
    });
    renderAdaptiveSplashToCanvas(splashCanvasRef.current, spec);
  }, [showIOSModal, previewSplashTheme, isFa]);

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
      // Ambient fallback instructions & adaptive splash/icon preview modal
      setShowIOSModal(true);
    }
  };

  const maskRadiusClass =
    previewMaskShape === 'circle'
      ? 'rounded-full'
      : previewMaskShape === 'squircle'
      ? 'rounded-[24px]'
      : previewMaskShape === 'teardrop'
      ? 'rounded-tl-[26px] rounded-tr-[26px] rounded-bl-[26px] rounded-br-[6px]'
      : 'rounded-xl';

  return (
    <>
      <button
        type="button"
        data-testid="pwa-install-trigger-btn"
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

      {/* Native PWA Installation & Adaptive Splash / Maskable Icon Preview Modal */}
      {showIOSModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          data-testid="pwa-install-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            ref={iosModalRef}
            className="rp-modal-content w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            dir={isFa ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <img
                  src="/icons/icon-192.png"
                  alt="RailPulse High-Res App Icon"
                  className="w-9 h-9 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700/60"
                />
                <div>
                  <h3 id="pwa-install-title" className="text-sm font-bold text-slate-900 dark:text-white">
                    {isFa ? 'نصب اپلیکیشن بومی ریل‌پالس (PWA)' : 'Install RailPulse Native Web App'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isFa
                      ? 'آیکون‌های تطبیقی با وضوح 1024px و صفحه آغازین هوشمند موبایل'
                      : '1024px Adaptive Maskable Icons & Dynamic Mobile Splash Screen'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                aria-label={isFa ? 'بستن راهنما' : 'Close guide'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Adaptive Splash Screen & Maskable Icon Live Preview Card */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                  {isFa
                    ? 'پیش‌نمایش زنده صفحه آغازین و آیکون تطبیقی موبایل'
                    : 'Live Adaptive Splash & Maskable Icon Preview'}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="pwa-splash-theme-dark-btn"
                    onClick={() => setPreviewSplashTheme('dark')}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                      previewSplashTheme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Moon className="w-3 h-3" />
                    <span>{isFa ? 'تیره' : 'Dark'}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="pwa-splash-theme-light-btn"
                    onClick={() => setPreviewSplashTheme('light')}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                      previewSplashTheme === 'light'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Sun className="w-3 h-3" />
                    <span>{isFa ? 'روشن' : 'Light'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Left/Right 5 Cols: Dynamic HTML5 Canvas Mobile Splash Screen Preview */}
                <div className="sm:col-span-5 flex flex-col items-center">
                  <div className="relative w-32 h-56 rounded-2xl overflow-hidden border-2 border-slate-700/80 shadow-lg bg-slate-950">
                    <canvas
                      ref={splashCanvasRef}
                      data-testid="pwa-adaptive-splash-canvas"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1.5">
                    {isFa ? 'صفحه آغازین (۱۱۷۰×۲۵۳۲)' : 'Startup Splash (1170×2532)'}
                  </span>
                </div>

                {/* Right/Left 7 Cols: Adaptive Maskable Icon Shape Switcher & Resolution Matrix */}
                <div className="sm:col-span-7 space-y-3">
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                    <img
                      src="/icons/icon-maskable-512.png"
                      alt="Adaptive Maskable Icon"
                      data-testid="pwa-maskable-icon-preview"
                      className={`w-16 h-16 shrink-0 shadow-md border border-sky-500/30 transition-all duration-300 ${maskRadiusClass}`}
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>
                          {isFa ? 'آیکون تطبیقی (Maskable)' : 'Adaptive Maskable Icon'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {isFa
                          ? 'حاشیه امن ۱۵٪ برای نمایش بی‌نقص در لانچرهای اندروید و iOS:'
                          : '15% safe-zone padding for Android & iOS home screen masks:'}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(
                          [
                            { id: 'squircle', labelFa: 'اسکوئیرکل', labelEn: 'Squircle' },
                            { id: 'circle', labelFa: 'دایره', labelEn: 'Circle' },
                            { id: 'rounded-square', labelFa: 'مربع نرم', labelEn: 'Square' },
                            { id: 'teardrop', labelFa: 'قطره‌ای', labelEn: 'Teardrop' },
                          ] as const
                        ).map((shape) => (
                          <button
                            key={shape.id}
                            type="button"
                            onClick={() => setPreviewMaskShape(shape.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                              previewMaskShape === shape.id
                                ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {isFa ? shape.labelFa : shape.labelEn}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Resolution Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    {['72px', '96px', '128px', '144px', '152px', '180px', '192px', '384px', '512px', '1024px'].map(
                      (res) => (
                        <span
                          key={res}
                          className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300"
                        >
                          {res}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {isFa ? '۱' : '1'}
                </div>
                <div className="flex-1 text-slate-700 dark:text-slate-300">
                  <span className="font-semibold flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 inline" />
                    {isFa ? 'دکمه اشتراک‌گذاری یا نصب مرورگر' : 'Tap the Share or Install button'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {isFa
                      ? 'در نوار ابزار مرورگر موبایل خود روی آیکون اشتراک‌گذاری (Safari) یا نصب برنامه (Chrome) بزنید.'
                      : 'In your mobile browser toolbar, tap Share (iOS Safari) or Install App (Android Chrome).'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50">
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
                      ? 'اپلیکیشن با آیکون تمام‌وضوح و صفحه آغازین بومی روی گوشی شما نصب می‌شود.'
                      : 'RailPulse launches full-screen with its adaptive splash screen and native home-screen icon.'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
            >
              {isFa ? 'متوجه شدم' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
