import React, { useState, useEffect } from 'react';
import { Trip, TripSeason } from '../types';

interface AddTripModalProps {
  trip?: Trip | null;
  onClose: () => void;
  onSubmit: (data: { title: string; destination: string; startDate: string; endDate: string; season: TripSeason }) => void;
}

const SEASONS: { id: TripSeason; icon: string; label: string }[] = [
  { id: 'spring', icon: '🌸', label: '春天' },
  { id: 'summer', icon: '☀️', label: '夏天' },
  { id: 'autumn', icon: '🍁', label: '秋天' },
  { id: 'winter', icon: '❄️', label: '冬天' },
];

const AddTripModal: React.FC<AddTripModalProps> = ({ trip, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<{
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    season: TripSeason;
  }>({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    season: 'spring'
  });

  useEffect(() => {
    if (trip) {
      setFormData({
        title: trip.title,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        season: trip.season || 'spring'
      });
    }
  }, [trip]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.destination || !formData.startDate) return;
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white rounded-t-[3.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-slideUp border-t border-stone-100 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="px-10 py-12">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-2xl font-black text-stone-800 tracking-tight">
              {trip ? '編輯故事本' : '全新故事本'}
            </h3>
            <button onClick={onClose} className="w-10 h-10 rounded-full border border-stone-100 flex items-center justify-center text-stone-300 active:scale-95 transition-all">
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-[10px] font-black text-stone-300 uppercase tracking-[0.2em] mb-3">Journal Title</label>
              <input autoFocus type="text" placeholder="例如：2024 京都初雪" className="w-full bg-stone-50 border-none rounded-[1.5rem] px-6 py-5 focus:ring-2 focus:ring-stone-200 transition-all font-black text-stone-700"
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
            </div>

            <div>
              <label className="block text-[10px] font-black text-stone-300 uppercase tracking-[0.2em] mb-3">Destination</label>
              <input type="text" placeholder="目的地（例如：東京, 日本）" className="w-full bg-stone-50 border-none rounded-[1.5rem] px-6 py-5 focus:ring-2 focus:ring-stone-200 transition-all font-black text-stone-700"
                value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} required />
            </div>

            <div>
               <label className="block text-[10px] font-black text-stone-300 uppercase tracking-[0.2em] mb-4">Select Season</label>
               <div className="grid grid-cols-4 gap-3">
                  {SEASONS.map(s => (
                    <button key={s.id} type="button" onClick={() => setFormData({...formData, season: s.id})} 
                            className={`flex flex-col items-center gap-2 p-4 rounded-[1.5rem] border-2 transition-all ${formData.season === s.id ? 'border-[#00A5BF] bg-[#00A5BF]/5' : 'border-stone-50 bg-stone-50'}`}>
                       <span className="text-2xl">{s.icon}</span>
                       <span className={`text-[9px] font-black ${formData.season === s.id ? 'text-[#00A5BF]' : 'text-stone-300'}`}>{s.label}</span>
                    </button>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-stone-300 uppercase tracking-[0.2em] mb-3">Starts</label>
                <input type="date" className="w-full bg-stone-50 border-none rounded-[1.5rem] px-3 py-4 text-[11px] font-black text-stone-600 outline-none"
                  value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-300 uppercase tracking-[0.2em] mb-3">Ends</label>
                <input type="date" className="w-full bg-stone-50 border-none rounded-[1.5rem] px-3 py-4 text-[11px] font-black text-stone-600 outline-none"
                  value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required />
              </div>
            </div>

            <button type="submit" className="w-full bg-stone-800 text-white py-6 rounded-[1.5rem] font-black tracking-widest text-sm shadow-xl active:scale-95 transition-all mt-4">
              {trip ? 'UPDATE STORYBOOK' : 'CREATE STORYBOOK'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddTripModal;