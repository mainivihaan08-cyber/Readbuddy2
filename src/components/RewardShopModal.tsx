import React, { useState } from 'react';
import {
  X,
  Star,
  Award,
  Gift,
  CheckCircle2,
  Sparkles,
  Lock,
  Flame,
  Volume2,
  BookOpen,
  Trophy,
  Check,
  Plus
} from 'lucide-react';
import { AppLanguage, ChildProfile, CustomParentReward } from '../types';
import { BuddyMascot } from './BuddyMascot';
import { unlockBuddyAccessory, equipBuddyAccessory, claimParentReward } from '../services/storage';
import { triggerParagraphSuccessConfetti } from '../utils/confetti';

interface RewardShopModalProps {
  language: AppLanguage;
  profile: ChildProfile;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: () => void;
}

export const ACCESSORY_CATALOG = [
  {
    id: 'antenna',
    name: 'Golden Antenna',
    nameHi: 'गोल्डन एंटीना',
    cost: 100,
    icon: '✨',
    desc: 'Golden star light bulb on Buddy\'s antenna',
    descHi: 'बडी के एंटीना पर सुनहरी चमकता सितारा'
  },
  {
    id: 'glasses',
    name: 'Cool Sunglasses',
    nameHi: 'कूल चश्मा',
    cost: 250,
    icon: '😎',
    desc: 'Stylish dark sunglasses for a confident look',
    descHi: 'बडी के लिए स्टाइलिश कूल चश्मा'
  },
  {
    id: 'cape',
    name: 'Superhero Cape',
    nameHi: 'सुपरहीरो केप',
    cost: 500,
    icon: '🦸‍♂️',
    desc: 'Red flowing superhero cape on Buddy\'s back',
    descHi: 'बडी की पीठ पर लहराता लाल सुपरहीरो केप'
  },
  {
    id: 'crown',
    name: 'Golden Crown',
    nameHi: 'शाही मुकुट',
    cost: 1000,
    icon: '👑',
    desc: 'Royal golden crown for a Speech Legend',
    descHi: 'वाणी सम्राट के लिए शाही सुनहरा मुकुट'
  }
];

