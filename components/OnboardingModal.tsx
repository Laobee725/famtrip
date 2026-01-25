import React, { useState } from 'react';
import { UserProfile } from '../types';

const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Felix&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Aneka&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Max&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Luna&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Kiki&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Coco&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Mochi&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Toby&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Willow&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Jasper&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Bear&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Lucky&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Sasha&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Ginger&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Pepper&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Buddy&backgroundColor=f0f4f7',
];

interface OnboardingModalProps {
  onComplete: (profile: UserProfile) => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const profile: UserProfile = {
      id: 'u_' + Date.now(),
      name: name.trim(),
      avatar
    };
    onComplete(profile);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#F0F4F7] flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
      <div className="max-w-sm w-full space-y-10">
        <div className="space-y-2">
           <h2 className="text-3xl font-black text-gray-800 tracking-tighter">歡迎使用 FamTrip</h2>
           <p className="text-gray-400 font-bold text-sm">在開始冒險前，請告訴大家你是誰</p>
        </div>

        <div className="relative group">
           <div className="w-32 h-32 mx-auto rounded-[2.5rem] bg-white shadow-xl border-4 border-white overflow-hidden p-2">
              <img src={avatar} className="w-full h-full object-contain" />
           </div>
           <div className="mt-8 grid grid-cols-4 gap-3 max-h-40 overflow-y-auto p-2 no-scrollbar">
              {AVATAR_OPTIONS.map(url => (
                <button 
                  key={url} 
                  type="button"
                  onClick={() => setAvatar(url)}
                  className={`aspect-square rounded-2xl p-1.5 transition-all ${avatar === url ? 'bg-[#00A5BF] scale-110 shadow-lg' : 'bg-white opacity-40 hover:opacity-100'}`}
                >
                  <img src={url} className="w-full h-full object-contain" />
                </button>
              ))}
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
           <input 
             autoFocus
             placeholder="輸入你的暱稱 (如：小明)" 
             value={name}
             onChange={e => setName(e.target.value)}
             className="w-full bg-white rounded-[2rem] px-8 py-5 font-black text-center text-xl shadow-inner border-none outline-none focus:ring-2 focus:ring-[#00A5BF]"
           />
           <button 
             disabled={!name.trim()}
             className="w-full bg-gray-900 text-white py-6 rounded-full font-black tracking-widest text-sm shadow-2xl active:scale-95 transition-all disabled:opacity-30"
           >
             開始使用
           </button>
        </form>
      </div>
    </div>
  );
};

export default OnboardingModal;