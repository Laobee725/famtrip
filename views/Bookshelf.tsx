
import React, { useState } from 'react';
import { Trip, TripSeason } from '../types';
import { dataService } from '../services/dataService';

interface BookshelfViewProps {
  trips: Trip[];
  onSelectTrip: (trip: Trip) => void;
  onOpenAddModal: () => void;
  onDeleteTrip: (id: string) => void;
  onEditTrip: (trip: Trip) => void;
  onRefresh: () => void;
  syncStatus: string; // 新增狀態傳入
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
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [showInviteModal, setShowInviteModal] = useState<Trip | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];

  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setActiveMenu(null);
  };

  const handleShare = async (trip: Trip) => {
    const code = trip.inviteCode || trip.id.slice(-6).toUpperCase();
    const shareData = {
      title: `加入我的「${trip.title}」旅程！`,
      text: `快來 FamTrip 跟我一起規劃旅遊！邀請碼是：${code}`,
      url: window.location.origin
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share failed', err);
      }
    } else {
      navigator.clipboard.writeText(code);
      alert('邀請碼已複製到剪貼簿！');
    }
  };

  const handleJoinTrip = async () => {
    const code = inviteCodeInput.trim().toUpperCase();
    if (!code || code.length < 4) {
      alert('請輸入有效的邀請碼');
      return;
    }
    
    setIsSyncing(true);
    try {
      const remoteTrip = await dataService.joinTripByCode(code);
      
      if (remoteTrip) {
        await dataService.addTrip(remoteTrip);
        onRefresh();
        alert(`成功加入「${remoteTrip.title}」！`);
        setIsJoinModalOpen(false);
      } else {
        alert('找不到該邀請碼，請確認代碼是否正確。');
      }
    } catch (err) {
      alert('加入時發生錯誤，請檢查網路連線。');
    } finally {
      setIsSyncing(false);
      setInviteCodeInput('');
    }
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
              onClick={() => setIsJoinModalOpen(true)}
              className="w-12 h-14 rounded-2xl bg-white/10 text-white flex flex-col items-center justify-center backdrop-blur-md active:scale-95 transition-all border border-white/10"
            >
              <i className="fa-solid fa-key text-lg"></i>
              <span className="text-[8px] font-black mt-1 uppercase tracking-widest">JOIN</span>
            </button>
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
            <div className="flex flex-col gap-3">
              <button onClick={onOpenAddModal} className="bg-[#00A5BF] text-white px-10 py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all">
                建立我的旅程
              </button>
              <button onClick={() => setIsJoinModalOpen(true)} className="text-[#00A5BF] font-black text-xs py-2 active:opacity-50 transition-all">
                 或是加入家人的旅程
              </button>
            </div>
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
                    <img src={trip.image} className={`w-full h-full object-cover transition-all duration-700 ${isFinished ? 'sepia-[0.35] grayscale-[0.2]' : ''}`} />
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
                          {m.avatar ? <img src={m.avatar} className="w-full h-full object-cover" /> : m.name[0]}
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
                      <button onClick={(e) => handleMenuAction(e, () => setShowInviteModal(trip))} className="w-full text-left px-5 py-3 text-xs font-black text-[#00A5BF] hover:bg-blue-50 flex items-center gap-3"><i className="fa-solid fa-paper-plane"></i> 顯示邀請碼</button>
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

      {isJoinModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-md" onClick={() => !isSyncing && setIsJoinModalOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl animate-slideUp text-center">
            <div className={`w-16 h-16 bg-blue-50 text-[#00A5BF] rounded-full flex items-center justify-center mx-auto mb-6 text-2xl ${isSyncing ? 'animate-pulse' : ''}`}>
              <i className={`fa-solid ${isSyncing ? 'fa-sync fa-spin' : 'fa-door-open'}`}></i>
            </div>
            <h4 className="text-xl font-black text-stone-800 mb-2">加入冒險旅程</h4>
            <p className="text-[10px] font-bold text-gray-400 mb-10 uppercase tracking-widest">請輸入家人分享給您的邀請碼</p>
            <input 
              maxLength={10} disabled={isSyncing} autoFocus
              value={inviteCodeInput} onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
              placeholder="如：SAKURA"
              className="w-full bg-stone-50 rounded-2xl p-6 font-black text-3xl text-center text-stone-800 border-none outline-none focus:ring-2 focus:ring-[#00A5BF] mb-8 tracking-[0.2em] disabled:opacity-50"
            />
            <div className="flex flex-col gap-3">
              <button onClick={handleJoinTrip} disabled={isSyncing} className="w-full bg-stone-900 text-white py-4 rounded-full font-black text-[11px] shadow-lg active:scale-95 transition-all uppercase tracking-widest disabled:bg-stone-300">
                {isSyncing ? '同步中...' : '確認加入'}
              </button>
              {!isSyncing && <button onClick={() => setIsJoinModalOpen(false)} className="w-full text-stone-300 font-black text-[10px] uppercase tracking-widest py-2">取消</button>}
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" onClick={() => setShowInviteModal(null)}></div>
          <div className="relative w-full max-w-sm bg-white rounded-[3.5rem] p-10 shadow-2xl animate-slideUp text-center border border-white/20">
            <div className="w-20 h-20 bg-blue-50 text-[#00A5BF] rounded-full flex items-center justify-center mx-auto mb-6 text-3xl"><i className="fa-solid fa-paper-plane"></i></div>
            <h4 className="text-xl font-black text-stone-800 mb-2">邀請家人同步</h4>
            <p className="text-[11px] text-stone-400 font-bold mb-8 uppercase tracking-widest">分享代碼給家人，一起打造回憶</p>
            
            <div className="bg-white p-4 rounded-[2rem] border-2 border-dashed border-stone-200 mb-6 flex items-center justify-center">
               <img 
                 src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${showInviteModal.inviteCode || showInviteModal.id.slice(-6).toUpperCase()}`} 
                 alt="Invite QR Code"
                 className="w-40 h-40"
               />
            </div>

            <div className="bg-stone-50 p-6 rounded-[2rem] border border-stone-100 mb-8 relative">
               <span className="text-3xl font-black text-[#00A5BF] tracking-[0.3em] ml-[0.3em]">{showInviteModal.inviteCode || showInviteModal.id.slice(-6).toUpperCase()}</span>
               <button onClick={() => { navigator.clipboard.writeText(showInviteModal.inviteCode || showInviteModal.id.slice(-6).toUpperCase()); alert('邀請碼已複製！'); }} className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-5 py-2 rounded-full shadow-md border border-stone-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">點擊複製</button>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={() => handleShare(showInviteModal)} className="w-full bg-[#00A5BF] text-white py-5 rounded-full font-black text-[11px] shadow-xl uppercase tracking-widest flex items-center justify-center gap-3">
                <i className="fa-solid fa-share-nodes"></i> 直接分享邀請
              </button>
              <button onClick={() => setShowInviteModal(null)} className="w-full text-stone-300 font-black text-[10px] uppercase tracking-widest py-2">關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookshelfView;
