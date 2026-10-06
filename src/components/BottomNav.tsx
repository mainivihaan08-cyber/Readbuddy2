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
      accentColor: 'from-blue-600 to-indigo-600',
      activeText: 'text-indigo-700',
    },
    {
      id: 'read' as TabType,
      label: language === 'en' ? 'Read' : 'पढ़ें',
      icon: BookOpen,
      accentColor: 'from-indigo-600 to-violet-600',
      activeText: 'text-violet-700',
    },
    {
      id: 'phonics' as TabType,
      label: language === 'en' ? 'Phonics' : 'ध्वनि',
      icon: Volume2,
      accentColor: 'from-teal-600 to-emerald-600',
      activeText: 'text-emerald-700',
    },
    {
      id: 'drill' as TabType,
      label: language === 'en' ? 'Drill' : 'अभ्यास',
      icon: Target,
      accentColor: 'from-amber-500 to-orange-600',
      activeText: 'text-orange-700',
    },
    {
      id: 'coach' as TabType,
      label: language === 'en' ? 'Coach' : 'कोच',
      icon: Sparkles,
      accentColor: 'from-pink-500 to-rose-600',
      activeText: 'text-rose-700',
    },
    {
      id: 'parent' as TabType,
      label: language === 'en' ? 'Parent' : 'अभिभावक',
      icon: Users,
      accentColor: 'from-slate-700 to-slate-900',
      activeText: 'text-slate-900',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t-2 border-indigo-100 shadow-[0_-8px_30px_rgba(0,0,0,0.1)] pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-6 h-[68px] items-center px-1 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all duration-200 active:scale-90 cursor-pointer ${
                isActive
                  ? 'bg-indigo-50/90 shadow-xs'
                  : 'hover:bg-slate-100/70 text-slate-500 hover:text-slate-800'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-tr ${tab.accentColor} text-white shadow-md shadow-indigo-500/30 scale-110 ring-2 ring-white`
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.4]" />
              </div>

              <span
                className={`text-[10.5px] mt-1 tracking-tight truncate max-w-[55px] font-extrabold ${
                  isActive
                    ? `${tab.activeText} scale-105`
                    : 'text-slate-600'
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
