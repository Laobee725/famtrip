import React, { useState, useRef } from 'react';
import { Trip, Member, TripStay } from '../types';
import { getStayWeather } from '../services/geminiService';
import { TRAVEL_QUOTES } from '../constants/quotes';

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
  // 每次訪問首頁隨機產生一句話
  const [randomQuote] = useState(() => TRAVEL_QUOTES[Math.floor(Math.random() * TRAVEL_QUOTES.length)]);

  const [isAddingStay, setIsAddingStay] = useState(false);
  const [editingStay, setEditingStay] = useState<TripStay | null>(null);
  const [stayForm, setStayForm] = useState({ city: '', hotel: '', startDate: '', endDate: '' });

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
      
      canvas.width = 1200; 
      canvas.height = 1600;
      ctx.fillStyle = 'white'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const zone = cropZoneRef.current!;
      const rect = zone.getBoundingClientRect();
      const ratio = canvas.width / rect.width;

      const drawWidth = canvas.width * cropPos.scale;
      const drawHeight = (img.naturalHeight / img.naturalWidth) * drawWidth;
      const drawX = cropPos.x * ratio;
      const drawY = cropPos.y * ratio;

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      
      onUpdate({ image: canvas.toDataURL('image/jpeg', 0.8) });
      setIsCroppingCover(false); 
      setRawCoverImage(null);
    };
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
    let updatedMembers = editingMember 
      ? trip.members.map(m => m.id === editingMember.id ? { ...m, name: memberName, avatar: selectedAvatar } : m)
      : [...trip.members, { id: `m_${Date.now()}`, name: memberName, avatar: selectedAvatar }];
    onUpdate({ members: updatedMembers });
    setIsMemberModalOpen(false);
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
      <section className="px-6 pt-10 pb-6 bg-white relative text-left">
        <header className="border-t-2 border-b-2 border-stone-900 py-6 mb-10 flex justify-between items-center px-1">
          <div className="flex-1 text-left">
            <h1 className="text-2xl font-black tracking-tighter text-stone-900 leading-none mb-1 uppercase text-left">FAMTRIP JOURNAL</h1>
            <p className="text-[9px] font-bold text-[#00A5BF] tracking-[0.2em] text-left">家族の旅行記 · 旅の記憶</p>
          </div>
          <div className="text-right border-l border-stone-200 pl-6">
            <p className="text-xs font-black text-stone-900 leading-none uppercase tracking-tighter">VOL.{trip.startDate.split('-')[0]}</p>
            <p className="text-[8px] font-black text-stone-300 tracking-widest uppercase mt-1.5">FILE. {trip.id.slice(-4)}</p>
          </div>
        </header>

        <div className="relative group mb-12">
          <div 
            onClick={() => coverFileInputRef.current?.click()}
            className="relative w-full aspect-[3/4] bg-stone-50 overflow-hidden shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] cursor-pointer active:scale-[0.99] transition-all rounded-sm"
          >
            <img src={trip.image} className="w-full h-full object-cover grayscale-[0.05] contrast-[1.05]" />
            <div className="absolute inset-0 p-8 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent">
              <div className="space-y-4 text-left">
                <div className="space-y-2 text-left">
                  <h2 className="text-6xl font-black text-white tracking-tighter leading-[0.85] drop-shadow-2xl text-left">{trip.destination.split(',')[0]}</h2>
                  <div className="h-1.5 w-16 bg-[#00A5BF]"></div>
                </div>
                <p className="text-white/90 font-bold text-lg leading-tight tracking-tight drop-shadow-md max-w-[80%] text-left">{trip.title}</p>
              </div>
            </div>
            <input ref={coverFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileChange} />
          </div>
        </div>

        <div className="relative mt-8 px-2 text-center">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-white px-4">
             <i className="fa-solid fa-quote-left text-[#00A5BF] opacity-30 text-xs"></i>
          </div>
          <div className="border border-dashed border-stone-200 rounded-[2.5rem] p-10 relative bg-stone-50/30 min-h-[100px] flex items-center justify-center">
             <p className="text-stone-600 font-bold leading-relaxed tracking-wide italic text-sm">
               {randomQuote}
             </p>
          </div>
        </div>
      </section>

      <div className="bg-[#F0F4F7] px-6 py-12 space-y-12 rounded-t-[3.5rem] -mt-6 shadow-[0_-25px_50px_rgba(0,0,0,0.03)] border-t border-white text-left">
        <section className="text-left">
          <div className="flex justify-between items-end mb-8 px-2">
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-[#00A5BF] font-black tracking-[0.2em] mb-1 uppercase text-left">ROADMAP</span>
              <h3 className="text-3xl font-black text-gray-800 tracking-tighter leading-none text-left">路線</h3>
            </div>
            <button onClick={() => openStayModal(null)} className="bg-white border border-gray-100 text-[#00A5BF] text-[10px] font-black px-6 py-3 rounded-full active:scale-95 transition-all shadow-sm">
              + 新增目的地
            </button>
          </div>
          <div className="space-y-4 pl-4 relative text-left">
            <div className="absolute left-[3.5px] top-6 bottom-6 w-px border-l border-dashed border-gray-300"></div>
            {trip.stays.map((stay, idx) => (
              <div key={stay.id} onClick={() => openStayModal(stay)} className="relative group cursor-pointer bg-white px-8 py-7 rounded-[2.5rem] jp-shadow border border-white transition-all active:scale-[0.98] text-left">
                <div className="absolute -left-[27px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-gray-800 z-10"></div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-300 text-[9px] font-black uppercase tracking-[0.2em]">DESTINATION {idx + 1}</span>
                </div>
                <div className="flex items-baseline gap-4 text-left">
                  <h4 className="text-3xl font-black text-gray-800 tracking-tighter text-left">{stay.city}</h4>
                  <p className="text-[11px] font-bold text-gray-400 truncate tracking-tight text-left">{stay.hotel}</p>
                </div>
                
                <div className="flex gap-6 mt-4">
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-0.5">Check In</span>
                    <span className="text-[11px] font-black text-[#00A5BF] tracking-widest">{stay.startDate.replace(/-/g, '.')}</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-0.5">Check Out</span>
                    <span className="text-[11px] font-black text-[#00A5BF] tracking-widest">{stay.endDate.replace(/-/g, '.')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="text-left">
          <div className="flex justify-between items-end mb-8 px-2">
             <div className="flex flex-col text-left">
                <span className="text-[10px] text-[#00A5BF] font-black tracking-[0.2em] mb-1 uppercase text-left">Travelers</span>
                <h3 className="text-3xl font-black text-gray-800 tracking-tighter leading-none text-left">成員</h3>
             </div>
             <button onClick={openAddMember} className="bg-white border border-gray-100 text-[#00A5BF] text-[10px] font-black px-6 py-3 rounded-full active:scale-95 transition-all shadow-sm">
                + 新增成員
             </button>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] jp-shadow border border-white">
             <div className="flex flex-wrap gap-8 justify-start">
                {trip.members.map(m => (
                  <div key={m.id} onClick={() => openEditMember(m)} className="flex flex-col items-center gap-3 group/member cursor-pointer active:scale-90 transition-all">
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
                 <img src={rawCoverImage} className="absolute pointer-events-none select-none max-w-none w-full" 
                      style={{ transform: `translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropPos.scale})`, transformOrigin: 'top left' }} />
              </div>
              <div className="px-8 space-y-8">
                 <input type="range" min="0.1" max="5" step="0.01" value={cropPos.scale} onChange={e => setCropPos(p => ({...p, scale: parseFloat(e.target.value)}))} className="w-full h-1 bg-stone-700 rounded-lg appearance-none accent-[#00A5BF]" />
                 <div className="flex gap-4">
                   <button onClick={() => { setIsCroppingCover(false); setRawCoverImage(null); }} className="flex-1 py-4 rounded-full bg-white/5 text-stone-400 font-black text-[11px] tracking-widest uppercase">放棄</button>
                   <button onClick={finalizeCoverCrop} className="flex-1 py-4 rounded-full bg-[#00A5BF] text-white font-black text-[11px] tracking-widest shadow-2xl uppercase">套用裁切</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isMemberModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center animate-fadeIn text-left">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-md" onClick={() => setIsMemberModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-t-[4rem] p-10 shadow-2xl animate-slideUp text-left">
            <h3 className="text-2xl font-black text-stone-900 tracking-tighter mb-8 text-left">{editingMember ? '編輯成員' : '新增家庭成員'}</h3>
            <form onSubmit={handleSaveMember} className="space-y-8 text-center">
              <img src={selectedAvatar} className="w-24 h-24 mx-auto rounded-3xl bg-stone-50 p-1 border-4 border-[#00A5BF]" />
              <input autoFocus required value={memberName} onChange={e => setMemberName(e.target.value)} placeholder="成員名稱" className="w-full bg-stone-50 rounded-2xl px-6 py-4 font-black border-none outline-none focus:ring-2 focus:ring-[#00A5BF]" />
              <button type="submit" className="w-full bg-stone-900 text-white py-5 rounded-full font-black text-[11px] uppercase tracking-widest">儲存變更</button>
            </form>
          </div>
        </div>
      )}

      {isAddingStay && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center animate-fadeIn text-left">
          <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={() => setIsAddingStay(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-t-[4rem] p-10 shadow-2xl animate-slideUp text-left">
            <h3 className="text-2xl font-black text-stone-900 mb-8 tracking-tighter text-left">編輯行程目的地</h3>
            <form onSubmit={handleSaveStay} className="space-y-6">
              <input required placeholder="目的地城市" value={stayForm.city} onChange={e => setStayForm({...stayForm, city: e.target.value})} className="w-full bg-stone-50 rounded-3xl px-6 py-4 font-black border-none outline-none focus:ring-2 focus:ring-[#00A5BF]" />
              <input required placeholder="飯店名稱" value={stayForm.hotel} onChange={e => setStayForm({...stayForm, hotel: e.target.value})} className="w-full bg-stone-50 rounded-3xl px-6 py-4 font-black border-none outline-none focus:ring-2 focus:ring-[#00A5BF]" />
              <div className="grid grid-cols-2 gap-4">
                 <input type="date" required value={stayForm.startDate} onChange={e => setStayForm({...stayForm, startDate: e.target.value})} className="bg-stone-50 p-4 rounded-2xl text-[10px] font-black" />
                 <input type="date" required value={stayForm.endDate} onChange={e => setStayForm({...stayForm, endDate: e.target.value})} className="bg-stone-50 p-4 rounded-2xl text-[10px] font-black" />
              </div>
              <button className="w-full bg-stone-900 text-white py-5 rounded-full font-black text-[11px] uppercase tracking-widest">儲存目的地</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripOverview;
