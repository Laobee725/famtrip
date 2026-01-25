import React from 'react';
import { TripTab } from '../types';

interface BottomNavProps {
  currentTab: TripTab;
  setTab: (tab: TripTab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentTab, setTab }) => {
  const navItems: { id: TripTab; icon: string; label: string }[] = [
    { id: 'overview', icon: 'fa-house-chimney', label: '首頁' },
    { id: 'checklist', icon: 'fa-clipboard-check', label: '清單' },
    { id: 'planner', icon: 'fa-map-location-dot', label: '行程' },
    { id: 'wallet', icon: 'fa-coins', label: '記帳' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-6 pt-3 pb-8 safe-area-inset-bottom z-[100] shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between items-center max-w-lg mx-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 relative ${
              currentTab === item.id ? 'text-[#00A5BF]' : 'text-stone-400'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              currentTab === item.id ? 'bg-[#00A5BF]/10 mb-0.5 scale-110 shadow-inner' : ''
            }`}>
              <i className={`fa-solid ${item.icon} ${currentTab === item.id ? 'text-xl' : 'text-lg'}`}></i>
            </div>
            <span className={`text-[11px] font-black tracking-widest ${currentTab === item.id ? 'opacity-100' : 'opacity-60'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;