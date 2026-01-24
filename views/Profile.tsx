
import React from 'react';

const ProfileView: React.FC = () => {
  const menuItems = [
    { icon: 'fa-users', label: '家庭成員管理', count: '1人' },
    { icon: 'fa-gear', label: '通知設定' },
    { icon: 'fa-shield-halved', label: '隱私與安全' },
    { icon: 'fa-circle-question', label: '幫助與回饋' },
  ];

  return (
    <div className="p-6 text-left">
      <div className="flex flex-col items-center mb-12">
        <div className="relative">
          <div className="w-28 h-28 rounded-[2.5rem] bg-stone-100 flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
             <img src="https://api.dicebear.com/7.x/lorelei/svg?seed=Traveler&backgroundColor=f0f4f7" alt="avatar" className="w-full h-full object-contain" />
          </div>
          <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-stone-800 text-white rounded-2xl border-4 border-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
            <i className="fa-solid fa-camera text-xs"></i>
          </button>
        </div>
        <h2 className="mt-6 text-2xl font-black text-gray-800 tracking-tighter">我的個人資料</h2>
        <p className="text-[10px] font-black text-[#00A5BF] uppercase tracking-[0.2em] mt-1">Adventure Explorer</p>
      </div>

      <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-stone-100 mb-8">
        {menuItems.map((item, i) => (
          <button 
            key={i}
            className={`w-full flex justify-between items-center p-6 active:bg-stone-50 transition-colors ${i !== menuItems.length - 1 ? 'border-b border-stone-50' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-400 group-active:text-[#00A5BF] transition-colors">
                <i className={`fa-solid ${item.icon} text-lg`}></i>
              </div>
              <span className="font-black text-stone-700 text-sm tracking-tight">{item.label}</span>
            </div>
            <div className="flex items-center gap-3">
              {item.count && <span className="text-[10px] font-black text-[#00A5BF] bg-[#00A5BF]/10 px-2 py-1 rounded-lg">{item.count}</span>}
              <i className="fa-solid fa-chevron-right text-[10px] text-stone-200"></i>
            </div>
          </button>
        ))}
      </div>

      <button className="w-full py-5 text-red-400 text-xs font-black bg-white rounded-[2rem] border border-red-50 shadow-sm active:bg-red-50 transition-all uppercase tracking-widest">
        退出登錄 / Sign Out
      </button>
      
      <div className="mt-12 text-center">
        <div className="inline-block px-4 py-1 rounded-full bg-stone-100 mb-2">
           <p className="text-[8px] text-stone-400 uppercase tracking-[0.3em] font-black">FamTrip Beta v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
