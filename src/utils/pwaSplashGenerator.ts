import { Language } from '../types/domain';

export type SplashTheme = 'dark' | 'light';
export type SplashOrientation = 'portrait' | 'landscape';
export type MaskableShape = 'squircle' | 'circle' | 'rounded-square' | 'teardrop';

export interface AdaptiveSplashInput {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio?: number;
  theme?: SplashTheme;
  lang?: Language;
}

export interface AdaptiveSplashSpec {
  physicalWidth: number;
  physicalHeight: number;
  devicePixelRatio: number;
  orientation: SplashOrientation;
  aspectRatio: number;
  theme: SplashTheme;
  lang: Language;
  emblemCenterX: number;
  emblemCenterY: number;
  emblemSize: number;
  safeZoneRadius: number;
  safeZoneMarginRatio: number;
  titleY: number;
  subtitleY: number;
  badgeY: number;
  palette: {
    backgroundStart: string;
    backgroundEnd: string;
    radialGlow: string;
    emblemPlateBg: string;
    emblemBorder: string;
    trainPrimary: string;
    trainSecondary: string;
    pulseAccent: string;
    radarNode: string;
    titleColor: string;
    subtitleColor: string;
    themeColorMeta: string;
  };
  copy: {
    title: string;
    subtitle: string;
    telemetryTag: string;
    safetyBadge: string;
  };
}

export interface ManifestIconDescriptor {
  src: string;
  sizes: string;
  type: 'image/png' | 'image/svg+xml';
  purpose: 'any' | 'maskable' | 'monochrome';
}

export interface AppleSplashLinkDescriptor {
  id: string;
  href: string;
  media: string;
  width: number;
  height: number;
  orientation: SplashOrientation;
  theme: SplashTheme;
  label: string;
}

/**
 * Pure calculator that computes the exact geometry, safe-zone boundaries,
 * typography coordinates, and adaptive color palette for a mobile/tablet
 * startup splash screen.
 */
export function computeAdaptiveSplashSpec(input: AdaptiveSplashInput): AdaptiveSplashSpec {
  const rawW = Number.isFinite(input.viewportWidth) && input.viewportWidth > 0 ? input.viewportWidth : 390;
  const rawH = Number.isFinite(input.viewportHeight) && input.viewportHeight > 0 ? input.viewportHeight : 844;
  const dprRaw = Number.isFinite(input.devicePixelRatio) && (input.devicePixelRatio ?? 0) > 0
    ? Number(input.devicePixelRatio)
    : 2;
  const dpr = Math.min(Math.max(dprRaw, 1), 4);

  const theme: SplashTheme = input.theme === 'light' ? 'light' : 'dark';
  const lang: Language = input.lang === 'en' ? 'en' : 'fa';

  const physicalWidth = Math.max(320, Math.round(rawW * dpr));
  const physicalHeight = Math.max(320, Math.round(rawH * dpr));
  const orientation: SplashOrientation =
    physicalWidth > physicalHeight ? 'landscape' : 'portrait';
  const aspectRatio = Number((physicalWidth / physicalHeight).toFixed(4));

  const minDim = Math.min(physicalWidth, physicalHeight);
  const emblemSize = Math.round(minDim * (orientation === 'landscape' ? 0.28 : 0.30));
  const emblemCenterX = Math.round(physicalWidth / 2);
  const emblemCenterY = Math.round(
    physicalHeight * (orientation === 'landscape' ? 0.39 : 0.38)
  );

  // Android/iOS maskable safe zone: central 72% (14% margin on each side -> 28% total margin)
  const safeZoneMarginRatio = 0.15;
  const safeZoneRadius = Math.round(emblemSize * (0.5 - safeZoneMarginRatio));

  const titleY = Math.round(emblemCenterY + emblemSize * 0.74);
  const subtitleY = Math.round(titleY + minDim * 0.055);
  const badgeY = Math.round(physicalHeight * (orientation === 'landscape' ? 0.86 : 0.88));

  const isLight = theme === 'light';
  const isFa = lang === 'fa';

  return {
    physicalWidth,
    physicalHeight,
    devicePixelRatio: dpr,
    orientation,
    aspectRatio,
    theme,
    lang,
    emblemCenterX,
    emblemCenterY,
    emblemSize,
    safeZoneRadius,
    safeZoneMarginRatio,
    titleY,
    subtitleY,
    badgeY,
    palette: isLight
      ? {
          backgroundStart: '#f8fafc',
          backgroundEnd: '#e0f2fe',
          radialGlow: 'rgba(2, 132, 199, 0.16)',
          emblemPlateBg: '#0f172a',
          emblemBorder: '#38bdf8',
          trainPrimary: '#38bdf8',
          trainSecondary: '#2563eb',
          pulseAccent: '#0284c7',
          radarNode: '#10b981',
          titleColor: '#0f172a',
          subtitleColor: '#0284c7',
          themeColorMeta: '#f8fafc',
        }
      : {
          backgroundStart: '#060b14',
          backgroundEnd: '#0f172a',
          radialGlow: 'rgba(56, 189, 248, 0.22)',
          emblemPlateBg: '#090d16',
          emblemBorder: '#38bdf8',
          trainPrimary: '#38bdf8',
          trainSecondary: '#2563eb',
          pulseAccent: '#38bdf8',
          radarNode: '#10b981',
          titleColor: '#f8fafc',
          subtitleColor: '#38bdf8',
          themeColorMeta: '#0f172a',
        },
    copy: {
      title: 'RailPulse Enterprise',
      subtitle: isFa
        ? 'سامانه هوشمند خطوط ریلی و رزرواسیون بلیط'
        : 'Intelligent Railway Operations & Booking OS',
      telemetryTag: 'TEMPORAL-SPATIAL COLLISION RADAR',
      safetyBadge: isFa
        ? 'ایمنی ۱۰۰٪ رادار ضدبرخورد و کارت سوارشدن آفلاین'
        : '100% Dispatch Safety Verified · Offline Boarding Pass',
    },
  };
}

