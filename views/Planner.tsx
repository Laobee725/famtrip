
import React, { useState, useEffect, useRef } from 'react';
import { Trip, DayPlan, ItineraryEvent } from '../types';
import { getDaySuggestions } from '../services/geminiService';

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

const LOADING_MESSAGES = [
  "正在掃描您的旅行地圖...",
  "正在為您尋找靈感...",
  "AI 秘書正在翻閱在地地圖...",
  "正在優化移動動線建議..."
];

const PlannerView: React.FC<PlannerViewProps> = ({ selectedTrip, onUpdate }) => {
  const [activeDay, setActiveDay] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [editingEvent, setEditingEvent] = useState<{ event: ItineraryEvent, day: number } | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isDayEditOpen, setIsDayEditOpen] = useState(false);
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropZoneRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const [suggestions, setSuggestions] = useState<Partial<ItineraryEvent>[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const start = new Date(selectedTrip.startDate);
  const end = new Date(selectedTrip.endDate);
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    setSuggestions([]);
    setShowSuggestions(false);
  }, [activeDay]);

  useEffect(() => {
    if (editorRef.current) {
      const plan = selectedTrip.itinerary.find(p => p.day === activeDay);
      editorRef.current.innerHTML = plan?.notes || '';
    }
  }, [activeDay, selectedTrip.itinerary]);

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

  const currentDayPlan = selectedTrip.itinerary.find(p => p.day === activeDay) || {
    day: activeDay,
    events: [],
    accommodation: '',
    transportMode: '',
    notes: ''
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
      canvas.width = 800; canvas.height = 450;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const zone = cropZoneRef.current!;
        const rect = zone.getBoundingClientRect();
        const scale = cropPos.scale;
        const drawWidth = img.width * (canvas.width / (rect.width * scale));
        const drawHeight = img.height * (canvas.width / (rect.width * scale));
        const drawX = (cropPos.x / rect.width) * canvas.width;
        const drawY = (cropPos.y / rect.height) * (canvas.width * (rect.height/rect.width));
        ctx.drawImage(img, drawX * (800/rect.width/scale), drawY * (450/rect.height/scale), drawWidth, drawHeight);
        setFinalImageUrl(canvas.toDataURL('image/jpeg', 0.8));
        setIsCropping(false);
      }
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
    const targetIdx = newItinerary.findIndex(p => p.day === editingEvent.day);
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

  const handleAiSuggestions = async () => {
    setIsGenerating(true);
    const dayInfo = getCurrentDayInfo();
    const existingTitles = currentDayPlan.events.map(e => `${e.time} ${e.title}`);
    try {
      const result = await getDaySuggestions(dayInfo.city, existingTitles, "家庭旅遊，節奏輕鬆");
      setSuggestions(result);
      setShowSuggestions(true);
    } catch (e) { alert('AI 獲取建議失敗'); }
    finally { setIsGenerating(false); }
  };

  const adoptSuggestion = (s: Partial<ItineraryEvent>) => {
    const newEvent: ItineraryEvent = {
      id: Date.now().toString() + Math.random(),
      time: s.time || '10:00',
      title: s.title || '',
      location: s.location || '',
      type: s.type as any || 'attraction',
      description: s.description || ''
    };
    let newItinerary = [...selectedTrip.itinerary];
    const targetIdx = newItinerary.findIndex(p => p.day === activeDay);
    if (targetIdx > -1) {
      newItinerary[targetIdx].events = [...newItinerary[targetIdx].events, newEvent].sort((a,b) => a.time.localeCompare(b.time));
    } else {
      newItinerary.push({ day: activeDay, events: [newEvent], accommodation: '', transportMode: '', notes: '' });
    }
    onUpdate({ itinerary: newItinerary });
    setSuggestions(prev => prev.filter(item => item !== s));
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

  const dayInfo = getCurrentDayInfo();

  return (
    <div className="min-h-screen pb-40 animate-fadeIn bg-[#F0F4F7]">
      {/* 頂部日期選單 */}
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
        {/* 本日概覽 */}
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

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-indigo-50/40 p-3.5 rounded-2xl flex items-center gap-3 border border-indigo-100/30">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${dayInfo.hotel === '家' ? 'bg-emerald-500' : 'bg-indigo-500'} text-white`}>
                    <i className={`fa-solid ${dayInfo.hotel === '家' ? 'fa-house-chimney' : 'fa-bed'} text-xs`}></i>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[8px] font-black text-indigo-300 uppercase leading-none mb-1">{dayInfo.hotel === '家' ? 'Dest' : 'Stay'}</p>
                    <p className="text-[11px] font-black text-indigo-900 truncate">{dayInfo.hotel}</p>
                  </div>
               </div>
               <div onClick={() => setIsDayEditOpen(true)} className="bg-blue-50/40 p-3.5 rounded-2xl flex items-center gap-3 cursor-pointer active:scale-95 transition-all border border-blue-100/30">
                  <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-sm">
                    <i className="fa-solid fa-route text-xs"></i>
                  </div>
                  <div className="overflow-hidden flex-grow">
                    <p className="text-[8px] font-black text-blue-300 uppercase leading-none mb-1">Trans</p>
                    <p className="text-[11px] font-black text-blue-900 truncate">{currentDayPlan.transportMode || '尚未設定'}</p>
                  </div>
                  <i className="fa-solid fa-chevron-right text-[8px] text-blue-200"></i>
               </div>
            </div>
          </section>
        )}

        {/* AI 建議區 */}
        {showSuggestions && suggestions.length > 0 && (
          <section className="animate-fadeIn">
            <div className="flex items-center gap-2 mb-4 px-2">
               <i className="fa-solid fa-wand-magic-sparkles text-[#00A5BF] text-xs"></i>
               <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest text-left">AI 行程建議</h3>
               <button onClick={() => setShowSuggestions(false)} className="ml-auto text-gray-300"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 px-1">
               {suggestions.map((s, idx) => (
                 <div key={idx} className="flex-shrink-0 w-64 bg-white p-5 rounded-[2rem] jp-shadow border border-blue-50 flex flex-col justify-between text-left">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                         <span className="text-[9px] font-black bg-[#00A5BF]/10 text-[#00A5BF] px-2 py-1 rounded-lg">{s.time}</span>
                         <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">{s.type}</span>
                      </div>
                      <h4 className="font-black text-gray-800 text-sm mb-1">{s.title}</h4>
                      <p className="text-[10px] text-[#00A5BF] font-bold leading-relaxed mb-4">{s.description}</p>
                    </div>
                    <button onClick={() => adoptSuggestion(s)} className="w-full bg-[#00A5BF] text-white py-2.5 rounded-xl text-[10px] font-black shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
                      <i className="fa-solid fa-plus"></i> 加入行程
                    </button>
                 </div>
               ))}
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

        {/* 時間軸區域 */}
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
                   <i className="fa-solid fa-plus-circle text-base"></i> 手動新增行程項目
                 </button>
                 <button onClick={handleAiSuggestions} className="bg-white border-2 border-gray-100 text-[#00A5BF] py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm">
                   <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i> AI 小幫手給點靈感
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
                            {event.referenceUrl && (
                               <a href={event.referenceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/80 backdrop-blur-md text-[#00A5BF] flex items-center justify-center shadow-lg hover:bg-[#00A5BF] hover:text-white transition-all">
                                  <i className="fa-solid fa-link text-xs"></i>
                               </a>
                            )}
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
              
              <div className="flex items-center gap-1 bg-white rounded-xl px-1 py-1 shadow-sm border border-stone-100">
                <button 
                  onClick={() => execCmd('bold')} 
                  className="w-8 h-8 rounded-lg text-stone-600 hover:bg-stone-50 hover:text-[#00A5BF] transition-all flex items-center justify-center"
                  title="粗體"
                >
                  <i className="fa-solid fa-bold text-xs"></i>
                </button>
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute -top-3 left-10 z-20 bg-[#00A5BF]/70 text-white px-4 py-1 text-[8px] font-black uppercase tracking-[0.2em] shadow-sm transform -rotate-1 skew-x-12">
                SCRAPBOOK
              </div>

              <div className="bg-[#FDFBF7] rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-stone-100 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }}></div>
                
                <div
                  ref={editorRef}
                  contentEditable
                  className="w-full bg-transparent border-none outline-none font-bold text-stone-600 text-sm leading-relaxed min-h-[180px] placeholder:text-stone-200 relative z-10 text-left focus:ring-0"
                  onInput={(e) => handleUpdateDayPlan({ notes: (e.target as HTMLDivElement).innerHTML })}
                  onBlur={(e) => handleUpdateDayPlan({ notes: (e.target as HTMLDivElement).innerHTML })}
                  data-placeholder="在此自由紀錄網址、景點筆記、待吃清單或是今日感言..."
                ></div>

                <div className="mt-4 flex justify-between items-center text-[9px] font-black text-stone-300 uppercase tracking-widest border-t border-stone-50 pt-4">
                  <span>Day {activeDay} · Archive</span>
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-floppy-disk opacity-40"></i>
                    <span>已自動儲存</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {eventToDeleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setEventToDeleteId(null)}></div>
          <div className="relative w-full max-w-xs bg-white rounded-[2.5rem] p-8 shadow-2xl animate-slideUp text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
              <i className="fa-solid fa-circle-exclamation"></i>
            </div>
            <h4 className="text-lg font-black text-gray-800 mb-2">確定要刪除嗎？</h4>
            <p className="text-xs text-gray-400 font-bold leading-relaxed mb-8">這個行程項目將會從時間軸消失，這個動作不可逆喔！</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDeleteEvent} className="w-full bg-red-500 text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all">狠心刪除</button>
              <button onClick={() => setEventToDeleteId(null)} className="w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all">再想想看</button>
            </div>
          </div>
        </div>
      )}

      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setIsBatchDeleteModalOpen(false)}></div>
          <div className="relative w-full max-w-xs bg-white rounded-[2.5rem] p-8 shadow-2xl animate-slideUp text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <h4 className="text-lg font-black text-gray-800 mb-2">確定要刪除這 {selectedEventIds.size} 項行程嗎？</h4>
            <p className="text-xs text-gray-400 font-bold leading-relaxed mb-8">選中的行程將會被永久移除，這個動作不可逆喔！</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmBatchDelete} className="w-full bg-red-500 text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all">狠心刪除</button>
              <button onClick={() => setIsBatchDeleteModalOpen(false)} className="w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all">再想想看</button>
            </div>
          </div>
        </div>
      )}

      {isBatchMode && selectedEventIds.size > 0 && (
        <div className="fixed bottom-40 left-6 right-6 z-[100] animate-slideUp pointer-events-auto">
           <div className="glass-card bg-gray-900/90 rounded-[2rem] p-4 flex items-center justify-between shadow-2xl border border-white/10">
              <div className="pl-4 text-left">
                 <p className="text-white font-black text-sm">已選取 {selectedEventIds.size} 項</p>
                 <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Selected Items</p>
              </div>
              <div className="flex gap-2">
                 <button type="button" onClick={() => setIsMoveModalOpen(true)} className="bg-white/10 text-white px-5 py-3 rounded-2xl text-[11px] font-black active:scale-95 transition-all flex items-center gap-2 cursor-pointer pointer-events-auto">
                    <i className="fa-solid fa-arrows-to-dot"></i> 搬移
                 </button>
                 <button type="button" onClick={(e) => { e.stopPropagation(); setIsBatchDeleteModalOpen(true); }} className="bg-red-500 text-white px-5 py-3 rounded-2xl text-[11px] font-black shadow-lg active:scale-95 transition-all flex items-center gap-2 cursor-pointer pointer-events-auto">
                    <i className="fa-solid fa-trash-can"></i> 刪除
                 </button>
              </div>
           </div>
        </div>
      )}

      {isMoveModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 animate-fadeIn text-center">
           <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsMoveModalOpen(false)}></div>
           <div className="relative w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl scale-in">
              <h4 className="text-xl font-black text-gray-800 mb-2">搬移行程</h4>
              <p className="text-[10px] font-bold text-gray-400 mb-8 uppercase tracking-widest">Select Target Day</p>
              <div className="grid grid-cols-4 gap-3 max-h-60 overflow-y-auto no-scrollbar py-2">
                 {daysArray.map(d => (
                    <button key={d} onClick={() => handleBatchMove(d)} disabled={d === activeDay}
                            className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${d === activeDay ? 'bg-gray-100 text-gray-300' : 'bg-gray-50 text-gray-800 hover:bg-[#00A5BF] hover:text-white active:scale-95 shadow-sm cursor-pointer'}`}>
                       <span className="text-[8px] font-black uppercase">Day</span>
                       <span className="text-lg font-black">{d}</span>
                    </button>
                 ))}
              </div>
              <button onClick={() => setIsMoveModalOpen(false)} className="w-full mt-10 py-4 text-gray-400 font-black text-xs cursor-pointer">取消操作</button>
           </div>
        </div>
      )}

      {!isBatchMode && (
        <div className="fixed bottom-28 right-6 flex flex-col gap-4 z-40">
          <button onClick={handleAiSuggestions} disabled={isGenerating} className="w-12 h-12 rounded-2xl bg-white text-[#00A5BF] jp-shadow flex items-center justify-center text-lg shadow-xl active:scale-95 transition-all border border-gray-50 cursor-pointer">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
          </button>
          <button onClick={() => { setEditingEvent({ day: activeDay, event: { id: '', title: '', time: '10:00', location: '', type: 'attraction' } }); setFinalImageUrl(undefined); setIsEventModalOpen(true); }} className="w-16 h-16 rounded-3xl bg-[#00A5BF] text-white flex items-center justify-center text-2xl shadow-2xl active:scale-95 transition-all cursor-pointer">
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>
      )}

      {isGenerating && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-2xl z-[300] flex flex-col items-center justify-center p-12 text-center animate-fadeIn overflow-hidden">
          <div className="relative w-40 h-40 mb-12 flex items-center justify-center">
             <div className="absolute inset-0 border-[6px] border-[#00A5BF]/10 rounded-full"></div>
             <div className="absolute inset-0 border-[6px] border-[#00A5BF] rounded-full border-t-transparent animate-spin"></div>
             <i className="fa-solid fa-sparkles text-5xl text-[#00A5BF] animate-pulse relative z-10"></i>
          </div>
          <div className="bg-white/80 glass-card px-8 py-4 rounded-3xl shadow-xl">
             <p className="text-sm font-black text-gray-800 animate-fadeIn" key={loadingMsgIdx}>{LOADING_MESSAGES[loadingMsgIdx]}</p>
          </div>
        </div>
      )}

      {isCropping && rawImage && (
        <div className="fixed inset-0 z-[250] bg-black/95 flex flex-col items-center justify-center p-6 animate-fadeIn text-center">
           <div className="w-full max-w-md space-y-8">
              <div ref={cropZoneRef} className="w-full aspect-video bg-gray-900 relative overflow-hidden rounded-2xl border-2 border-[#00A5BF] cursor-move touch-none"
                   onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX - cropPos.x, y: e.clientY - cropPos.y }); }}
                   onMouseMove={(e) => { if (isDragging) setCropPos(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })); }}
                   onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}
                   onTouchStart={(e) => { setIsDragging(true); setDragStart({ x: e.touches[0].clientX - cropPos.x, y: e.touches[0].clientY - cropPos.y }); }}
                   onTouchMove={(e) => { if (isDragging) setCropPos(prev => ({ ...prev, x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y })); }}
                   onTouchEnd={() => setIsDragging(false)}>
                 <img src={rawImage} alt="raw" className="absolute pointer-events-none select-none"
                      style={{ transform: `translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropPos.scale})`, transformOrigin: 'center' }} />
              </div>
              <div className="px-4 space-y-4">
                 <input type="range" min="0.5" max="3" step="0.01" value={cropPos.scale} onChange={e => setCropPos(prev => ({...prev, scale: parseFloat(e.target.value)}))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none accent-[#00A5BF]" />
              </div>
              <div className="flex gap-4">
                 <button onClick={() => { setIsCropping(false); setRawImage(null); }} className="flex-1 py-4 rounded-2xl bg-white/10 text-white font-black cursor-pointer">放棄</button>
                 <button onClick={finalizeCrop} className="flex-1 py-4 rounded-2xl bg-[#00A5BF] text-white font-black shadow-xl cursor-pointer">確認裁切</button>
              </div>
           </div>
        </div>
      )}

      {isEventModalOpen && editingEvent && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center animate-fadeIn text-left">
          <div className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" onClick={() => { setIsEventModalOpen(false); setFinalImageUrl(undefined); }}></div>
          <div className="relative w-full max-w-md bg-white rounded-t-[3.5rem] p-8 pb-12 shadow-2xl animate-slideUp overflow-y-auto max-h-[95vh] no-scrollbar">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-gray-800">{editingEvent.event.id ? '編輯行程' : '新增手動行程'}</h3>
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
                       <i className="fa-solid fa-lock text-[8px]"></i>
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-fadeIn text-center">
           <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsDayEditOpen(false)}></div>
           <div className="relative w-full max-sm bg-white rounded-[3rem] p-10 shadow-2xl scale-in">
              <h4 className="text-xl font-black text-gray-800 mb-8">Day {activeDay} 設定</h4>
              <div className="space-y-6 text-left">
                 <div>
                    <label className="text-[10px] font-black text-stone-300 uppercase block mb-2 tracking-widest">主要交通方式</label>
                    <input autoFocus defaultValue={currentDayPlan.transportMode} placeholder="例如：地鐵、租車自駕" className="w-full bg-gray-50 rounded-2xl px-5 py-4 font-black text-sm border-none focus:ring-2 focus:ring-[#00A5BF] outline-none"
                           onChange={e => handleUpdateDayPlan({ transportMode: e.target.value })} />
                 </div>
              </div>
              <button onClick={() => setIsDayEditOpen(false)} className="w-full mt-10 bg-[#00A5BF] text-white py-5 rounded-2xl font-black text-sm shadow-xl cursor-pointer uppercase tracking-widest">新增目的地</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default PlannerView;
