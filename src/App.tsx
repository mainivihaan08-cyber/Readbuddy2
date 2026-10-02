/**
 * ReadBuddy - Reading and Pronunciation Practice Portal for CBSE Class 6
 */

import React, { useState, useEffect } from 'react';
import { AppLanguage, ChildProfile, BadgeItem } from './types';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { ReadingView } from './components/ReadingView';
import { SoundDrillView } from './components/SoundDrillView';
import { BeforeAfterView } from './components/BeforeAfterView';
import { AICoachView } from './components/AICoachView';
import { ParentPortal } from './components/ParentPortal';
import { ChildLoginModal } from './components/ChildLoginModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  getChildProfile,
  getBadges,
  addStars,
  saveChildProfile
} from './services/storage';
import { triggerDailySessionCompleteConfetti } from './utils/confetti';
import { HelpCircle, Cloud, Globe, X } from 'lucide-react';

export default function App() {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    return (localStorage.getItem('readbuddy_lang') as AppLanguage) || 'en';
  });

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showParentPortal, setShowParentPortal] = useState(false);
  const [showHostingGuide, setShowHostingGuide] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [profile, setProfile] = useState<ChildProfile>(getChildProfile);
  const [badges, setBadges] = useState<BadgeItem[]>(getBadges);

  const refreshProfileAndBadges = () => {
    setProfile(getChildProfile());
    setBadges(getBadges());
  };

  useEffect(() => {
    const handleProfileChange = () => {
      refreshProfileAndBadges();
    };
    window.addEventListener('readbuddy_profile_changed', handleProfileChange);
    return () => {
      window.removeEventListener('readbuddy_profile_changed', handleProfileChange);
    };
  }, []);

  const handleLanguageToggle = (newLang: AppLanguage) => {
    setLanguage(newLang);
    localStorage.setItem('readbuddy_lang', newLang);
  };

  const handleClaimDailyChallenge = () => {
    if (!profile.todayChallengeCompleted) {
      const updated = addStars(15);
      updated.todayChallengeCompleted = true;
      saveChildProfile(updated);
      setProfile(updated);
      triggerDailySessionCompleteConfetti();
      // Switch directly to reading view to start practicing
      setActiveTab('read');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Mobile-First Header */}
      <Header
        language={language}
        onLanguageToggle={handleLanguageToggle}
        profile={profile}
        onOpenParentPortal={() => setShowParentPortal(true)}
        onOpenLoginModal={() => setShowLoginModal(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-x-hidden">
        {activeTab === 'home' && (
          <HomeView
            language={language}
            profile={profile}
            badges={badges}
            onStartReading={() => setActiveTab('read')}
            onStartDrill={() => setActiveTab('drill')}
            onStartCoach={() => setActiveTab('coach')}
            onClaimDailyChallenge={handleClaimDailyChallenge}
          />
        )}

        {activeTab === 'read' && (
          <ReadingView
            language={language}
            onSessionComplete={refreshProfileAndBadges}
          />
        )}

        {activeTab === 'drill' && (
          <SoundDrillView
            language={language}
            childId={profile.childId}
            onDrillComplete={refreshProfileAndBadges}
          />
        )}

        {activeTab === 'coach' && (
          <AICoachView
            language={language}
            profile={profile}
          />
        )}

        {activeTab === 'compare' && (
          <BeforeAfterView
            language={language}
            profile={profile}
            onStartReading={() => setActiveTab('read')}
          />
        )}
      </main>

      {/* Child Login / Switch Profile Modal (NO OTP MANDATORY) */}
      <ChildLoginModal
        language={language}
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onProfileLoaded={(newProfile) => {
          setProfile(newProfile);
          refreshProfileAndBadges();
        }}
        currentProfile={profile}
      />

      {/* Parent Portal PIN Modal */}
      {showParentPortal && (
        <ParentPortal
          language={language}
          profile={profile}
          onClose={() => setShowParentPortal(false)}
          onProfileUpdated={refreshProfileAndBadges}
          onStartReading={() => {
            setShowParentPortal(false);
            setActiveTab('read');
          }}
        />
      )}

      {/* Free Hosting Guide Modal */}
      {showHostingGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  How to Host ReadBuddy for Free
                </h3>
              </div>
              <button
                onClick={() => setShowHostingGuide(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <p>
                ReadBuddy is a 100% client-side Progressive Web App (PWA). All speech recognition,
                audio analysis, and IndexedDB storage runs right on the device. It requires zero server setup
                and can be hosted completely free forever!
              </p>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Option 1: Vercel (Fastest & 1-Click)</span>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Push this repository to your GitHub account.</li>
                  <li>Go to <strong>vercel.com</strong> and click "Add New Project".</li>
                  <li>Import your repo. Vercel automatically detects Vite and runs <code className="bg-slate-200 px-1 rounded">npm run build</code>.</li>
                  <li>Click <strong>Deploy</strong>. You will get a free HTTPS domain (e.g., <code className="text-indigo-600">readbuddy.vercel.app</code>) with instant PWA installability!</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Option 2: Cloudflare Pages</span>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>In Cloudflare Dashboard, select <strong>Workers & Pages</strong> ➔ <strong>Create application</strong>.</li>
                  <li>Connect your GitHub repository.</li>
                  <li>Set build command: <code className="bg-slate-200 px-1 rounded">npm run build</code> and output folder: <code className="bg-slate-200 px-1 rounded">dist</code>.</li>
                  <li>Deploy for unlimited free global CDN bandwidth!</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Option 3: GitHub Pages</span>
                <p>Run <code className="bg-slate-200 px-1 rounded">npm run build</code> and publish the <code className="bg-slate-200 px-1 rounded">dist</code> folder to the <code className="bg-slate-200 px-1 rounded">gh-pages</code> branch.</p>
              </div>

              <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-900 font-medium">
                💡 <strong>Microphone & PWA requirement:</strong> Web Speech API and PWA Service Workers require HTTPS (which Vercel and Cloudflare Pages provide automatically for free).
              </div>
            </div>

            <button
              onClick={() => setShowHostingGuide(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
            >
              Close Guide
            </button>
          </div>
        </div>
      )}

      {/* Tiny Discreet Footer with Free Hosting Guide Link */}
      <footer className="max-w-md mx-auto px-4 py-2 text-center text-[10px] text-slate-400 mb-16">
        <span>ReadBuddy · NCERT Class 6 Reading Portal · </span>
        <button
          onClick={() => setShowHostingGuide(true)}
          className="text-indigo-600 hover:underline font-semibold"
        >
          Free Hosting Steps
        </button>
      </footer>

      {/* Mobile Fixed Bottom Navigation (Thumb Zone) */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          refreshProfileAndBadges();
        }}
        language={language}
      />
    </div>
  );
}
