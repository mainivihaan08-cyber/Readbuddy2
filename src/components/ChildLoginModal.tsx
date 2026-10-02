import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  X,
  Star,
  Flame,
  Award,
  Users
} from 'lucide-react';
import { AppLanguage, ChildProfile } from '../types';
import {
  loginOrCreateChild,
  getAllChildProfiles,
  normalizeMobileNumber,
  maskMobileNumber,
  switchChildProfile
} from '../services/storage';

interface ChildLoginModalProps {
  language: AppLanguage;
  isOpen: boolean;
  onClose: () => void;
  onProfileLoaded: (profile: ChildProfile) => void;
  currentProfile?: ChildProfile;
}

export const ChildLoginModal: React.FC<ChildLoginModalProps> = ({
  language,
  isOpen,
  onClose,
  onProfileLoaded,
  currentProfile,
}) => {
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [detectedProfile, setDetectedProfile] = useState<ChildProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [allProfiles, setAllProfiles] = useState<ChildProfile[]>([]);

  useEffect(() => {
    if (isOpen) {
      const list = getAllChildProfiles();
      setAllProfiles(list);
      setError(null);
      setSuccessMessage(null);
      if (currentProfile) {
        setName(currentProfile.name);
        setMobileNumber(currentProfile.mobileNumber || '');
      }
    }
  }, [isOpen, currentProfile]);

  // Real-time check when 10 digits are reached
  useEffect(() => {
    const cleanDigits = normalizeMobileNumber(mobileNumber);
    if (cleanDigits.length === 10) {
      const match = allProfiles.find(
        (p) => normalizeMobileNumber(p.mobileNumber) === cleanDigits
      );
      if (match) {
        setDetectedProfile(match);
        if (!name || name === currentProfile?.name) {
          setName(match.name);
        }
      } else {
        setDetectedProfile(null);
      }
    } else {
      setDetectedProfile(null);
    }
  }, [mobileNumber, allProfiles]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const cleanDigits = normalizeMobileNumber(mobileNumber);
      if (!cleanDigits || cleanDigits.length < 10) {
        setError(
          language === 'en'
            ? 'Please enter a valid 10-digit mobile number.'
            : 'कृपया सही 10-अंकों का मोबाइल नंबर दर्ज करें।'
        );
        return;
      }

      if (!name.trim()) {
        setError(
          language === 'en'
            ? 'Please enter the child name.'
            : 'कृपया बच्चे का नाम दर्ज करें।'
        );
        return;
      }

      const result = loginOrCreateChild(name, mobileNumber);
      setSuccessMessage(result.message);

      setTimeout(() => {
        onProfileLoaded(result.profile);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check inputs.');
    }
  };

  const handleSelectExisting = (profile: ChildProfile) => {
    const switched = switchChildProfile(profile.childId);
    if (switched) {
      setSuccessMessage(
        language === 'en'
          ? `Switched to ${switched.name}'s profile!`
          : `${switched.name} के प्रोफ़ाइल पर स्विच किया!`
      );
      setTimeout(() => {
        onProfileLoaded(switched);
        onClose();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                {language === 'en' ? 'Child Profile Login' : 'बच्चे का प्रोफ़ाइल लॉगिन'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {language === 'en' ? 'No OTP Required • Instant Access' : 'बिना OTP • तुरंत प्रवेश'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security / No-OTP Assurance Banner */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-3 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-950 leading-relaxed">
            <span className="font-bold block text-emerald-900 mb-0.5">
              {language === 'en' ? 'Permanent Profile Continuity' : 'स्थायी प्रोफ़ाइल सुरक्षा'}
            </span>
            {language === 'en'
              ? 'Enter child name and mobile number. All recordings, transcripts, AI analysis reports, and stars stay permanently linked.'
              : 'बच्चे का नाम और मोबाइल नंबर दर्ज करें। सभी रिकॉर्डिंग, ट्रांसक्रिप्ट और AI रिपोर्ट इसी प्रोफ़ाइल में सुरक्षित रहेंगी।'}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Child Name Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {language === 'en' ? 'Child Name' : 'बच्चे का नाम'} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={language === 'en' ? 'e.g. Aarav Sharma' : 'उदा. आरव शर्मा'}
                className="w-full text-sm font-semibold pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Mobile Number Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {language === 'en' ? 'Parent / Primary Mobile Number' : 'मोबाइल नंबर (पहचान)'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 flex items-center shrink-0">
                +91
              </div>
              <div className="relative flex-1">
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="98XXXXXXXX"
                  className="w-full text-sm font-semibold pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition font-mono tracking-wider"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {language === 'en'
                ? 'Mobile number is masked in the app and never shared publicly.'
                : 'मोबाइल नंबर सुरक्षित रूप से मास्क रहता है और सार्वजनिक नहीं किया जाता।'}
            </p>
          </div>

          {/* Returning User Recognized Banner */}
          {detectedProfile && (
            <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200 text-xs text-indigo-900 space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-extrabold text-indigo-950">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>
                  {language === 'en' ? 'Returning Profile Recognized!' : 'मौजूदा प्रोफ़ाइल पहचानी गई!'}
                </span>
              </div>
              <p className="text-[11px] text-indigo-800 leading-snug">
                Found existing records for <strong>{detectedProfile.name}</strong> ({maskMobileNumber(detectedProfile.mobileNumber)}).
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px] font-bold text-indigo-700">
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  {detectedProfile.stars} Stars
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                  {detectedProfile.streak}d Streak
                </span>
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                  Lvl {detectedProfile.level}
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm shadow-md shadow-indigo-200 flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
          >
            <span>{detectedProfile ? 'Load Existing Profile' : 'Continue to Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Existing Profiles on This Device */}
        {allProfiles.length > 1 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>Saved Profiles on this Device:</span>
            </span>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {allProfiles.map((p) => {
                const isSelected = p.childId === currentProfile?.childId;
                return (
                  <button
                    key={p.childId}
                    type="button"
                    onClick={() => handleSelectExisting(p)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="font-extrabold block">{p.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {maskMobileNumber(p.mobileNumber)} • Lvl {p.level} • {p.stars} ⭐
                      </span>
                    </div>

                    {isSelected ? (
                      <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-indigo-600 font-bold">
                        Switch
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
