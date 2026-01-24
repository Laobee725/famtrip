import React, { useState, useRef, useEffect } from 'react';
import { Trip, Member, TripStay } from '../types';
import { getStayWeather, generateTripImage, generateTripIntro } from '../services/geminiService';

interface TripOverviewProps {
  trip: Trip | null;
  onUpdate: (updates: Partial<Trip>) => void;
}

const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Felix&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Aneka&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Max&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Luna&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Kiki&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Coco&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Mochi&backgroundColor=f0f4f7',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Toby&backgroundColor=f0f4f7',
];

const TripOverview: React.FC<TripOverviewProps> = ({ trip, onUpdate }) => {
  const [isAddingStay, setIsAddingStay] = useState(false);
  const [editingStay, setEditingStay] = useState<TripStay | null>(null);
  const [stayForm, setStayForm] = useState({ city: '', hotel: '', startDate: '', endDate: '' });
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingIntro, setIsGeneratingIntro] = useState(false);

  // 成員管理狀態
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberName, setMemberName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  
  const [isCroppingCover, setIsCroppingCover] = useState(false);
  const [rawCoverImage, setRawCoverImage] = useState<string | null>(null);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const cropZoneRef = useRef<HTMLDivElement>(null);

  if (!trip) return null;

  const handleAiGenerateIntro = async () => {
    setIsGeneratingIntro(true);
    const intro = await generateTripIntro(trip.destination, trip.season || '春天');
    onUpdate({ intro });
    setIsGeneratingIntro(false);
  };

  const openAddMember = () => {
    setEditingMember(null);
    setMemberName('');
    setSelectedAvatar(AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)]);
    setIsMemberModalOpen(true);
  };

  const openEditMember = (member: Member) => {
    setEditingMember(member);
    setMemberName(member.name);
    setSelectedAvatar(member.avatar || AVATAR_OPTIONS[0]);
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;

    let updatedMembers: Member[];
    if (editingMember) {
      updatedMembers = trip.members.map(m => 
        m.id === editingMember.id ? { ...m, name: memberName, avatar: selectedAvatar } : m
      );
    } else {
      updatedMembers = [
        ...trip.members, 
        { id: `m_${Date.now()}`, name: memberName, avatar: selectedAvatar }
      ];
    }

    onUpdate({ members: updatedMembers });
    setIsMemberModalOpen(false);
  };

  const handleDeleteMember = () => {
    if (!editingMember) return;
    if (trip.members.length <= 1) {
      alert("旅程至少需要一位成員喔！");
      return;
    }
    if (window.confirm(`確定要移除「${editingMember.name}」嗎？`)) {
      onUpdate({ members: trip.members.filter(m => m.id !== editingMember.id) });
      setIsMemberModalOpen(false);
    }
  };

  const handleAiGenerateCover = async () => {
    setIsGeneratingImage(true);
    const prompt = `${trip.destination} landmark, ${trip.season || 'spring'} scenery, cinematic travel photography`;
    const imageUrl = await generateTripImage(prompt);
    if (imageUrl) onUpdate({ image: imageUrl });
    setIsGeneratingImage(false);
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawCoverImage(reader.result as string);
        setCropPos({ x: 0, y: 0, scale: 1 });
        setIsCroppingCover(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const finalizeCoverCrop = () => {
    if (!rawCoverImage || !cropZoneRef.current) return;
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.src = rawCoverImage;
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = 1200; canvas.height = 1600;
      ctx.fillStyle = 'white'; ctx.fillRect(0,0,canvas.width,canvas.height);
      const zone = cropZoneRef.current!;
      const rect = zone.getBoundingClientRect();
      const scale = cropPos.scale;
      const drawWidth = img.width * (canvas.width / (rect.width * scale));
      const drawHeight = img.height * (canvas.width / (rect.width * scale));
      ctx.drawImage(img, (cropPos.x / rect.width) * canvas.width, (cropPos.y / rect.height) * canvas.height, drawWidth, drawHeight);
      onUpdate({ image: canvas.toDataURL('image/jpeg', 0.8) });
      setIsCroppingCover(false); setRawCoverImage(null);
    };
  };

  const openStayModal = (stay: TripStay | null) => {
    if (stay) {
      setStayForm({ city: stay.city, hotel: stay.hotel, startDate: stay.startDate, endDate: stay.endDate });
    } else {
      setStayForm({ city: '', hotel: '', startDate: trip.startDate, endDate: trip.endDate });
    }
    setEditingStay(stay);
    setIsAddingStay(true);
  };

  const handleSaveStay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = await getStayWeather(stayForm.city, stayForm.startDate);
    const stayObj = { id: editingStay?.id || Date.now().toString(), ...stayForm, ...data };
    const newStays = editingStay ? trip.stays.map(s => s.id === editingStay.id ? stayObj : s) : [...trip.stays, stayObj];
    onUpdate({ stays: newStays.sort((a,b) => a.startDate.localeCompare(b.startDate)) });
    setIsAddingStay(false);
  };

  return (
    <div className="bg-white min-h-screen pb-20 animate-fadeIn text-left">
      <section className="px-6 pt-10 pb-6 bg-white relative">
        <header className="border-t-2 border-b-2 border-stone-900 py-6 mb-10 flex justify-between items-center px-1">
          <div className="flex-1 text-left">
            <h1 className="text-3xl font-black tracking-tighter text-stone-900 leading-none mb-1 uppercase">FAMTRIP JOURNAL</h1>
            <p className="text-[9px] font-bold text-[#00A5BF] tracking-[0.2em]">家族の旅行記 · 旅の記憶</p>
          </div>
          <div className="text-right border-l border-stone-200 pl-6">
            <p className="text-xs font-black text-stone-900 leading-none uppercase tracking-tighter">VOL.{trip.startDate.split('-')[0]}</p>
            <p className="text-[8px] font-black text-stone-300 tracking-widest uppercase mt-1.5">FILE. {trip.id.slice(-4)}</p>
          </div>
        </header>

        <div className="relative group mb-12">
          <div 
            onClick={() => coverFileInputRef.current?.click()}
            className="relative w-full aspect-[3/4] bg-stone-50 overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] cursor-pointer active:scale-[0.99] transition-all"
          >
            {isGeneratingImage ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 animate-pulse">
                <i className="fa-solid fa-wand-magic-sparkles text-4xl text-[#00A5BF] mb-4"></i>
                <p className="text-xs font-black text-[#00A5BF] uppercase tracking-widest">AI 正在繪製封面...</p>
              </div>
            ) : (
              <img src={trip.image} className="w-full h-full object-cover grayscale-[0.1] contrast-[1.1]" />
            )}
            
            <div className="absolute inset-0 p-10 flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-6xl font-black text-white tracking-tighter leading-[0.85] drop-shadow-2xl">{trip.destination.split(',')[0]}</h2>
                  <div className="h-1 w-20 bg-[#00A5BF]"></div>
                </div>
                <p className="text-white font-bold text-xl leading-tight tracking-tight drop-shadow-md">{trip.title}</p>
              </div>
            </div>
            <input ref={coverFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileChange} />
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); handleAiGenerateCover(); }}
            className="absolute -bottom-6 right-6 w-14 h-14 rounded-2xl bg-white text-[#00A5BF] shadow-2xl flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-all z-20 border border-stone-100"
          >
            <i className={`fa-solid ${isGeneratingImage ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
          </button>
        </div>

        {/* AI 序言區 */}
        <div className="relative mt-8 px-4">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-white px-4">
             <i className="fa-solid fa-quote-left text-[#00A5BF] opacity-30 text-xs"></i>
          </div>
          <div className="border border-dashed border-stone-200 rounded-[2.5rem] p-10 text-center relative group">
             {trip.intro ? (
               <div className="space-y-4">
                 <p className="text-stone-600 font-bold leading-relaxed tracking-wide italic text-sm">
                   {trip.intro}
                 </p>
                 {!isGeneratingIntro && (
                   <button 
                     onClick={handleAiGenerateIntro}
                     className="text-[9px] font-black text-[#00A5BF] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all"
                   >
                     重新生成序詞
                   </button>
                 )}
               </div>
             ) : (
               <div className="py-4">
                 <p className="text-stone-300 text-xs font-bold mb-6 italic">「為這段冒險留下最初的共鳴...」</p>
                 <button 
                   onClick={handleAiGenerateIntro}
                   disabled={isGeneratingIntro}
                   className="bg-[#00A5BF]/5 text-[#00A5BF] px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2 mx-auto border border-[#00A5BF]/20"
                 >
                   <i className={`fa-solid ${isGeneratingIntro ? 'fa-spinner fa-spin' : 'fa-sparkles'}`}></i>
                   {isGeneratingIntro ? '思考中...' : '生成故事序言'}
                 </button>
               </div>
             )}
             {isGeneratingIntro && (
               <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-[2.5rem] flex items-center justify-center">
                 <div className="w-1.5 h-1.5 bg-[#00A5BF] rounded-full animate-ping"></div>
               </div>
             )}
          </div>
        </div>
      </section>

      <div className="bg-[#F0F4F7] px-6 py-12 space-y-12 rounded-t-[3rem] -mt-4 shadow-[0_-20px_40px_rgba(0,0,0,0.02)]">
        {/* 路線清單 */}
        <section>
          <div className="flex justify-between items-end mb-8 px-2">
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-[#00A5BF] font-black tracking-[0.2em] mb-1 uppercase">ROADMAP</span>
              <h3 className="text-3xl font-black text-gray-800 tracking-tighter leading-none">路線</h3>
            </div>
            <button onClick={() => openStayModal(null)} className="bg-white border border-gray-100 text-[#00A5BF] text-[10px] font-black px-6 py-3 rounded-full active:scale-95 transition-all shadow-sm">
              + 新增目的地
            </button>
          </div>

          <div className="space-y-4 pl-4 relative">
            <div className="absolute left-[3.5px] top-6 bottom-6 w-px border-l border-dashed border-gray-300"></div>
            {trip.stays.map((stay, idx) => (
              <div key={stay.id} onClick={() => openStayModal(stay)} className="relative group cursor-pointer bg-white px-6 py-6 rounded-[2rem] jp-shadow border border-white transition-all active:scale-[0.98]">
                <div className="absolute -left-[27px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-gray-800 z-10"></div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300 text-[9px] font-black uppercase tracking-[0.2em]">DESTINATION {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-[#00A5BF]">{stay.temp}°C</span>
                    <i className="fa-solid fa-cloud-sun text-[#00A5BF] opacity-30"></i>
                  </div>
                </div>
                <div className="flex items-baseline gap-4">
                  <h4 className="text-2xl font-black text-gray-800 tracking-tighter">{stay.city}</h4>
                  <p className="text-[11px] font-bold text-gray-400 truncate tracking-tight">{stay.hotel}</p>
                </div>
                <p className="text-[10px] font-black text-[#00A5BF] mt-2 uppercase tracking-widest">{stay.startDate.replace(/-/g,'.')} — {stay.endDate.replace(/-/g,'.')}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 成員清單 */}
        <section>
          <div className="flex justify-between items-end mb-8 px-2">
             <div className="flex flex-col text-left">
                <span className="text-[10px] text-[#00A5BF] font-black tracking-[0.2em] mb-1 uppercase">Travelers</span>
                <h3 className="text-3xl font-black text-gray-800 tracking-tighter leading-none">成員</h3>
             </div>
             <button onClick={openAddMember} className="bg-white border border-gray-100 text-[#00A5BF] text-[10px] font-black px-6 py-3 rounded-full active:scale-95 transition-all shadow-sm">
                + 新增成員
             </button>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] jp-shadow border border-white">
             <div className="flex flex-wrap gap-8 justify-start">
                {trip.members.map(m => (
                  <div 
                    key={m.id} 
                    onClick={() => openEditMember(m)}
                    className="flex flex-col items-center gap-3 group/member cursor-pointer active:scale-90 transition-all"
                  >
                    <div className="w-16 h-16 rounded-[1.2rem] bg-stone-50 p-0.5 border-2 border-transparent group-hover/member:border-[#00A5BF] transition-all overflow-hidden shadow-sm">
                      <img src={m.avatar || AVATAR_OPTIONS[0]} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[10px] font-black text-gray-800 tracking-widest uppercase">{m.name}</span>
                  </div>
                ))}
             </div>
          </div>
        </section>
      </div>

      {/* 成員管理 Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center animate-fadeIn text-left">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-md" onClick={() => setIsMemberModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-t-[4rem] p-10 shadow-2xl animate-slideUp">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black text-stone-900 tracking-tighter">
                 {editingMember ? '編輯成員' : '新增家庭成員'}
               </h3>
               <button onClick={() => setIsMemberModalOpen(false)} className="text-stone-300"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            
            <form onSubmit={handleSaveMember} className="space-y-8">
              <div className="flex flex-col items-center gap-6">
                <div className="w-24 h-24 rounded-[1.5rem] bg-stone-50 p-1 border-4 border-[#00A5BF] shadow-lg overflow-hidden">
                   <img src={selectedAvatar} className="w-full h-full object-contain" />
                </div>
                <div className="grid grid-cols-4 gap-2 w-full">
                  {AVATAR_OPTIONS.map(avatar => (
                    <button 
                      key={avatar} type="button" 
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`aspect-square rounded-xl p-1 border-2 transition-all ${selectedAvatar === avatar ? 'border-[#00A5BF] bg-[#00A5BF]/5' : 'border-transparent bg-stone-50'}`}
                    >
                      <img src={avatar} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-300 uppercase block mb-3 tracking-widest">成員名稱</label>
                <input 
                  autoFocus required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="如：爸爸、小花" 
                  className="w-full bg-stone-50 rounded-2xl px-6 py-4 font-black border-none outline-none focus:ring-2 focus:ring-[#00A5BF]" 
                />
              </div>

              <div className="flex flex-col gap-3">
                <button type="submit" className="w-full bg-stone-900 text-white py-5 rounded-full font-black text-[11px] shadow-xl uppercase tracking-widest">
                  儲存成員資訊
                </button>
                {editingMember && (
                  <button type="button" onClick={handleDeleteMember} className="text-red-400 font-black text-[10px] uppercase py-2">
                    移除此成員
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 封面裁切 Modal */}
      {isCroppingCover && rawCoverImage && (
        <div className="fixed inset-0 z-[250] bg-stone-900 flex flex-col items-center justify-center p-6 animate-fadeIn">
           <div className="w-full max-sm space-y-10 text-center">
              <h3 className="text-white font-black text-xl tracking-tighter uppercase">裁切故事本封面</h3>
              <div ref={cropZoneRef} className="w-full aspect-[3/4] bg-stone-800 relative overflow-hidden border-2 border-[#00A5BF] cursor-move touch-none"
                onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX - cropPos.x, y: e.clientY - cropPos.y }); }}
                onMouseMove={(e) => { if (isDragging) setCropPos(p => ({ ...p, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })); }}
                onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}
                onTouchStart={(e) => { setIsDragging(true); setDragStart({ x: e.touches[0].clientX - cropPos.x, y: e.touches[0].clientY - cropPos.y }); }}
                onTouchMove={(e) => { if (isDragging) setCropPos(p => ({ ...p, x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y })); }}
                onTouchEnd={() => setIsDragging(false)}
              >
                 <img src={rawCoverImage} className="absolute pointer-events-none select-none" style={{ transform: `translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropPos.scale})`, transformOrigin: 'center' }} />
              </div>
              <div className="px-8 space-y-8">
                 <input type="range" min="0.1" max="5" step="0.01" value={cropPos.scale} onChange={e => setCropPos(p => ({...p, scale: parseFloat(e.target.value)}))} className="w-full h-1 bg-stone-700 rounded-lg appearance-none accent-[#00A5BF]" />
                 <div className="flex gap-4">
                   <button onClick={() => setIsCroppingCover(false)} className="flex-1 py-4 rounded-full bg-white/5 text-stone-400 font-black text-[11px] tracking-widest uppercase">取消</button>
                   <button onClick={finalizeCoverCrop} className="flex-1 py-4 rounded-full bg-[#00A5BF] text-white font-black text-[11px] tracking-widest shadow-2xl uppercase">套用</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 住宿編輯 Modal */}
      {isAddingStay && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center animate-fadeIn text-left">
          <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={() => setIsAddingStay(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-t-[4rem] p-10 shadow-2xl animate-slideUp max-h-[90vh] overflow-y-auto no-scrollbar">
            <h3 className="text-2xl font-black text-stone-900 mb-8 tracking-tighter">編輯行程目的地</h3>
            <form onSubmit={handleSaveStay} className="space-y-6">
              <input required placeholder="目的地城市" value={stayForm.city} onChange={e => setStayForm({...stayForm, city: e.target.value})} className="w-full bg-stone-50 rounded-3xl px-6 py-4 font-black border-none outline-none focus:ring-2 focus:ring-[#00A5BF]" />
              <input required placeholder="飯店名稱" value={stayForm.hotel} onChange={e => setStayForm({...stayForm, hotel: e.target.value})} className="w-full bg-stone-50 rounded-3xl px-6 py-4 font-black border-none outline-none focus:ring-2 focus:ring-[#00A5BF]" />
              <div className="grid grid-cols-2 gap-4">
                <input type="date" required value={stayForm.startDate} onChange={e => setStayForm({...stayForm, startDate: e.target.value})} className="w-full bg-stone-50 rounded-2xl px-5 py-4 text-[10px] font-black" />
                <input type="date" required value={stayForm.endDate} onChange={e => setStayForm({...stayForm, endDate: e.target.value})} className="w-full bg-stone-50 rounded-2xl px-5 py-4 text-[10px] font-black" />
              </div>
              <button className="w-full bg-stone-900 text-white py-5 rounded-full font-black text-[11px] shadow-2xl uppercase tracking-widest">儲存目的地</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripOverview;