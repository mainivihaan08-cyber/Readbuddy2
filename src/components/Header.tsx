import React from 'react';
import { Flame, Star, Lock, BookOpen } from 'lucide-react';
import { AppLanguage, ChildProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { ChildProfileBadge } from './ChildProfileBadge';

interface HeaderProps {
  language: AppLanguage;
  onLanguageToggle: (lang: AppLanguage) => void;
  profile: ChildProfile;
  onOpenParentPortal: () => void;
  onOpenLoginModal?: () => void;
  onOpenRewardShop?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageToggle,
  profile,
  onOpenParentPortal,
  onOpenLoginModal,
  onOpenRewardShop,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-2 sm:px-4 py-2 transition-all">
      <div className="max-w-md mx-auto flex items-center justify-between gap-1 sm:gap-2 w-full overflow-hidden">
        {/* Brand Zone */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-xs shrink-0">
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="font-extrabold text-sm sm:text-base tracking-tight bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 bg-clip-text text-transparent truncate max-w-[80px] sm:max-w-none">
            ReadBuddy
          </span>
        </div>

        {/* Action Zone */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Child Profile Badge */}
          {onOpenLoginModal && (
            <ChildProfileBadge
              profile={profile}
              onOpenLoginModal={onOpenLoginModal}
            />
          )}

          {/* Language Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 text-[10px] sm:text-xs font-bold shrink-0">
            <button
              onClick={() => onLanguageToggle('en')}
              className={`px-1.5 py-0.5 rounded-md transition-all ${
                language === 'en'
                  ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLanguageToggle('hi')}
              className={`px-1.5 py-0.5 rounded-md transition-all font-hindi ${
                language === 'hi'
                  ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिन्दी
            </button>
          </div>

          {/* Combined Sleek Gamification Stats: Streak & Stars */}
          <button
            onClick={onOpenRewardShop}
            title="Open Star Rewards & Buddy Shop"
            className="flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-amber-50 to-indigo-50 hover:from-amber-100 hover:to-indigo-100 border border-slate-200/80 text-slate-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-extrabold shrink-0 shadow-2xs active:scale-95 transition cursor-pointer"
          >
            <span className="flex items-center gap-0.5 text-amber-800" title="Daily Streak">
              <Flame className="w-3 h-3 fill-amber-500 text-amber-600 shrink-0" />
              <span>{profile.streak}</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-0.5 text-indigo-900" title="Total Stars">
              <Star className="w-3 h-3 fill-amber-400 text-amber-500 shrink-0" />
              <span>{profile.stars}</span>
            </span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Parent Section PIN Lock */}
          <button
            onClick={onOpenParentPortal}
            aria-label="Parent Section"
            title="Parent Section (PIN Protected)"
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200/60 active:scale-95 transition shrink-0 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
