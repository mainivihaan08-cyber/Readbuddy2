import React from 'react';
import { User, LogIn } from 'lucide-react';
import { ChildProfile } from '../types';
import { maskMobileNumber } from '../services/storage';

interface ChildProfileBadgeProps {
  profile: ChildProfile;
  onOpenLoginModal: () => void;
}

export const ChildProfileBadge: React.FC<ChildProfileBadgeProps> = ({
  profile,
  onOpenLoginModal,
}) => {
  return (
    <button
      onClick={onOpenLoginModal}
      className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 text-left transition group cursor-pointer"
      title={`Active Profile: ${profile.name} (${maskMobileNumber(profile.mobileNumber)}) - Click to Switch or Log In`}
    >
      <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center text-[11px] font-black shrink-0 shadow-xs">
        {profile.name ? profile.name[0].toUpperCase() : 'C'}
      </div>
      <div className="hidden sm:flex flex-col text-left leading-none">
        <span className="text-[11px] font-bold text-slate-800 group-hover:text-indigo-700 truncate max-w-[85px]">
          {profile.name}
        </span>
        <span className="text-[9px] font-mono text-slate-400">
          {maskMobileNumber(profile.mobileNumber)}
        </span>
      </div>
      <LogIn className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 ml-0.5" />
    </button>
  );
};
