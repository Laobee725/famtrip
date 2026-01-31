import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trip, DayPlan, ItineraryEvent } from '../types';

interface PlannerViewProps {
  selectedTrip: Trip;
  onUpdate: (updates: Partial<Trip>) => void;
}

const CATEGORIES = [
  { id: 'transport', label: '交通', icon: 'fa-train-subway', color: 'text-blue-400' },
  { id: 'hotel', label: '住宿', icon: 'fa-bed', color: 'text-indigo-400' },
  { id: 'breakfast', label: '早餐', icon: 'fa-mug-saucer', color: 'text-orange-400' },
  { id: 'lunch', label: '午餐', icon: 'fa-utensils', color: 'text-amber-500' },
  { id: 'dinner', label: '晚餐', icon: 'fa-bowl-food', color: 'text-red-400' },
  { id: 'snack', label: '宵夜', icon: 'fa-cookie-bite', color: 'text-purple-400' },
  { id: 'attraction', label: '景點', icon: 'fa-camera-retro', color: 'text-emerald-500' },
  { id: 'shopping', label: '購物', icon: 'fa-bag-shopping', color: 'text-pink-400' },
];

const PlannerView: React.FC<PlannerViewProps> = ({ selectedTrip, onUpdate }) => {
  const [activeDay, setActiveDay] = useState(1);
  const [editingEvent, setEditingEvent] = useState<{ event: ItineraryEvent, day: number } | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isDayEditOpen, setIsDayEditOpen] = useState(false);
  const [tempTransport, setTempTransport] = useState(''); // 暫存交通方式輸入
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  
  const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  
  const [isCropping, setIsCropping] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [finalImageUrl, setFinalImageUrl] = useState<string | undefined>(undefined);
  
  const [fabY, setFabY] = useState<number | null>(null);
  const [isFabRetracted, setIsFabRetracted] = useState(false);
  const [isDraggingFab, setIsDraggingFab] = useState(false);
  const fabStartPos = useRef({ y: 0, currentY: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropZoneRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const start = new Date(selectedTrip.startDate);
  const end = new Date(selectedTrip.endDate);
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  const currentDayPlan = selectedTrip.itinerary.find(p => p.day === activeDay) || {
    day: activeDay,
    events: [],
    accommodation: '',
    transportMode: '',
    notes: ''
  };

  const detectedLinks = useMemo(() => {
    if (!currentDayPlan.notes) return [];
    const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;
    const matches = currentDayPlan.notes.match(urlRegex);
    if (!matches) return [];
    return [...new Set(matches)].map((url: string) => {
      let fullUrl = url;
      if (url.startsWith('www.')) fullUrl = 'https://' + url;
      let label = url;
      try {
        const urlObj = new URL(fullUrl);
        label = urlObj.hostname.replace('www.', '');
      } catch(e) {}
      return { label, fullUrl };
    });
  }, [currentDayPlan.notes]);

  useEffect(() => {
    if (editorRef.current) {
      const plan = selectedTrip.itinerary.find(p => p.day === activeDay);
      if (editorRef.current.innerHTML !== (plan?.notes || '')) {
        editorRef.current.innerHTML = plan?.notes || '';
      }
    }
  }, [activeDay]);

  const getCurrentDayInfo = () => {
    const currentDayDate = new Date(start.getTime() + (activeDay - 1) * 86400000);
    const dateStr = currentDayDate.toISOString().split('T')[0];
    const isLastDay = dateStr === end.toISOString().split('T')[0];
    const matchedStay = selectedTrip.stays?.find(s => dateStr >= s.startDate && dateStr < s.endDate);
    
    return {
      hotel: isLastDay ? '家' : (matchedStay ? matchedStay.hotel : '尚未設定住宿'),
      city: matchedStay?.city || selectedTrip.destination
    };
  };

  const formatDate = (dayNum: number) => {
    const date = new Date(start.getTime() + (dayNum - 1) * 86400000);
    const mm = date.getMonth() + 1;
    const dd = date.getDate();
    const dw = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
    return { dateStr: `${mm}/${dd}`, dayName: `(${dw})` };
  };

  const handleUpdateDayPlan = (updates: Partial<DayPlan>) => {
    const newItinerary = [...selectedTrip.itinerary];
    const idx = newItinerary.findIndex(p => p.day === activeDay);
    if (idx > -1) {
      newItinerary[idx] = { ...newItinerary[idx], ...updates };
    } else {
      newItinerary.push({ day: activeDay, events: [], accommodation: '', transportMode: '', notes: '', ...updates });
    }
    onUpdate({ itinerary: newItinerary });
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      handleUpdateDayPlan({ notes: editorRef.current.innerHTML });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedEventIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const requestDeleteEvent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEventToDeleteId(id);
  };

  const confirmDeleteEvent = () => {
    if (eventToDeleteId) {
      const next = selectedTrip.itinerary.map(p => ({
        ...p,
        events: p.events.filter(ev => ev.id !== eventToDeleteId)
      }));
      onUpdate({ itinerary: next });
      setEventToDeleteId(null);
    }
  };

  const confirmBatchDelete = () => {
    const newItinerary = selectedTrip.itinerary.map(plan => ({
      ...plan,
      events: plan.events.filter(ev => !selectedEventIds.has(ev.id))
    }));
    onUpdate({ itinerary: newItinerary });
    setSelectedEventIds(new Set());
    setIsBatchMode(false);
    setIsBatchDeleteModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImage(reader.result as string);
        setCropPos({ x: 0, y: 0, scale: 1 });
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const finalizeCrop = () => {
    if (!rawImage || !cropZoneRef.current) return;
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.src = rawImage;
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = 1280; 
      canvas.height = 720;
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
      setFinalImageUrl(canvas.toDataURL('image/jpeg', 0.8));
      setIsCropping(false);
      setRawImage(null);
    };
  };

  const handleSaveEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEvent) return;
    const fd = new FormData(e.currentTarget);
    const h = fd.get('hour') as string;
    const m = fd.get('minute') as string;
    const updatedEvent: ItineraryEvent = {
      ...editingEvent.event,
      id: editingEvent.event.id || Date.now().toString(),
      title: fd.get('title') as string,
      time: `${h.padStart(2, '0')}:${m.padStart(2, '0')}`,
      location: fd.get('location') as string,
      type: fd.get('type') as any,
      description: fd.get('description') as string,
      referenceUrl: fd.get('referenceUrl') as string,
      imageUrl: finalImageUrl || editingEvent.event.imageUrl
    };
    let newItinerary = [...selectedTrip.itinerary];
    newItinerary = newItinerary.map(plan => ({ ...plan, events: plan.events.filter(ev => ev.id !== updatedEvent.id) }));
    const targetIdx = newItinerary.findIndex(p => p.day === activeDay);
    if (targetIdx > -1) {
      newItinerary[targetIdx].events = [...newItinerary[targetIdx].events, updatedEvent].sort((a,b) => a.time.localeCompare(b.time));
    } else {
      newItinerary.push({ day: editingEvent.day, events: [updatedEvent], accommodation: '', transportMode: '', notes: '' });
    }
    onUpdate({ itinerary: newItinerary });
    setIsEventModalOpen(false);
    setFinalImageUrl(undefined);
    setRawImage(null);
  };

  const handleBatchMove = (targetDay: number) => {
    const eventsToMove: ItineraryEvent[] = [];
    let newItinerary = selectedTrip.itinerary.map(plan => {
      const filteredEvents = plan.events.filter(ev => {
        if (selectedEventIds.has(ev.id)) {
          eventsToMove.push(ev);
          return false;
        }
        return true;
      });
      return { ...plan, events: filteredEvents };
    });

    const targetIdx = newItinerary.findIndex(p => p.day === targetDay);
    if (targetIdx > -1) {
      newItinerary[targetIdx].events = [...newItinerary[targetIdx].events, ...eventsToMove].sort((a,b) => a.time.localeCompare(b.time));
    } else {
      newItinerary.push({ day: targetDay, events: eventsToMove.sort((a,b) => a.time.localeCompare(b.time)), accommodation: '', transportMode: '', notes: '' });
    }

    onUpdate({ itinerary: newItinerary });
    setSelectedEventIds(new Set());
    setIsBatchMode(false);
    setIsMoveModalOpen(false);
    setActiveDay(targetDay);
  };

  const handleFabTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isFabRetracted) return;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    setIsDraggingFab(false); 
    fabStartPos.current = { y: clientY, currentY: fabY || window.innerHeight - 192 };
  };

  const handleFabTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (isFabRetracted) return;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    const deltaY = clientY - fabStartPos.current.y;
    if (Math.abs(deltaY) > 5) {
      setIsDraggingFab(true);
      const nextY = Math.min(Math.max(80, fabStartPos.current.currentY + deltaY), window.innerHeight - 150);
      setFabY(nextY);
    }
  };

  const handleFabClick = (e: React.MouseEvent) => {
    if (isDraggingFab) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (isFabRetracted) {
      setIsFabRetracted(false);
      return;
    }
    setEditingEvent({ day: activeDay, event: { id: '', title: '', time: '10:00', location: '', type: 'attraction' } });
    setFinalImageUrl(undefined);
    setIsEventModalOpen(true);
  };

  const toggleRetract = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFabRetracted(!isFabRetracted);
  };

  const dayInfo = getCurrentDayInfo();

  return (
    <div className="min-h-screen pb-40 animate-fadeIn bg-[#F0F4F7]">
      <div className="bg-white px-6 pt-4 pb-2 sticky top-0 z-40 border-b border-gray-100">
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
          {daysArray.map(d => {
            const { dateStr, dayName } = formatDate(d);
            const isActive = activeDay === d;
            return (
              <button key={d} onClick={() => { setActiveDay(d); setSelectedEventIds(new Set()); }} className={`flex-shrink-0 w-20 py-3 rounded-3xl transition-all flex flex-col items-center justify-center ${isActive ? 'bg-[#00A5BF] text-white shadow-lg scale-105' : 'bg-gray-50 text-gray-400'}`}>
                <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'text-white/70' : 'text-gray-300'}`}>DAY {d}</span>
                <span className="text-sm font-black mt-0.5">{dateStr}</span>
                <span className="text-[10px] font-bold">{dayName}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {!isBatchMode && (
          <section className="bg-white rounded-[2.5rem] p-8 jp-shadow border border-white transition-all text-left">
            <div className="flex justify-between items-start mb-6">
               <h3 className="text-xs font-black text-[#00A5BF] uppercase tracking-[0.2em]">Daily Summary</h3>
            </div>
            
            {currentDayPlan.events.length > 0 ? (
               <div className="mb-8 overflow-x-auto no-scrollbar">
                  <p className="text-[9px] font-black text-gray-300 uppercase mb-4 tracking-[0.15em]">Schedule Highlights</p>
                  <div className="flex items-center gap-3 min-w-max pb-2">
                     {currentDayPlan.events.map((ev, idx) => (
                        <React.Fragment key={idx}>
                          <div className="bg-gray-50 px-4 py-2.5 rounded-2xl flex items-center gap-2 border border-gray-100 shadow-sm transition-transform active:scale-95">
                             <span className="text-[10px] font-black text-[#00A5BF]">{ev.time}</span>
                             <span className="text-xs font-black text-gray-700">{ev.title}</span>
                          </div>
                          {idx < currentDayPlan.events.length - 1 && (
                            <i className="fa-solid fa-arrow-right-long text-gray-200 text-xs px-1"></i>
                          )}
                        </React.Fragment>
                     ))}
                  </div>
               </div>
            ) : (
               <div className="mb-8 p-6 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200 text-center">
                  <p className="text-[10px] font-black text-gray-300 uppercase">此天尚無任何行程規劃</p>
               </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
               <div className="bg-indigo-50/40 p-4 rounded-2xl flex items-start gap-3 border border-indigo-100/30">
                  <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center shadow-sm ${dayInfo.hotel === '家' ? 'bg-emerald-500' : 'bg-indigo-500'} text-white`}>
                    <i className={`fa-solid ${dayInfo.hotel === '家' ? 'fa-house-chimney' : 'fa-bed'} text-xs`}></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-indigo-300 uppercase leading-none mb-1.5">{dayInfo.hotel === '家' ? 'Dest' : 'Stay'}</p>
                    <p className="text-[11px] font-black text-indigo-900 leading-tight break-words">{dayInfo.hotel}</p>
                  </div>
               </div>
               <div onClick={() => { setTempTransport(currentDayPlan.transportMode || ''); setIsDayEditOpen(true); }} className="bg-blue-50/40 p-4 rounded-2xl flex items-start gap-3 cursor-pointer active:scale-95 transition-all border border-blue-100/30 relative">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-sm">
                    <i className="fa-solid fa-route text-xs"></i>
                  </div>
                  <div className="min-w-0 flex-grow pr-3">
                    <p className="text-[8px] font-black text-blue-300 uppercase leading-none mb-1.5">Trans</p>
                    <p className="text-[11px] font-black text-blue-900 leading-tight break-words">{currentDayPlan.transportMode || '尚未設定'}</p>
                  </div>
                  <i className="fa-solid fa-chevron-right text-[8px] text-blue-200 absolute top-4 right-4"></i>
               </div>
            </div>
          </section>
        )}

        <div className="flex justify-between items-end px-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-gray-800 tracking-tighter text-left">行程細節</h3>
            <span className="text-[10px] text-gray-300 font-bold uppercase">Timeline</span>
          </div>
          <button onClick={() => { setIsBatchMode(!isBatchMode); setSelectedEventIds(new Set()); }} className={`text-xs font-black px-5 py-2 rounded-full shadow-sm transition-all ${isBatchMode ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {isBatchMode ? '取消' : '移動/刪除'}
          </button>
        </div>

        <div className="relative">
          {currentDayPlan.events.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] p-10 text-center border-2 border-dashed border-gray-100 animate-fadeIn">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-pen-nib text-3xl text-gray-200"></i>
              </div>
              <h4 className="text-lg font-black text-gray-800 mb-2">準備好要規劃這一天了嗎？</h4>
              <p className="text-gray-400 font-bold mb-8 leading-relaxed text-xs">拿出您的筆記，開始填滿這趟精彩的旅程吧！</p>
              
              <div className="flex flex-col gap-4 max-w-[240px] mx-auto">
                 <button onClick={() => { setEditingEvent({ day: activeDay, event: { id: '', title: '', time: '10:00', location: '', type: 'attraction' } }); setIsEventModalOpen(true); }} 
                         className="bg-[#00A5BF] text-white py-4 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                   <i className="fa-solid fa-plus-circle text-base"></i> 新增行程項目
                 </button>
              </div>
            </div>
          ) : (
            <div className="space-y-0 relative">
              {currentDayPlan.events.map((event, idx) => {
                const cat = CATEGORIES.find(c => c.id === event.type);
                const isSelected = selectedEventIds.has(event.id);
                return (
                  <div key={event.id} className="relative flex gap-6 pb-12 last:pb-0 text-left group">
                    <div className="flex flex-col items-center">
                      <div className="z-10 bg-white border-2 border-gray-100 text-gray-400 text-[10px] font-black px-2 py-0.5 rounded-md mb-2">{event.time}</div>
                      <div onClick={() => isBatchMode && toggleSelection(event.id)} className={`w-12 h-12 rounded-full border-2 jp-shadow z-10 flex items-center justify-center text-white transition-all cursor-pointer ${isBatchMode && isSelected ? 'bg-orange-500 border-white' : isBatchMode ? 'bg-gray-200 border-white' : `border-white ${cat?.color.replace('text-', 'bg-')}`}`}>
                         {isBatchMode && isSelected ? <i className="fa-solid fa-check"></i> : <i className={`fa-solid ${cat?.icon} text-lg`}></i>}
                      </div>
                      {idx !== currentDayPlan.events.length - 1 && <div className="w-0.5 flex-grow border-l-2 border-dashed border-gray-200 my-2"></div>}
                    </div>
                    
                    <div onClick={() => isBatchMode ? toggleSelection(event.id) : (setEditingEvent({ event, day: activeDay }), setFinalImageUrl(event.imageUrl), setIsEventModalOpen(true))} className={`flex-grow bg-white p-0 rounded-[2.5rem] jp-shadow border transition-all cursor-pointer ${isSelected ? 'border-orange-200 ring-4 ring-orange-50' : 'border-white'} overflow-hidden relative`}>
                       {!isBatchMode && (
                         <button onClick={(e) => requestDeleteEvent(e, event.id)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center border-2 border-white shadow-lg opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 z-30 active:scale-125">
                            <i className="fa-solid fa-trash-can text-[10px]"></i>
                         </button>
                       )}
                       {event.imageUrl && (
                         <div className="w-full h-36 relative">
                            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                         </div>
                       )}
                       <div className="p-6 relative">
                          <div className="flex justify-between items-start mb-2 pr-4 transition-all group-hover:pr-10">
                             <span className="text-[9px] font-black px-2 py-1 rounded uppercase bg-gray-50 text-gray-400 tracking-widest">{cat?.label}</span>
                          </div>
                          <h4 className="font-black text-gray-800 text-lg leading-tight mb-1">{event.title}</h4>
                          <p className="text-xs text-[#00A5BF] font-bold flex items-center gap-1"><i className="fa-solid fa-location-dot text-[10px]"></i>{event.location}</p>
                          {event.description && <p className="text-[11px] text-gray-400 mt-4 italic border-t border-gray-50 pt-3">{event.description}</p>}
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!isBatchMode && (
          <section className="mt-12 animate-fadeIn text-left">
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-gray-800 tracking-tighter">旅途隨記</h3>
                <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Scrapbook Notes</span>
              </div>
            </div>
            
            <div className="relative group">
              <div className="bg-[#FDFBF7] rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-stone-100 relative overflow-hidden">
                <div
                  ref={editorRef}
                  contentEditable
                  className="w-full bg-transparent border-none outline-none font-black text-stone-700 text-lg leading-relaxed min-h-[220px] placeholder:text-stone-200 relative z-10 text-left focus:ring-0"
                  onBlur={(e) => handleUpdateDayPlan({ notes: (e.target as HTMLDivElement).innerHTML })}
                  data-placeholder="在此自由紀錄網址、景點筆記..."
                ></div>
              </div>
            </div>
          </section>
        )}
      </div>

      {isBatchMode && selectedEventIds.size > 0 && (
        <div className="fixed bottom-24 left-6 right-6 z-[120] bg-white rounded-[2rem] p-4 shadow-2xl border border-orange-100 flex items-center justify-between animate-slideUp">
          <div className="flex flex-col pl-4">
             <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">已選取 {selectedEventIds.size} 個項目</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsMoveModalOpen(true)} className="bg-blue-500 text-white px-5 py-3 rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
               移動至其他天
            </button>
            <button onClick={() => setIsBatchDeleteModalOpen(true)} className="bg-red-500 text-white px-5 py-3 rounded-xl text-xs font-black shadow-lg shadow-red-500/20 active:scale-95 transition-all">
               刪除所選
            </button>
          </div>
        </div>
      )}

      {/* 移動至其他天對話框 - 更新為包含日期與星期 */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setIsMoveModalOpen(false)}></div>
          <div className="relative w-full max-sm bg-white rounded-[2.5rem] p-8 shadow-2xl animate-slideUp text-center">
            <h4 className="text-xl font-black text-gray-800 mb-6">移動到哪一天？</h4>
            <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto p-2 no-scrollbar">
               {daysArray.map(d => {
                 const { dateStr, dayName } = formatDate(d);
                 const isCurrent = d === activeDay;
                 return (
                   <button 
                     key={d} 
                     onClick={() => handleBatchMove(d)} 
                     disabled={isCurrent} 
                     className={`py-3 rounded-2xl font-black transition-all flex flex-col items-center justify-center border-2 ${
                       isCurrent 
                        ? 'bg-gray-50 border-gray-100 text-gray-300' 
                        : 'bg-white border-blue-50 text-blue-500 active:scale-95'
                     }`}
                   >
                      <span className="text-[9px] uppercase tracking-tighter mb-0.5">Day {d}</span>
                      <span className="text-sm">{dateStr}</span>
                      <span className="text-[9px] opacity-60 font-bold">{isCurrent ? '當前' : dayName}</span>
                   </button>
                 );
               })}
            </div>
            <button onClick={() => setIsMoveModalOpen(false)} className="w-full mt-8 bg-gray-50 text-gray-400 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all tracking-widest uppercase">關閉</button>
          </div>
        </div>
      )}

      {/* 批次刪除對話框 */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setIsBatchDeleteModalOpen(false)}></div>
          <div className="relative w-full max-w-xs bg-white rounded-[2.5rem] p-8 shadow-2xl animate-slideUp text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl shadow-inner">
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <h4 className="text-lg font-black text-gray-800 mb-2">確定刪除選中的項目？</h4>
            <p className="text-xs text-gray-400 font-bold leading-relaxed mb-8">這將一次移除 {selectedEventIds.size} 個行程項目。</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmBatchDelete} className="w-full bg-red-500 text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all">確認批次刪除</button>
              <button onClick={() => setIsBatchDeleteModalOpen(false)} className="w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all">再想想看</button>
            </div>
          </div>
        </div>
      )}

      {/* 單一項目刪除對話框 */}
      {eventToDeleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setEventToDeleteId(null)}></div>
          <div className="relative w-full max-w-xs bg-white rounded-[2.5rem] p-8 shadow-2xl animate-slideUp text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
              <i className="fa-solid fa-circle-exclamation"></i>
            </div>
            <h4 className="text-lg font-black text-gray-800 mb-2">確定要刪除嗎？</h4>
            <p className="text-xs text-gray-400 font-bold leading-relaxed mb-8">這個行程項目將會從時間軸消失。</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDeleteEvent} className="w-full bg-red-500 text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all">狠心刪除</button>
              <button onClick={() => setEventToDeleteId(null)} className="w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all">再想想看</button>
            </div>
          </div>
        </div>
      )}

      {!isBatchMode && (
        <div 
          style={{ 
            top: fabY !== null ? `${fabY}px` : undefined,
            transform: isFabRetracted ? 'translateX(75%)' : 'translateX(0)' 
          }}
          className={`fixed right-0 z-50 flex items-center transition-all duration-500 ease-out ${fabY === null ? 'bottom-48' : ''}`}
          onTouchStart={handleFabTouchStart}
          onTouchMove={handleFabTouchMove}
          onMouseDown={handleFabTouchStart}
          onMouseMove={handleFabTouchMove}
        >
          <button 
            onClick={toggleRetract}
            className={`w-8 h-12 bg-[#00A5BF]/20 backdrop-blur-md rounded-l-2xl flex items-center justify-center text-[#00A5BF] transition-opacity ${isFabRetracted ? 'opacity-100' : 'opacity-0'}`}
          >
            <i className={`fa-solid ${isFabRetracted ? 'fa-chevron-left' : 'fa-chevron-right'} text-[10px]`}></i>
          </button>
          <button 
            onClick={handleFabClick} 
            className={`w-16 h-16 rounded-[1.75rem] bg-[#00A5BF] text-white flex items-center justify-center text-3xl shadow-[0_12px_24px_rgba(0,165,191,0.4)] active:scale-90 transition-all cursor-pointer border-2 border-white/40 mr-8 ${isFabRetracted ? 'opacity-50' : 'opacity-100'}`}
          >
            <i className="fa-solid fa-plus pointer-events-none"></i>
          </button>
        </div>
      )}

      {isCropping && rawImage && (
        <div className="fixed inset-0 z-[250] bg-black/95 flex flex-col items-center justify-center p-6 animate-fadeIn text-center">
           <div className="w-full max-md space-y-8">
              <h3 className="text-white font-black text-xl tracking-tighter uppercase">裁切行程照片</h3>
              <div ref={cropZoneRef} className="w-full aspect-video bg-gray-900 relative overflow-hidden rounded-2xl border-2 border-[#00A5BF] cursor-move touch-none"
                   onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX - cropPos.x, y: e.clientY - cropPos.y }); }}
                   onMouseMove={(e) => { if (isDragging) setCropPos(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })); }}
                   onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}
                   onTouchStart={(e) => { setIsDragging(true); setDragStart({ x: e.touches[0].clientX - cropPos.x, y: e.touches[0].clientY - cropPos.y }); }}
                   onTouchMove={(e) => { if (isDragging) setCropPos(prev => ({ ...prev, x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y })); }}
                   onTouchEnd={() => setIsDragging(false)}>
                 <img src={rawImage} alt="raw" className="absolute pointer-events-none select-none max-w-none w-full"
                      style={{ transform: `translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropPos.scale})`, transformOrigin: 'top left' }} />
              </div>
              <div className="px-4 space-y-4">
                 <input type="range" min="0.1" max="5" step="0.01" value={cropPos.scale} onChange={e => setCropPos(prev => ({...prev, scale: parseFloat(e.target.value)}))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none accent-[#00A5BF]" />
              </div>
              <div className="flex gap-4">
                 <button onClick={() => { setIsCropping(false); setRawImage(null); }} className="flex-1 py-4 rounded-2xl bg-white/10 text-white font-black cursor-pointer uppercase text-xs tracking-widest">放棄</button>
                 <button onClick={finalizeCrop} className="flex-1 py-4 rounded-2xl bg-[#00A5BF] text-white font-black shadow-xl cursor-pointer uppercase text-xs tracking-widest">確認裁切</button>
              </div>
           </div>
        </div>
      )}

      {isEventModalOpen && editingEvent && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center animate-fadeIn text-left">
          <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={() => { setIsEventModalOpen(false); setFinalImageUrl(undefined); }}></div>
          <div className="relative w-full max-w-md bg-white rounded-t-[3.5rem] p-8 pb-12 shadow-2xl animate-slideUp overflow-y-auto max-h-[95vh] no-scrollbar">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-gray-800">{editingEvent.event.id ? '編輯行程' : '新增行程'}</h3>
                <button onClick={() => { setIsEventModalOpen(false); setFinalImageUrl(undefined); }} className="text-gray-300"><i className="fa-solid fa-xmark text-xl"></i></button>
             </div>
             <form onSubmit={handleSaveEvent} className="space-y-6">
                <div className="relative group">
                   <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-video bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-gray-100 transition-all">
                      {finalImageUrl ? ( <img src={finalImageUrl} className="w-full h-full object-cover" /> ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#00A5BF] shadow-sm mb-3">
                             <i className="fa-solid fa-camera"></i>
                          </div>
                          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest text-center">上傳景點照片</p>
                        </>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                   </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-300 uppercase block mb-4 tracking-widest">行程類別</label>
                  <div className="grid grid-cols-4 gap-3">
                    {CATEGORIES.map(c => (
                      <label key={c.id} className="cursor-pointer text-center">
                        <input type="radio" name="type" value={c.id} defaultChecked={editingEvent.event.type === c.id} className="hidden peer" />
                        <div className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all border-transparent peer-checked:border-[#00A5BF] peer-checked:bg-[#00A5BF]/5 ${c.color}`}>
                           <i className={`fa-solid ${c.icon} text-lg`}></i>
                           <span className="text-[9px] font-black">{c.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-stone-300 uppercase block mb-2">時間</label>
                    <div className="flex gap-2 items-center bg-gray-50 rounded-2xl px-4 py-3">
                       <select name="hour" defaultValue={editingEvent.event.time.split(':')[0]} className="flex-1 bg-transparent font-black text-sm outline-none border-none">
                         {Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                       </select>
                       <span className="font-black text-gray-300">:</span>
                       <select name="minute" defaultValue={editingEvent.event.time.split(':')[1]} className="flex-1 bg-transparent font-black text-sm outline-none border-none">
                         {Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-stone-300 uppercase block mb-2">天數</label>
                    <div className="bg-gray-100 rounded-2xl px-5 py-3 font-black text-sm text-stone-400 flex justify-between items-center h-[46px]">
                       <span>Day {editingEvent.day}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                   <input name="title" required placeholder="行程名稱" defaultValue={editingEvent.event.title} className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-black border-none outline-none focus:ring-2 focus:ring-[#00A5BF]" />
                   <input name="location" required placeholder="地點地標" defaultValue={editingEvent.event.location} className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-black border-none outline-none focus:ring-2 focus:ring-[#00A5BF]" />
                   <textarea name="description" rows={2} placeholder="筆記資訊..." defaultValue={editingEvent.event.description} className="w-full bg-gray-50 rounded-2xl px-6 py-4 font-black border-none outline-none focus:ring-2 focus:ring-[#00A5BF]"></textarea>
                </div>
                <button className="w-full bg-[#00A5BF] text-white py-5 rounded-[2rem] font-black shadow-xl active:scale-95 transition-all cursor-pointer">儲存行程</button>
             </form>
          </div>
        </div>
      )}

      {isDayEditOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 animate-fadeIn text-center">
           <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsDayEditOpen(false)}></div>
           <div className="relative w-full max-sm bg-white rounded-[3rem] p-10 shadow-2xl scale-in border border-white">
              <h4 className="text-xl font-black text-gray-800 mb-8 tracking-tighter">Day {activeDay} 設定</h4>
              <div className="space-y-6 text-left">
                 <div>
                    <label className="text-[10px] font-black text-stone-300 uppercase block mb-2 tracking-widest">主要交通方式</label>
                    <input 
                      autoFocus 
                      value={tempTransport} 
                      placeholder="例如：地鐵、租車自駕" 
                      className="w-full bg-gray-50 rounded-2xl px-5 py-4 font-black text-sm border-none focus:ring-2 focus:ring-[#00A5BF] outline-none shadow-inner"
                      onChange={e => setTempTransport(e.target.value)} 
                    />
                 </div>
              </div>
              <button 
                onClick={() => { handleUpdateDayPlan({ transportMode: tempTransport }); setIsDayEditOpen(false); }} 
                className="w-full mt-10 bg-[#00A5BF] text-white py-5 rounded-2xl font-black text-sm shadow-xl cursor-pointer uppercase tracking-widest active:scale-95 transition-all"
              >
                儲存設定
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default PlannerView;