
import React, { useState } from 'react';
import { Trip, TripSeason } from '../types';

interface BookshelfViewProps {
  trips: Trip[];
  onSelectTrip: (trip: Trip) => void;
  onOpenAddModal: () => void;
  onDeleteTrip: (id: string) => void;
  onEditTrip: (trip: Trip) => void;
  onRefresh: () => void;
  syncStatus: string;
}

const SEASON_CONFIG: Record<TripSeason, { icon: string; label: string; color: string; bg: string }> = {
  spring: { icon: '🌸', label: '春', color: 'text-pink-500', bg: 'bg-pink-50' },
  summer: { icon: '☀️', label: '夏', color: 'text-amber-500', bg: 'bg-amber-50' },
  autumn: { icon: '🍁', label: '秋', color: 'text-orange-600', bg: 'bg-orange-50' },
  winter: { icon: '❄️', label: '冬', color: 'text-blue-500', bg: 'bg-blue-50' },
};

const BookshelfView: React.FC<BookshelfViewProps> = ({ 
  trips, 
  onSelectTrip, 
  onOpenAddModal, 
  onDeleteTrip,
  onEditTrip,
  onRefresh,
  syncStatus
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];

  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setActiveMenu(null);
  };

  const renderStatusIndicator = () => {
    const isOnline = syncStatus === 'SUBSCRIBED';
    const isConnecting = syncStatus === 'CONNECTING';
    
    return (
      <div 
        onClick={onRefresh}
        className="flex items-center gap-2 cursor-pointer active:opacity-50 transition-all mt-1"
      >
         <div className={`w-2 h-2 rounded-full ${
           isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 
           isConnecting ? 'bg-amber-300 animate-pulse' : 'bg-rose-400'
         } transition-all duration-500`}></div>
         <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">
           {isOnline ? 'Cloud Linked' : isConnecting ? 'Syncing...' : 'Local Only'}
         </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20 animate-fadeIn bg-[#F0F4F7]">
      <header className="bg-[#00A5BF] px-8 pt-16 pb-12 rounded-b-[3rem] shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-start text-left">
          <div>
            <h1 className="text-4xl font-black text-white mb-1 tracking-tighter">旅遊故事本</h1>
            {renderStatusIndicator()}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onOpenAddModal}
              className="w-14 h-14 rounded-2xl bg-white text-[#00A5BF] flex items-center justify-center shadow-lg active:scale-95 transition-all"
            >
              <i className="fa-solid fa-plus text-xl"></i>
            </button>
          </div>
        </div>
        <i className="fa-solid fa-map-location-dot absolute -right-6 -bottom-6 text-9xl text-white/10 rotate-12"></i>
      </header>

      <div className="px-6 -mt-8 space-y-6">
        {trips.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-12 text-center jp-shadow border border-gray-50">
            <i className="fa-solid fa-suitcase-rolling text-5xl text-gray-100 mb-6 scale-y-[-1] opacity-20"></i>
            <p className="text-gray-400 font-black mb-8">還沒有任何故事本喔！</p>
            <button onClick={onOpenAddModal} className="bg-[#00A5BF] text-white px-10 py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all">
              建立第一本旅遊本
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {trips.map(trip => {
              const season = trip.season || 'spring';
              const sInfo = SEASON_CONFIG[season];
              const isFinished = trip.endDate < today;

              return (
                <div 
                  key={trip.id}
                  onClick={() => onSelectTrip(trip)}
                  className="group relative bg-white rounded-[2.5rem] jp-shadow overflow-hidden border border-gray-50 active:scale-[0.98] transition-all"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img src={trip.image} className={`w-full h-full object-cover transition-all duration-700 ${isFinished ? 'sepia-[0.35] grayscale-[0.2]' : ''}`} alt={trip.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className={`absolute top-4 right-4 ${sInfo.bg} backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-2 shadow-sm border border-white/50`}>
                      <span className="text-xs">{sInfo.icon}</span>
                      <span className={`text-xs font-black ${sInfo.color}`}>{sInfo.label}</span>
                    </div>
                    <div className="absolute bottom-4 left-6 text-left">
                      <span className="bg-[#00A5BF] text-white text-[10px] font-black px-3 py-1 rounded-full mb-2 inline-block shadow-sm uppercase tracking-wider">{trip.destination}</span>
                      <h3 className="text-xl font-black text-white drop-shadow-md tracking-tight">{trip.title}</h3>
                    </div>
                  </div>
                  <div className="p-6 flex justify-between items-center bg-white">
                    <div className="flex -space-x-3">
                      {trip.members.map((m, i) => (
                        <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-gray-50 flex items-center justify-center text-xs font-black text-[#00A5BF] jp-shadow overflow-hidden shadow-sm">
                          {m.avatar ? <img src={m.avatar} className="w-full h-full object-cover" alt={m.name} /> : m.name[0]}
                        </div>
                      ))}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-black mb-0.5 uppercase tracking-widest">{isFinished ? '典藏旅程' : '冒險日期'}</p>
                      <p className={`text-xs font-black ${isFinished ? 'text-stone-400' : 'text-gray-800'}`}>
                        {trip.startDate.replace(/-/g, '/')} — {trip.endDate.replace(/-/g, '/')}
                      </p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === trip.id ? null : trip.id); }} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-all border border-white/20">
                    <i className="fa-solid fa-ellipsis text-sm"></i>
                  </button>
                  {activeMenu === trip.id && (
                    <div className="absolute top-16 left-4 bg-white shadow-2xl rounded-2xl py-3 min-w-[180px] z-50 border border-gray-100 text-left animate-slideUp">
                      <button onClick={(e) => handleMenuAction(e, () => onEditTrip(trip))} className="w-full text-left px-5 py-3 text-xs font-black text-gray-700 hover:bg-gray-50 flex items-center gap-3"><i className="fa-solid fa-pen"></i> 編輯旅程設定</button>
                      <div className="h-px bg-gray-50 my-1 mx-3"></div>
                      <button onClick={(e) => handleMenuAction(e, () => onDeleteTrip(trip.id))} className="w-full text-left px-5 py-3 text-xs font-black text-red-500 hover:bg-red-50 flex items-center gap-3"><i className="fa-solid fa-trash-can"></i> 刪除故事本</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookshelfView;