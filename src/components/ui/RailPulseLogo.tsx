import React from 'react';
import { Language } from '../../types/domain';

interface RailPulseLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'lockup';
  lang?: Language;
  className?: string;
  showBadge?: boolean;
}

/**
 * RailPulse Enterprise Modern SVG Logo
 * 
 * Incorporates:
 * 1. Aerodynamic high-speed bullet train profile cutting forward
 * 2. Pulse waveform & radar frequency rays (telemetry & collision prevention)
 * 3. Parallel high-speed railway tracks converging in perspective
 * 4. Dual-mode support (light / dark) with luminous modern gradients
 */
export const RailPulseLogo: React.FC<RailPulseLogoProps> = ({
  size = 'md',
  variant = 'full',
  lang = 'fa',
  className = '',
  showBadge = true,
}) => {
  const isFa = lang === 'fa';

  const sizeDimensions = {
    sm: { icon: 28, text: 'text-sm', badge: 'text-[9px] px-1.5 py-0.5' },
    md: { icon: 36, text: 'text-base', badge: 'text-[10px] px-2 py-0.5' },
    lg: { icon: 44, text: 'text-lg', badge: 'text-[11px] px-2.5 py-0.5' },
    xl: { icon: 56, text: 'text-2xl', badge: 'text-xs px-3 py-1' },
  }[size];

  const dim = sizeDimensions.icon;

  const logoSvg = (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-300 hover:scale-105"
      role="img"
      aria-label="RailPulse Enterprise Logo"
    >
      <defs>
        {/* Aerodynamic Train Nose Gradient */}
        <linearGradient id="rpTrainGrad" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="35%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>

        {/* Pulse Telemetry Beam Gradient */}
        <linearGradient id="rpPulseGrad" x1="14" y1="18" x2="44" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="60%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>

        {/* Dual Converging Tracks Gradient */}
        <linearGradient id="rpTrackGrad" x1="10" y1="38" x2="38" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#64748B" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.3" />
        </linearGradient>

        {/* Luminous Glow Filter */}
        <filter id="rpGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Rounded Hexagonal / Squircle Emblem Base */}
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="12"
        className="fill-slate-900 dark:fill-slate-950 stroke-slate-800 dark:stroke-slate-800/80"
        strokeWidth="1.5"
      />

      {/* Background Subtle Velocity Grid Lines */}
      <path
        d="M6 36L42 36M12 41L36 41"
        stroke="url(#rpTrackGrad)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />

      {/* Converging High-Speed Railway Perspective Tracks */}
      <path
        d="M10 44L20 30M38 44L28 30"
        stroke="#475569"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M14 40L34 40M17 35L31 35M20 30L28 30"
        stroke="#64748B"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* High-Speed Bullet Train Aerodynamic Front Profile */}
      <path
        d="M24 8C19 8 15 13 15 19V30C15 32.2 16.8 34 19 34H29C31.2 34 33 32.2 33 30V19C33 13 29 8 24 8Z"
        fill="url(#rpTrainGrad)"
      />

      {/* Panoramic Train Windshield (Aerodynamic Cockpit Glass) */}
      <path
        d="M18 17C18 14 20.5 12 24 12C27.5 12 30 14 30 17V21H18V17Z"
        fill="#0F172A"
        stroke="#38BDF8"
        strokeWidth="0.8"
      />

      {/* High-Speed Cockpit Glare Reflection */}
      <path
        d="M20 14.5C21.5 13.5 23 13.2 24.5 13.2"
        stroke="#BAE6FD"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Dual Modern High-Beam Headlights */}
      <circle cx="18.5" cy="28.5" r="1.75" fill="#38BDF8" filter="url(#rpGlow)" />
      <circle cx="29.5" cy="28.5" r="1.75" fill="#38BDF8" filter="url(#rpGlow)" />

      {/* Forward Cowcatcher / Kinetic Pilot Nose */}
      <path
        d="M21 32H27L28 34.5H20L21 32Z"
        fill="#0284C7"
      />

      {/* Dynamic Telemetry "Pulse" Waveform Frequency Cutting Right/Left */}
      <path
        d="M4 22H11L14 16L18 28L21 20L24 22H44"
        stroke="url(#rpPulseGrad)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#rpGlow)"
        opacity="0.9"
      />

      {/* Luminous Center Signal Node (Collision Radar Ping) */}
      <circle cx="24" cy="22" r="2" fill="#10B981" />
      <circle cx="24" cy="22" r="3.5" stroke="#10B981" strokeWidth="0.75" opacity="0.6" className="animate-ping" />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{logoSvg}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {logoSvg}

      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`font-black tracking-tight leading-none text-slate-900 dark:text-white ${sizeDimensions.text}`}
          >
            <span className="font-extrabold tracking-tight">Rail</span>
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 bg-clip-text text-transparent font-black">
              Pulse
            </span>
          </span>

          {showBadge && (
            <span
              className={`rounded-md font-mono font-bold uppercase tracking-wider bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 ${sizeDimensions.badge}`}
            >
              Enterprise
            </span>
          )}
        </div>

        {variant === 'lockup' && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
            {isFa
              ? 'سامانه هوشمند خطوط ریلی و ناوبری'
              : 'Intelligent Railway Network OS'}
          </span>
        )}
      </div>
    </div>
  );
};