export const RewardShopModal: React.FC<RewardShopModalProps> = ({
  language,
  profile,
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'policy' | 'shop' | 'parent-gifts'>('shop');
  const [purchaseMsg, setPurchaseMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const unlockedAccs = profile.unlockedAccessories || [];
  const currentEquipped = profile.equippedAccessory || 'none';
  const parentGifts = profile.customParentRewards || [
    {
      id: 'default-1',
      title: '30 Mins Extra Playtime',
      titleHi: '३० मिनट अतिरिक्त खेल का समय',
      costStars: 100,
      claimed: false,
    },
    {
      id: 'default-2',
      title: 'Favorite Ice Cream / Snack Treat',
      titleHi: 'मनपसंद आइसक्रीम या स्नैक',
      costStars: 250,
      claimed: false,
    },
    {
      id: 'default-3',
      title: 'New Story Book / Comic',
      titleHi: 'नई कहानी की किताब या कॉमिक',
      costStars: 500,
      claimed: false,
    }
  ];

  const handleUnlock = async (accId: string, cost: number) => {
    if (profile.stars < cost) {
      setPurchaseMsg(
        language === 'en'
          ? `You need ${cost - profile.stars} more stars to unlock this!`
          : `इसे अनलॉक करने के लिए ${cost - profile.stars} और सितारे चाहिए!`
      );
      setTimeout(() => setPurchaseMsg(null), 3000);
      return;
    }

    const updated = await unlockBuddyAccessory(profile.childId, accId, cost);
    if (updated) {
      triggerParagraphSuccessConfetti();
      setPurchaseMsg(
        language === 'en'
          ? 'Unlocked successfully! Buddy is wearing it now! 🎉'
          : 'अनलॉक हो गया! बडी ने इसे पहन लिया है! 🎉'
      );
      setTimeout(() => setPurchaseMsg(null), 3000);
      onProfileUpdated();
    }
  };

  const handleEquip = async (accId: string) => {
    const updated = await equipBuddyAccessory(profile.childId, accId);
    if (updated) {
      onProfileUpdated();
    }
  };

  const handleClaimParentGift = async (rewardId: string, costStars: number) => {
    if (profile.stars < costStars) {
      setPurchaseMsg(
        language === 'en'
          ? `You need ${costStars - profile.stars} more stars for this reward!`
          : `इस उपहार के लिए ${costStars - profile.stars} और सितारे चाहिए!`
      );
      setTimeout(() => setPurchaseMsg(null), 3000);
      return;
    }

    const updated = await claimParentReward(profile.childId, rewardId, costStars);
    if (updated) {
      triggerParagraphSuccessConfetti();
      setPurchaseMsg(
        language === 'en'
          ? 'Reward claimed! Show your parents to claim your real gift! 🎁'
          : 'उपहार क्लेम हो गया! अपना असली तोहफा पाने के लिए माता-पिता को दिखाएं! 🎁'
      );
      setTimeout(() => setPurchaseMsg(null), 3500);
      onProfileUpdated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 relative my-auto animate-in zoom-in-95">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg">
              ⭐
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {language === 'en' ? 'Star Rewards & Policy' : 'सितारा एवं इनाम केंद्र'}
              </h2>
              <span className="text-[11px] font-bold text-indigo-600">
                {language === 'en' ? 'Your Balance:' : 'आपके कुल सितारे:'} <strong className="text-amber-600 font-mono text-xs">{profile.stars} ⭐</strong>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alert Banner */}
        {purchaseMsg && (
          <div className="mt-3 p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-extrabold text-center animate-in fade-in">
            {purchaseMsg}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl my-3 text-xs font-bold">
          <button
            onClick={() => setActiveTab('shop')}
            className={`py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'shop'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🤖</span>
            <span>{language === 'en' ? 'Buddy Shop' : 'रोबोट दुकान'}</span>
          </button>

          <button
            onClick={() => setActiveTab('parent-gifts')}
            className={`py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'parent-gifts'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎁</span>
            <span>{language === 'en' ? 'Gifts' : 'उपहार'}</span>
          </button>

          <button
            onClick={() => setActiveTab('policy')}
            className={`py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'policy'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📜</span>
            <span>{language === 'en' ? 'Policy' : 'नियम'}</span>
          </button>
        </div>

        {/* TAB 1: BUDDY MASCOT ACCESSORIES SHOP */}
        {activeTab === 'shop' && (
          <div className="space-y-3">
            {/* Live Buddy Mascot Showcase */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 text-white flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-200 uppercase tracking-wider block">
                  {language === 'en' ? 'Active Mascot Preview' : 'सक्रिय बडी रोबोट'}
                </span>
                <h3 className="text-sm font-black text-white">
                  {language === 'en' ? 'Customize Buddy' : 'बडी को सजाएँ'}
                </h3>
                <span className="text-[11px] text-indigo-100 block mt-1">
                  {language === 'en' ? 'Unlock accessories with your stars!' : 'अपने सितारों से बडी के लिए सामान खरीदें!'}
                </span>
              </div>

              <div className="shrink-0">
                <BuddyMascot mood="greeting" size="md" showSpeechBubble={false} accessory={currentEquipped} />
              </div>
            </div>

            {/* Accessories Catalog Grid */}
            <div className="grid grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
              {ACCESSORY_CATALOG.map((item) => {
                const isUnlocked = unlockedAccs.includes(item.id);
                const isEquipped = currentEquipped === item.id;
                const canAfford = profile.stars >= item.cost;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition-all flex flex-col justify-between text-left ${
                      isEquipped
                        ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400'
                        : isUnlocked
                        ? 'bg-indigo-50/60 border-indigo-200'
                        : 'bg-slate-50 border-slate-200/80 opacity-90'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                          {item.cost} ⭐
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-900">
                        {language === 'en' ? item.name : item.nameHi}
                      </h4>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                        {language === 'en' ? item.desc : item.descHi}
                      </p>
                    </div>

                    <div className="mt-2.5">
                      {isEquipped ? (
                        <button
                          onClick={() => handleEquip('none')}
                          className="w-full py-1.5 rounded-xl bg-amber-600 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{language === 'en' ? 'Equipped' : 'पहना हुआ'}</span>
                        </button>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleEquip(item.id)}
                          className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition cursor-pointer"
                        >
                          {language === 'en' ? 'Equip' : 'पहनें'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnlock(item.id, item.cost)}
                          disabled={!canAfford}
                          className={`w-full py-1.5 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1 cursor-pointer ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs'
                              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {!canAfford && <Lock className="w-3 h-3" />}
                          <span>
                            {canAfford
                              ? language === 'en' ? 'Unlock for ' + item.cost + ' ⭐' : item.cost + ' ⭐ से खरीदें'
                              : language === 'en' ? 'Need ' + item.cost + ' ⭐' : item.cost + ' ⭐ चाहिए'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: PARENT REAL-WORLD GIFTS & REWARDS */}
        {activeTab === 'parent-gifts' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
              <span className="font-extrabold text-amber-950 block mb-0.5">
                🎁 {language === 'en' ? 'Real-World Parent Rewards' : 'माता-पिता द्वारा असली उपहार'}
              </span>
              <span>
                {language === 'en'
                  ? 'Redeem your stars for real rewards set by your parents! Show claimed rewards to your parent.'
                  : 'अपने सितारों से माता-पिता द्वारा तय किए गए असली उपहार प्राप्त करें!'}
              </span>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {parentGifts.map((gift) => {
                const canAfford = profile.stars >= gift.costStars;

                return (
                  <div
                    key={gift.id}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2 ${
                      gift.claimed
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-white border-slate-200/90 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-base shrink-0 font-bold">
                        🎁
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          {language === 'en' ? gift.title : (gift.titleHi || gift.title)}
                        </h4>
                        <span className="text-[10px] font-extrabold font-mono text-amber-700 block">
                          Cost: {gift.costStars} ⭐
                        </span>
                      </div>
                    </div>

                    <div>
                      {gift.claimed ? (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{language === 'en' ? 'Claimed' : 'स्वीकृत'}</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClaimParentGift(gift.id, gift.costStars)}
                          disabled={!canAfford}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                            canAfford
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {canAfford
                            ? language === 'en' ? 'Claim Gift' : 'तोहफा लें'
                            : gift.costStars + ' ⭐'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: STAR EARNINGS POLICY */}
        {activeTab === 'policy' && (
          <div className="space-y-3 text-xs text-slate-700 max-h-[280px] overflow-y-auto pr-1">
            <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold">
              <span>📋 {language === 'en' ? 'Official Star Reward Policy (सितारा एवं इनाम नीति)' : 'आधिकारिक सितारा एवं इनाम नीति'}</span>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">✅</span>
                  <div>
                    <span className="font-bold text-slate-900 block">{language === 'en' ? 'Green Tick Pronunciation' : 'सही उच्चारण (ग्रीन टिक)'}</span>
                    <span className="text-[10px] text-slate-500">{language === 'en' ? 'Accuracy >= 80% on 1st try' : '८०%+ शुद्धता पर'}</span>
                  </div>
                </div>
                <span className="font-extrabold font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">+5 ⭐</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎯</span>
                  <div>
                    <span className="font-bold text-slate-900 block">{language === 'en' ? 'Daily 15-Min Voice Goal' : 'दैनिक १५ मिनट लक्ष्य'}</span>
                    <span className="text-[10px] text-slate-500">{language === 'en' ? 'Completing daily reading stamina' : 'रोज़ १५ मिनट पूरा करने पर'}</span>
                  </div>
                </div>
                <span className="font-extrabold font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">+15 ⭐</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">✨</span>
                  <div>
                    <span className="font-bold text-slate-900 block">{language === 'en' ? 'Daily Speech Challenge' : 'दैनिक वाचन चुनौती'}</span>
                    <span className="text-[10px] text-slate-500">{language === 'en' ? 'Completing featured daily challenge' : 'दैनिक चुनौती पूरी करने पर'}</span>
                  </div>
                </div>
                <span className="font-extrabold font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">+10 ⭐</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔥</span>
                  <div>
                    <span className="font-bold text-slate-900 block">{language === 'en' ? '3-Day Practice Streak' : '३ दिन की लगातार पढ़ाई'}</span>
                    <span className="text-[10px] text-slate-500">{language === 'en' ? '3 consecutive active days' : 'लगातार ३ दिन अभ्यास'}</span>
                  </div>
                </div>
                <span className="font-extrabold font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">+20 ⭐</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏆</span>
                  <div>
                    <span className="font-bold text-slate-900 block">{language === 'en' ? '7-Day Practice Streak' : '७ दिन की लगातार पढ़ाई'}</span>
                    <span className="text-[10px] text-slate-500">{language === 'en' ? '7 consecutive active days' : 'लगातार ७ दिन अभ्यास'}</span>
                  </div>
                </div>
                <span className="font-extrabold font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">+50 ⭐</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 active:scale-98 transition cursor-pointer"
          >
            {language === 'en' ? 'Close Reward Center' : 'इनाम केंद्र बंद करें'}
          </button>
        </div>
      </div>
    </div>
  );
};