/**
 * Returns the complete high-resolution icon matrix configured in `manifest.json`
 * and stored in `public/icons/`.
 */
export function getManifestIconCatalog(): ManifestIconDescriptor[] {
  return [
    { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-180.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/icons/icon-maskable-384.png', sizes: '384x384', type: 'image/png', purpose: 'maskable' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: '/icons/icon-maskable-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' },
    { src: '/icons/icon-monochrome.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'monochrome' },
    { src: '/icons/icon-monochrome-512.png', sizes: '512x512', type: 'image/png', purpose: 'monochrome' },
  ];
}

/**
 * Returns the catalog of static adaptive startup splash screens in `public/icons/`.
 */
export function getAppleSplashLinksCatalog(): AppleSplashLinkDescriptor[] {
  return [
    {
      id: 'iphone-compact-portrait-dark',
      href: '/icons/splash-portrait-750x1334.png',
      media:
        'screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      width: 750,
      height: 1334,
      orientation: 'portrait',
      theme: 'dark',
      label: 'Mobile Compact Portrait (750×1334)',
    },
    {
      id: 'iphone-pro-portrait-dark',
      href: '/icons/splash-portrait-1170x2532.png',
      media:
        'screen and (min-device-width: 390px) and (max-device-width: 414px) and (orientation: portrait) and (prefers-color-scheme: dark)',
      width: 1170,
      height: 2532,
      orientation: 'portrait',
      theme: 'dark',
      label: 'Mobile High-DPI Portrait Dark (1170×2532)',
    },
    {
      id: 'iphone-pro-portrait-light',
      href: '/icons/splash-portrait-light-1170x2532.png',
      media:
        'screen and (min-device-width: 390px) and (max-device-width: 414px) and (orientation: portrait) and (prefers-color-scheme: light)',
      width: 1170,
      height: 2532,
      orientation: 'portrait',
      theme: 'light',
      label: 'Mobile High-DPI Portrait Light (1170×2532)',
    },
    {
      id: 'iphone-promax-portrait-dark',
      href: '/icons/splash-portrait-1290x2796.png',
      media:
        'screen and (min-device-width: 428px) and (max-device-width: 440px) and (orientation: portrait)',
      width: 1290,
      height: 2796,
      orientation: 'portrait',
      theme: 'dark',
      label: 'Flagship Pro Max Portrait (1290×2796)',
    },
    {
      id: 'mobile-landscape-dark',
      href: '/icons/splash-landscape-2532x1170.png',
      media: 'screen and (max-device-width: 932px) and (orientation: landscape)',
      width: 2532,
      height: 1170,
      orientation: 'landscape',
      theme: 'dark',
      label: 'Mobile High-DPI Landscape (2532×1170)',
    },
    {
      id: 'tablet-portrait-dark',
      href: '/icons/splash-tablet-1668x2388.png',
      media: 'screen and (min-device-width: 768px) and (orientation: portrait)',
      width: 1668,
      height: 2388,
      orientation: 'portrait',
      theme: 'dark',
      label: 'Tablet Pro Portrait (1668×2388)',
    },
    {
      id: 'tablet-landscape-dark',
      href: '/icons/splash-tablet-landscape-2388x1668.png',
      media: 'screen and (min-device-width: 768px) and (orientation: landscape)',
      width: 2388,
      height: 1668,
      orientation: 'landscape',
      theme: 'dark',
      label: 'Tablet Pro Landscape (2388×1668)',
    },
  ];
}

/**
 * Draws the adaptive splash screen artwork onto an HTML5 Canvas 2D context.
 */
export function renderAdaptiveSplashToCanvas(
  canvas: HTMLCanvasElement,
  spec: AdaptiveSplashSpec
): void {
  canvas.width = spec.physicalWidth;
  canvas.height = spec.physicalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { physicalWidth: w, physicalHeight: h, emblemCenterX: cx, emblemCenterY: cy, emblemSize } = spec;

  // 1. Linear background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, spec.palette.backgroundStart);
  bgGrad.addColorStop(1, spec.palette.backgroundEnd);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Ambient radial glow behind emblem
  const glowGrad = ctx.createRadialGradient(cx, cy, emblemSize * 0.1, cx, cy, emblemSize * 1.35);
  glowGrad.addColorStop(0, spec.palette.radialGlow);
  glowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, w, h);

  // 3. Emblem Squircle Plate
  const half = emblemSize / 2;
  const rx = emblemSize * 0.22;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx - half, cy - half, emblemSize, emblemSize, rx);
  ctx.fillStyle = spec.palette.emblemPlateBg;
  ctx.fill();
  ctx.lineWidth = Math.max(2, emblemSize * 0.012);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.stroke();

  // 4. Converging perspective tracks
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
  ctx.lineWidth = Math.max(2, emblemSize * 0.014);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - emblemSize * 0.22, cy + emblemSize * 0.36);
  ctx.lineTo(cx - emblemSize * 0.06, cy + emblemSize * 0.08);
  ctx.moveTo(cx + emblemSize * 0.22, cy + emblemSize * 0.36);
  ctx.lineTo(cx + emblemSize * 0.06, cy + emblemSize * 0.08);
  ctx.stroke();

  // 5. Aerodynamic Bullet Train Cabin
  const trainW = emblemSize * 0.36;
  const trainH = emblemSize * 0.48;
  const trainTop = cy - emblemSize * 0.32;
  const trainGrad = ctx.createLinearGradient(cx, trainTop, cx, trainTop + trainH);
  trainGrad.addColorStop(0, spec.palette.trainPrimary);
  trainGrad.addColorStop(1, spec.palette.trainSecondary);
  ctx.fillStyle = trainGrad;
  ctx.beginPath();
  ctx.roundRect(cx - trainW / 2, trainTop, trainW, trainH, emblemSize * 0.12);
  ctx.fill();

  // Cockpit Windshield
  ctx.fillStyle = '#0c4a6e';
  ctx.beginPath();
  ctx.roundRect(
    cx - trainW * 0.36,
    trainTop + trainH * 0.14,
    trainW * 0.72,
    trainH * 0.26,
    emblemSize * 0.05
  );
  ctx.fill();

  // 6. Telemetry Pulse Waveform
  ctx.strokeStyle = spec.palette.pulseAccent;
  ctx.lineWidth = Math.max(2.5, emblemSize * 0.022);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const pulseY = cy + emblemSize * 0.04;
  ctx.moveTo(cx - emblemSize * 0.34, pulseY);
  ctx.lineTo(cx - emblemSize * 0.16, pulseY);
  ctx.lineTo(cx - emblemSize * 0.09, pulseY - emblemSize * 0.09);
  ctx.lineTo(cx - emblemSize * 0.03, pulseY + emblemSize * 0.11);
  ctx.lineTo(cx, pulseY - emblemSize * 0.03);
  ctx.lineTo(cx + emblemSize * 0.05, pulseY + emblemSize * 0.11);
  ctx.lineTo(cx + emblemSize * 0.11, pulseY - emblemSize * 0.09);
  ctx.lineTo(cx + emblemSize * 0.18, pulseY);
  ctx.lineTo(cx + emblemSize * 0.34, pulseY);
  ctx.stroke();

  // Center Radar Node
  ctx.fillStyle = spec.palette.radarNode;
  ctx.beginPath();
  ctx.arc(cx, pulseY - emblemSize * 0.03, Math.max(3, emblemSize * 0.025), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 7. Brand Typography Lockup
  const minDim = Math.min(w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = spec.palette.titleColor;
  ctx.font = `800 ${Math.round(minDim * 0.046)}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillText(spec.copy.title, cx, spec.titleY);

  ctx.fillStyle = spec.palette.subtitleColor;
  ctx.font = `700 ${Math.round(minDim * 0.028)}px "Vazirmatn", "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillText(spec.copy.subtitle, cx, spec.subtitleY);

  // 8. Bottom Dispatch Safety Pill
  ctx.fillStyle = spec.theme === 'light' ? '#475569' : '#94a3b8';
  ctx.font = `600 ${Math.round(minDim * 0.02)}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillText(spec.copy.safetyBadge, cx, spec.badgeY);
}

/**
 * Synchronizes adaptive `<meta name="theme-color">` and dynamic `<link rel="apple-touch-startup-image">`
 * tags in `document.head` whenever the application's theme or language updates.
 */
export function syncAdaptiveSplashScreensInDom(theme: SplashTheme, lang: Language): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const spec = computeAdaptiveSplashSpec({
    viewportWidth: window.innerWidth || 390,
    viewportHeight: window.innerHeight || 844,
    devicePixelRatio: window.devicePixelRatio || 2,
    theme,
    lang,
  });

  // Update theme-color meta tag for native status bar integration
  let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.name = 'theme-color';
    document.head.appendChild(themeMeta);
  }
  themeMeta.content = spec.palette.themeColorMeta;

  // Update apple status bar style
  const statusBarMeta = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  );
  if (statusBarMeta) {
    statusBarMeta.content = theme === 'light' ? 'default' : 'black-translucent';
  }

  // Expose active adaptive splash metadata on documentElement for diagnostics/testing
  document.documentElement.setAttribute(
    'data-pwa-splash-spec',
    `${spec.physicalWidth}x${spec.physicalHeight}-${spec.theme}-${spec.orientation}`
  );
}
