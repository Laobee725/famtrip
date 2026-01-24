
import React from 'react';
import { Trip } from '../types';

interface HomeViewProps {
  trips: Trip[];
  onSelectTrip: (trip: Trip) => void;
  onOpenAddModal: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ trips, onSelectTrip, onOpenAddModal }) => {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 animate-fadeIn">
      <section className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2">我的旅遊本</h2>
          <p className="text-indigo-100 opacity-80 mb-6">點擊封面開啟屬於家人的冒險</p>
          <button 
            onClick={onOpenAddModal}
            className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
          >
            + 建立旅遊本
          </button>
        </div>
        <i className="fa-solid fa-book-open absolute -right-4 -bottom-4 text-9xl text-white/10 rotate-12"></i>
      </section>

      <div className="grid grid-cols-1 gap-6">
        {trips.map(trip => (
          <div 
            key={trip.id}
            onClick={() => onSelectTrip(trip)}
            className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
          >
            <div className="relative h-48">
              <img src={trip.image} alt={trip.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-2xl p-2 px-3 shadow-sm flex items-center gap-2">
                <i className="fa-solid fa-cloud-sun text-amber-500"></i>
                <span className="text-xs font-bold text-gray-800">{trip.temp}°C {trip.weather}</span>
              </div>
            </div>
            <div className="p-6">
              <h4 className="font-black text-gray-900 text-xl mb-1">{trip.title}</h4>
              <p className="text-gray-400 text-sm flex items-center gap-1 mb-4">
                <i className="fa-solid fa-location-dot"></i> {trip.destination}
              </p>
              
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">旅行成員</p>
                  <div className="flex -space-x-3">
                    {trip.members.map((m, i) => (
                      <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-indigo-50 flex items-center justify-center text-xs font-black text-indigo-600">
                        {m.name[0]}
                      </div>
                    ))}
                    <div className="w-10 h-10 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                      +
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-bold mb-1">日期</p>
                  <p className="text-sm font-bold text-gray-800">{trip.startDate.split('-')[1]}/{trip.startDate.split('-')[2]} - {trip.endDate.split('-')[1]}/{trip.endDate.split('-')[2]}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomeView;
