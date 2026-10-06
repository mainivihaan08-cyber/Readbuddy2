import React, { useState, useEffect } from 'react';
import { getAppSettings } from '../services/storage';

export type BuddyMood = 'idle' | 'greeting' | 'cheering' | 'encouraging';

export interface BuddyMascotProps {
  mood?: BuddyMood;
  speechText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  bubblePosition?: 'top' | 'right' | 'left' | 'bottom';
  showSpeechBubble?: boolean;
  accessory?: string;
}

export const BuddyMascot: React.FC<BuddyMascotProps> = ({
  mood = 'idle',
  speechText,
  size = 'md',
  className = '',
  onClick,
  bubblePosition = 'right',
  showSpeechBubble = true,
  accessory,
}) => {
  const [animationsEnabled, setAnimationsEnabled] = useState(() => getAppSettings().animationsEnabled);

  useEffect(() => {
    const handleUpdate = () => {
      setAnimationsEnabled(getAppSettings().animationsEnabled);
    };
    window.addEventListener('readbuddy_settings_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('readbuddy_settings_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Size mappings (in pixels / classes)
  const sizeMap = {
    sm: { width: 56, height: 56, bubbleText: 'text-[11px]' },
    md: { width: 84, height: 84, bubbleText: 'text-xs' },
    lg: { width: 112, height: 112, bubbleText: 'text-xs' },
    xl: { width: 140, height: 140, bubbleText: 'text-sm' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const isAnimated = animationsEnabled;

  return (
    <div
      className={`inline-flex items-center gap-2.5 relative select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
      role="img"
      aria-label={`Buddy the robot mascot (${mood})`}
    >
      {/* Robot SVG Container */}
      <div
        className={`relative shrink-0 ${
          isAnimated
            ? mood === 'cheering'
              ? 'buddy-cheer-anim'
              : 'buddy-float-anim'
            : ''
        }`}
        style={{ width: currentSize.width, height: currentSize.height }}
      >
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full overflow-visible drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Body metallic gradient */}
            <linearGradient id="buddyBodyGrad" x1="20" y1="20" x2="100" y2="110" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>

            {/* Cyan Accent Gradient */}
            <linearGradient id="buddyCyanGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            {/* Dark Visor Face Screen */}
            <linearGradient id="buddyVisorGrad" x1="30" y1="30" x2="90" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>

            {/* Golden Star Eye Glow */}
            <linearGradient id="buddyGoldGrad" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* Soft Shadow Filter */}
            <filter id="buddyGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Hover Shadow underneath Buddy */}
          <ellipse
            cx="60"
            cy="114"
            rx="22"
            ry="4.5"
            fill="#312e81"
            opacity="0.18"
            className={isAnimated ? 'buddy-shadow-anim' : ''}
          />

          {/* --- ANTENNA --- */}
          <g>
            {/* Antenna Stalk */}
            <line
              x1="60"
              y1="14"
              x2="60"
              y2="27"
              stroke="#94a3b8"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Small Antenna Base Mount */}
            <rect x="56" y="24" width="8" height="3" rx="1.5" fill="#64748b" />

            {/* Antenna Glowing Bulb */}
            <circle
              cx="60"
              cy="12"
              r="5.5"
              fill={mood === 'cheering' ? '#f59e0b' : '#38bdf8'}
              className={isAnimated ? 'buddy-antenna-pulse' : ''}
            />
            <circle
              cx="60"
              cy="12"
              r="2"
              fill="#ffffff"
            />
          </g>

          {/* --- HEADPHONES / EAR BOLTS --- */}
          {/* Left Ear Node */}
          <rect x="23" y="40" width="7" height="15" rx="3.5" fill="#475569" />
          <rect x="24" y="42" width="5" height="11" rx="2.5" fill="#38bdf8" opacity="0.8" />
          {/* Right Ear Node */}
          <rect x="90" y="40" width="7" height="15" rx="3.5" fill="#475569" />
          <rect x="91" y="42" width="5" height="11" rx="2.5" fill="#38bdf8" opacity="0.8" />

          {/* --- ROBOT HEAD --- */}
          <rect
            x="27"
            y="26"
            width="66"
            height="44"
            rx="16"
            fill="url(#buddyBodyGrad)"
            stroke="#c7d2fe"
            strokeWidth="1.5"
          />

          {/* Visor / Face Screen */}
          <rect
            x="33"
            y="32"
            width="54"
            height="32"
            rx="11"
            fill="url(#buddyVisorGrad)"
            stroke="#1e293b"
            strokeWidth="1"
          />

          {/* Visor Glass Reflection Accent */}
          <path
            d="M38 35 Q55 35 68 39"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.3"
          />

          {/* --- EYES & EXPRESSION --- */}
          {mood === 'cheering' ? (
            /* Cheering Eyes: Happy Golden Stars ★ ★ */
            <g className={isAnimated ? 'buddy-star-eyes' : ''}>
              {/* Left Star Eye */}
              <path
                d="M47 43 L48.5 46.5 L52 47 L49.5 49.5 L50 53 L47 51 L44 53 L44.5 49.5 L42 47 L45.5 46.5 Z"
                fill="url(#buddyGoldGrad)"
                filter="url(#buddyGlow)"
              />
              {/* Right Star Eye */}
              <path
                d="M73 43 L74.5 46.5 L78 47 L75.5 49.5 L76 53 L73 51 L70 53 L70.5 49.5 L68 47 L71.5 46.5 Z"
                fill="url(#buddyGoldGrad)"
                filter="url(#buddyGlow)"
              />
              {/* Cheerful Joyful Open Smile */}
              <path
                d="M52 52 Q60 60 68 52"
                stroke="#fde047"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Rosy Friendly Cheeks */}
              <circle cx="41" cy="53" r="3" fill="#f43f5e" opacity="0.35" />
              <circle cx="79" cy="53" r="3" fill="#f43f5e" opacity="0.35" />
            </g>
          ) : mood === 'encouraging' ? (
            /* Encouraging Expression: Warm bright friendly gaze with enthusiastic smile */
            <g>
              {/* Left Eye: Luminous round glowing eye */}
              <circle
                cx="47"
                cy="46"
                r="5"
                fill="#38bdf8"
                className={isAnimated ? 'buddy-eye-blink' : ''}
              />
              <circle cx="45.5" cy="44.5" r="1.5" fill="#ffffff" />

              {/* Right Eye: Warm smiling curved wink or big eye */}
              <path
                d="M68 46 Q73 40 78 46"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />

              {/* Warm encouraging curved smile */}
              <path
                d="M53 52 Q60 57 67 52"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />

              {/* Friendly Cheeks */}
              <circle cx="41" cy="52" r="2.5" fill="#38bdf8" opacity="0.3" />
              <circle cx="79" cy="52" r="2.5" fill="#38bdf8" opacity="0.3" />
            </g>
          ) : (
            /* Idle & Greeting: Friendly glowing cyan eyes with periodic blink & curve smile */
            <g>
              {/* Left Eye */}
              <g className={isAnimated ? 'buddy-eye-blink' : ''}>
                <circle cx="47" cy="46" r="5" fill="#38bdf8" />
                <circle cx="45.5" cy="44.5" r="1.5" fill="#ffffff" />
              </g>

              {/* Right Eye */}
              <g className={isAnimated ? 'buddy-eye-blink' : ''}>
                <circle cx="73" cy="46" r="5" fill="#38bdf8" />
                <circle cx="71.5" cy="44.5" r="1.5" fill="#ffffff" />
              </g>

              {/* Friendly gentle digital smile */}
              <path
                d="M54 52 Q60 56.5 66 52"
                stroke="#38bdf8"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />

              {/* Gentle Cheeks */}
              <circle cx="41" cy="52" r="2.5" fill="#38bdf8" opacity="0.25" />
              <circle cx="79" cy="52" r="2.5" fill="#38bdf8" opacity="0.25" />
            </g>
          )}

          {/* --- NECK CONNECTOR --- */}
          <rect x="54" y="69" width="12" height="4" rx="2" fill="#475569" />

          {/* --- ROBOT TORSO / BODY --- */}
          <rect
            x="36"
            y="72"
            width="48"
            height="33"
            rx="13"
            fill="url(#buddyBodyGrad)"
            stroke="#c7d2fe"
            strokeWidth="1.5"
          />

          {/* Chest Center Badge: Speech Sound Wave Indicator */}
          <rect x="48" y="78" width="24" height="15" rx="5" fill="#1e1b4b" stroke="#312e81" strokeWidth="0.8" />
          <g>
            <rect x="52" y="83" width="2" height="5" rx="1" fill="#38bdf8" />
            <rect x="56" y="81" width="2" height="9" rx="1" fill={mood === 'cheering' ? '#f59e0b' : '#38bdf8'} />
            <rect x="60" y="80" width="2" height="11" rx="1" fill="#22c55e" />
            <rect x="64" y="81" width="2" height="9" rx="1" fill={mood === 'cheering' ? '#f59e0b' : '#38bdf8'} />
            <rect x="68" y="83" width="2" height="5" rx="1" fill="#38bdf8" />
          </g>

          {/* Torso Soft Highlights */}
          <circle cx="42" cy="78" r="1.5" fill="#ffffff" opacity="0.4" />

          {/* --- ARMS --- */}
          {mood === 'cheering' ? (
            /* Cheering Arms: Both arms lifted high up in the air celebrating! */
            <g className={isAnimated ? 'buddy-arms-cheer' : ''}>
              {/* Left Arm Raised */}
              <path
                d="M36 78 C25 65 20 54 22 47 C24 43 30 46 31 52 C32 60 40 73 40 76 Z"
                fill="url(#buddyBodyGrad)"
                stroke="#c7d2fe"
                strokeWidth="1"
              />
              <circle cx="23" cy="46" r="4.5" fill="#38bdf8" />

              {/* Right Arm Raised */}
              <path
                d="M84 78 C95 65 100 54 98 47 C96 43 90 46 89 52 C88 60 80 73 80 76 Z"
                fill="url(#buddyBodyGrad)"
                stroke="#c7d2fe"
                strokeWidth="1"
              />
              <circle cx="97" cy="46" r="4.5" fill="#38bdf8" />
            </g>
          ) : mood === 'greeting' ? (
            /* Greeting Arms: Left arm waving enthusiastically back and forth! */
            <g>
              {/* Waving Arm (Left) */}
              <g className={isAnimated ? 'buddy-waving-arm' : ''} style={{ transformOrigin: '35px 76px' }}>
                <path
                  d="M36 76 C26 68 18 56 22 47 C24 43 30 46 29 53 C28 62 38 72 38 75 Z"
                  fill="url(#buddyBodyGrad)"
                  stroke="#c7d2fe"
                  strokeWidth="1"
                />
                {/* Hand Palm with Friendly Wave */}
                <circle cx="22" cy="46" r="5" fill="#38bdf8" />
                <path d="M19 45 L15 41" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                <path d="M22 43 L21 38" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                <path d="M25 44 L27 39" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
              </g>

              {/* Right Arm (Resting at side) */}
              <rect x="84" y="76" width="9" height="18" rx="4.5" fill="url(#buddyBodyGrad)" stroke="#c7d2fe" strokeWidth="1" />
              <circle cx="88.5" cy="94" r="4.5" fill="#38bdf8" />
            </g>
          ) : mood === 'encouraging' ? (
            /* Encouraging Arms: Left arm giving a clear, positive thumbs-up! */
            <g>
              {/* Left Arm with Thumbs-Up */}
              <g>
                <path
                  d="M36 76 C28 73 22 70 20 64 C19 59 25 58 27 63 C29 67 36 73 37 75 Z"
                  fill="url(#buddyBodyGrad)"
                  stroke="#c7d2fe"
                  strokeWidth="1"
                />
                {/* Friendly Hand with Thumb Up */}
                <circle cx="21" cy="62" r="5" fill="#38bdf8" />
                {/* Thumb Up sticking straight up */}
                <path d="M21 62 L21 54" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                {/* Sparkle of encouragement */}
                <circle cx="21" cy="51" r="1.5" fill="#facc15" />
              </g>

              {/* Right Arm (Supportive resting) */}
              <rect x="84" y="76" width="9" height="18" rx="4.5" fill="url(#buddyBodyGrad)" stroke="#c7d2fe" strokeWidth="1" />
              <circle cx="88.5" cy="94" r="4.5" fill="#38bdf8" />
            </g>
          ) : (
            /* Idle Arms: Rested gently at sides */
            <g>
              {/* Left Arm */}
              <rect x="27" y="76" width="9" height="18" rx="4.5" fill="url(#buddyBodyGrad)" stroke="#c7d2fe" strokeWidth="1" />
              <circle cx="31.5" cy="94" r="4.5" fill="#38bdf8" />

              {/* Right Arm */}
              <rect x="84" y="76" width="9" height="18" rx="4.5" fill="url(#buddyBodyGrad)" stroke="#c7d2fe" strokeWidth="1" />
              <circle cx="88.5" cy="94" r="4.5" fill="#38bdf8" />
            </g>
          )}

          {/* --- FEET / HOVER THRUSTERS --- */}
          <g>
            {/* Left Foot */}
            <rect x="43" y="103" width="12" height="7" rx="3.5" fill="#475569" />
            <circle cx="49" cy="107" r="2" fill="#38bdf8" opacity="0.9" />

            {/* Right Foot */}
            <rect x="65" y="103" width="12" height="7" rx="3.5" fill="#475569" />
            <circle cx="71" cy="107" r="2" fill="#38bdf8" opacity="0.9" />
          </g>

          {/* --- CUSTOMIZABLE ACCESSORIES --- */}
          {accessory === 'antenna' && (
            <g className="animate-pulse">
              <polygon points="60,2 62.5,8 68,8.5 64,12.5 65.5,18 60,15 54.5,18 56,12.5 52,8.5 57.5,8" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1" />
              <circle cx="60" cy="10" r="2" fill="#FFFFFF" />
            </g>
          )}

          {accessory === 'glasses' && (
            <g>
              <rect x="36" y="38" width="22" height="13" rx="4" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.5" />
              <rect x="62" y="38" width="22" height="13" rx="4" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.5" />
              <line x1="58" y1="43" x2="62" y2="43" stroke="#F59E0B" strokeWidth="2" />
              <path d="M38 41 L50 41" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
              <path d="M64 41 L76 41" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            </g>
          )}

          {accessory === 'cape' && (
            <g>
              <path d="M28 68 L10 108 L42 103 L31 72 Z" fill="#EF4444" opacity="0.9" />
              <path d="M92 68 L110 108 L78 103 L89 72 Z" fill="#DC2626" opacity="0.9" />
            </g>
          )}

          {accessory === 'crown' && (
            <g>
              <path d="M42 26 L42 12 L51 20 L60 8 L69 20 L78 12 L78 26 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
              <circle cx="42" cy="12" r="2" fill="#EF4444" />
              <circle cx="60" cy="8" r="2.5" fill="#3B82F6" />
              <circle cx="78" cy="12" r="2" fill="#10B981" />
            </g>
          )}
        </svg>
      </div>

      {/* --- SPEECH BUBBLE --- */}
      {showSpeechBubble && speechText && (
        <div
          className={`relative z-10 max-w-xs rounded-2xl p-2.5 sm:p-3 shadow-md border ${
            mood === 'cheering'
              ? 'bg-amber-50/95 border-amber-200 text-amber-950'
              : mood === 'encouraging'
              ? 'bg-indigo-50/95 border-indigo-200 text-indigo-950'
              : 'bg-white border-slate-200 text-slate-800'
          } ${currentSize.bubbleText} font-bold leading-snug animate-in fade-in zoom-in-95 duration-200`}
        >
          {/* Subtle speech tail pointing towards Buddy */}
          <div
            className={`absolute w-2.5 h-2.5 rotate-45 border ${
              mood === 'cheering'
                ? 'bg-amber-50 border-amber-200'
                : mood === 'encouraging'
                ? 'bg-indigo-50 border-indigo-200'
                : 'bg-white border-slate-200'
            } ${
              bubblePosition === 'right'
                ? '-left-1.5 top-1/2 -translate-y-1/2 border-t-0 border-r-0'
                : bubblePosition === 'left'
                ? '-right-1.5 top-1/2 -translate-y-1/2 border-b-0 border-l-0'
                : bubblePosition === 'top'
                ? '-bottom-1.5 left-1/2 -translate-x-1/2 border-l-0 border-t-0'
                : '-top-1.5 left-1/2 -translate-x-1/2 border-r-0 border-b-0'
            }`}
          />
          <div className="relative z-10 flex items-center gap-1.5">
            <span>{speechText}</span>
          </div>
        </div>
      )}
    </div>
  );
};
