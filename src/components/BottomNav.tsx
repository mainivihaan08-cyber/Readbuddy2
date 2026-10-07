import React from 'react';
import { Home, BookOpen, Volume2, Users, Target, Sparkles } from 'lucide-react';
import { AppLanguage } from '../types';

export type TabType = 'home' | 'read' | 'phonics' | 'parent' | 'drill' | 'coach' | 'compare';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  language: AppLanguage;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  language,
}) => {
  const tabs = [
    {
      id: 'home' as TabType,
      label: language === 'en' ? 'Home' : 'मुख्य',
      icon: Home,
      accentColor: 'from-blue-600 via-indigo-600 to-indigo-700',
      activeText: 'text-indigo-900',
      activeBg: 'bg-indigo-100/90 border-indigo-300/80',
      glowColor: 'shadow-indigo-500/40',
    },
    {
      id: 'read' as TabType,
      label: language === 'en' ? 'Read' : 'पढ़ें',
      icon: BookOpen,
      accentColor: 'from-indigo-600 via-purple-600 to-violet-700',
      activeText: 'text-violet-950',
      activeBg: 'bg-violet-100/90 border-violet-300/80',
      glowColor: 'shadow-violet-500/40',
    },
    {
      id: 'phonics' as TabType,
      label: language === 'en' ? 'Phonics' : 'ध्वनि',
      icon: Volume2,
      accentColor: 'from-emerald-600 via-teal-600 to-cyan-700',
      activeText: 'text-emerald-950',
      activeBg: 'bg-emerald-100/90 border-emerald-300/80',
      glowColor: 'shadow-emerald-500/40',
    },
    {
      id: 'drill' as TabType,
      label: language === 'en' ? 'Drill' : 'अभ्यास',
      icon: Target,
      accentColor: 'from-amber-500 via-orange-500 to-red-600',
      activeText: 'text-orange-950',
      activeBg: 'bg-orange-100/90 border-orange-300/80',
      glowColor: 'shadow-orange-500/40',
    },
    {
      id: 'coach' as TabType,
      label: language === 'en' ? 'Coach' : 'कोच',
      icon: Sparkles,
      accentColor: 'from-pink-500 via-rose-500 to-purple-600',
      activeText: 'text-rose-950',
      activeBg: 'bg-pink-100/90 border-pink-300/80',
      glowColor: 'shadow-pink-500/40',
    },
    {
      id: 'parent' as TabType,
      label: language === 'en' ? 'Parent' : 'अभिभावक',
      icon: Users,
      accentColor: 'from-slate-700 via-slate-800 to-slate-950',
      activeText: 'text-slate-950',
      activeBg: 'bg-slate-200/90 border-slate-300/80',
      glowColor: 'shadow-slate-500/40',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-2xl border-t-2 border-indigo-200/80 shadow-[0_-10px_35px_rgba(30,27,75,0.14)] pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-6 h-[72px] items-center px-1.5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 active:scale-90 cursor-pointer border ${
                isActive
                  ? `${tab.activeBg} shadow-sm ring-1 ring-white`
                  : 'border-transparent hover:bg-slate-100/80 text-slate-600 hover:text-slate-900'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all duration-200 relative ${
                  isActive
                    ? `bg-gradient-to-tr ${tab.accentColor} text-white shadow-lg ${tab.glowColor} scale-110 ring-2 ring-white`
                    : 'bg-slate-100/90 text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />
                )}
              </div>

              <span
                className={`text-[11px] mt-1 tracking-tight truncate max-w-[55px] font-black ${
                  isActive
                    ? `${tab.activeText} scale-105 drop-shadow-2xs`
                    : 'text-slate-700'
                } ${language === 'hi' ? 'font-hindi' : ''}`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
