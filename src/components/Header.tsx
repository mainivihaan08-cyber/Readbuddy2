import React from 'react';
import { Flame, Star, Lock, BookOpen } from 'lucide-react';
import { AppLanguage, ChildProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  language: AppLanguage;
  onLanguageToggle: (lang: AppLanguage) => void;
  profile: ChildProfile;
  onOpenParentPortal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageToggle,
  profile,
  onOpenParentPortal,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 transition-all">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Brand Zone */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
            ReadBuddy
          </span>
        </div>

        {/* Center / Action Zone */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Language Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 text-xs font-semibold">
            <button
              onClick={() => onLanguageToggle('en')}
              className={`px-2 py-1 rounded-md transition-all ${
                language === 'en'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLanguageToggle('hi')}
              className={`px-2 py-1 rounded-md transition-all font-hindi ${
                language === 'hi'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिन्दी
            </button>
          </div>

          {/* Gamification Stats: Streak & Stars */}
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/70 text-amber-800 px-2 py-1 rounded-lg text-xs font-bold">
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
            <span>{profile.streak}</span>
          </div>

          <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-200/70 text-indigo-800 px-2 py-1 rounded-lg text-xs font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span>{profile.stars}</span>
          </div>

          {/* PWA Install */}
          <PWAInstallButton />

          {/* Parent Portal PIN Access */}
          <button
            onClick={onOpenParentPortal}
            aria-label="Parent Section"
            title="Parent Section (PIN Protected)"
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 border border-transparent hover:border-slate-200 active:scale-95 transition"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
