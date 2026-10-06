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
    },
    {
      id: 'read' as TabType,
      label: language === 'en' ? 'Read' : 'पढ़ें',
      icon: BookOpen,
    },
    {
      id: 'phonics' as TabType,
      label: language === 'en' ? 'Phonics' : 'ध्वनि',
      icon: Volume2,
    },
    {
      id: 'parent' as TabType,
      label: language === 'en' ? 'Parent' : 'अभिभावक',
      icon: Users,
    },
    {
      id: 'drill' as TabType,
      label: language === 'en' ? 'Drill' : 'अभ्यास',
      icon: Target,
    },
    {
      id: 'coach' as TabType,
      label: language === 'en' ? 'Coach' : 'कोच',
      icon: Sparkles,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-6 h-16 items-center px-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
                isActive
                  ? 'text-indigo-600 font-semibold'
                  : 'text-slate-400 hover:text-slate-600 font-normal'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600" />
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight truncate max-w-[55px] ${language === 'hi' ? 'font-hindi' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

