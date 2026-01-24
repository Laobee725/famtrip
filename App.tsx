
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, TripTab, Trip } from './types';
import { dataService } from './services/dataService';
import BookshelfView from './views/Bookshelf';
import TripOverview from './views/TripOverview';
import PlannerView from './views/Planner';
import WalletView from './views/Wallet';
import ChecklistView from './views/Checklist';
import BottomNav from './components/BottomNav';
import AddTripModal from './components/AddTripModal';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('CONNECTING');
  const [appState, setAppState] = useState<AppState>('bookshelf');
  const [activeTab, setActiveTab] = useState<TripTab>('overview');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);

  const loadData = useCallback(async () => {
    const data = await dataService.getTrips();
    setTrips(data);
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadData();
      setTimeout(() => setShowSplash(false), 1500);
    };
    init();

    const channel = dataService.subscribeToChanges(
      () => loadData(),
      (status) => setSyncStatus(status)
    );

    return () => {
      channel.unsubscribe();
    };
  }, [loadData]);

  const selectedTrip = trips.find(t => t.id === selectedTripId) || null;

  const handleSelectTrip = (trip: Trip) => {
    setSelectedTripId(trip.id);
    setAppState('in_trip');
    setActiveTab('overview');
  };

  const handleBackToBookshelf = () => {
    setAppState('bookshelf');
    setSelectedTripId(null);
  };

  const updateSelectedTrip = async (updates: Partial<Trip>) => {
    if (!selectedTripId || !selectedTrip) return;
    setLoading(true);
    const updated = { ...selectedTrip, ...updates };
    const newTrips = await dataService.updateTrip(updated);
    setTrips(newTrips);
    setLoading(false);
  };

  const handleDeleteTrip = async (id: string) => {
    if (window.confirm('確定要永久刪除這本故事本嗎？')) {
      const newTrips = trips.filter(t => t.id !== id);
      await dataService.saveTrips(newTrips);
      setTrips(newTrips);
    }
  };

  const handleOpenEditModal = (trip: Trip) => {
    setEditingTrip(trip);
    setIsAddModalOpen(true);
  };

  const handleAddOrUpdateTrip = async (formData: any) => {
    setLoading(true);
    if (editingTrip) {
      const updatedTrip = { ...editingTrip, ...formData };
      const newTrips = await dataService.updateTrip(updatedTrip);
      setTrips(newTrips);
      setEditingTrip(null);
    } else {
      const trip: Trip = {
        ...formData,
        id: Date.now().toString(),
        image: `https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1200&auto=format&fit=crop`,
        members: [{ id: 'm1', name: '主要成員', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Felix&backgroundColor=f0f4f7' }],
        stays: [],
        // 預設 9 大分類初始化
        checklistCategories: [
          { id: 'cat_1', label: '證件', icon: 'fa-passport', color: 'bg-[#5096FF]' },
          { id: 'cat_2', label: '住宿', icon: 'fa-hotel', color: 'bg-[#FF9946]' },
          { id: 'cat_3', label: '交通', icon: 'fa-plane', color: 'bg-[#00ACC1]' },
          { id: 'cat_4', label: '藥品', icon: 'fa-briefcase-medical', color: 'bg-[#FF6B6B]' },
          { id: 'cat_5', label: '電器', icon: 'fa-plug', color: 'bg-[#90A4AE]' },
          { id: 'cat_6', label: '衣物', icon: 'fa-shirt', color: 'bg-[#7986CB]' },
          { id: 'cat_7', label: '門票', icon: 'fa-ticket', color: 'bg-[#26A69A]' },
          { id: 'cat_8', label: '購物', icon: 'fa-cart-shopping', color: 'bg-[#F06292]' },
          { id: 'cat_9', label: '其他', icon: 'fa-receipt', color: 'bg-[#8E24AA]' },
        ],
        checklist: [],
        itinerary: [],
        expenses: []
      };
      const newTrips = await dataService.addTrip(trip);
      setTrips(newTrips);
    }
    setLoading(false);
    setIsAddModalOpen(false);
  };

  const renderSyncStatus = () => {
    const isOnline = syncStatus === 'SUBSCRIBED';
    const isConnecting = syncStatus === 'CONNECTING';
    
    return (
      <div className="flex items-center gap-2">
         <div className={`w-2 h-2 rounded-full ${
           isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 
           isConnecting ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'
         } transition-all duration-500`}></div>
         <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest text-left">
           {isOnline ? 'Cloud Linked' : isConnecting ? 'Syncing...' : 'Local Only'}
         </span>
      </div>
    );
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-white z-[200] flex flex-col items-center justify-center p-10 text-center animate-fadeIn">
        <div className="mb-8 text-[#00A5BF]">
          <i className="fa-solid fa-plane-departure text-6xl animate-bounce"></i>
        </div>
        <p className="text-xl font-medium text-gray-700 leading-relaxed italic">「路就在腳下，心在遠方。」</p>
        <div className="mt-12 text-sm text-gray-400 font-bold tracking-widest uppercase">FamTrip · 您的家庭旅遊本</div>
      </div>
    );
  }

  const renderContent = () => {
    if (appState === 'bookshelf') {
      return (
        <BookshelfView 
          trips={trips} 
          onSelectTrip={handleSelectTrip} 
          onOpenAddModal={() => { setEditingTrip(null); setIsAddModalOpen(true); }}
          onDeleteTrip={handleDeleteTrip}
          onEditTrip={handleOpenEditModal}
          onRefresh={loadData}
          syncStatus={syncStatus}
        />
      );
    }

    if (!selectedTrip) return null;

    switch (activeTab) {
      case 'overview': return <TripOverview trip={selectedTrip} onUpdate={updateSelectedTrip} />;
      case 'checklist': return <ChecklistView trip={selectedTrip} onUpdate={updateSelectedTrip} />;
      case 'planner': return <PlannerView selectedTrip={selectedTrip} onUpdate={updateSelectedTrip} />;
      case 'wallet': return <WalletView trip={selectedTrip} onUpdate={(expenses) => updateSelectedTrip({ expenses })} />;
      default: return <TripOverview trip={selectedTrip} onUpdate={updateSelectedTrip} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {appState === 'in_trip' && (
        <header className="bg-white/80 backdrop-blur-md px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-50 text-left">
          <div className="flex items-center gap-3 text-left">
            <button onClick={handleBackToBookshelf} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full text-gray-400 hover:text-stone-800 transition-colors">
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <div className="flex flex-col text-left">
              <h1 className="text-lg font-bold text-stone-800 leading-tight text-left">
                <span className="truncate max-w-[200px] inline-block">{selectedTrip?.title}</span>
              </h1>
              {renderSyncStatus()}
            </div>
          </div>
          <div className="flex gap-4 items-center">
            {loading && <i className="fa-solid fa-circle-notch fa-spin text-[#00A5BF] text-xs"></i>}
          </div>
        </header>
      )}
      <main className={`flex-grow ${appState === 'in_trip' ? 'pb-24' : 'pb-0'}`}>
        {renderContent()}
      </main>
      {appState === 'in_trip' && <BottomNav currentTab={activeTab} setTab={setActiveTab} />}
      {isAddModalOpen && <AddTripModal trip={editingTrip} onClose={() => { setIsAddModalOpen(false); setEditingTrip(null); }} onSubmit={handleAddOrUpdateTrip} />}
    </div>
  );
};

export default App;
