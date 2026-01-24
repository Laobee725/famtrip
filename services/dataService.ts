
import { Trip } from '../types';
import { supabase } from './supabaseClient';

const DB_NAME = 'FamTripDB';
const STORE_NAME = 'trips_store';
const DATA_KEY = 'all_trips';
const DB_VERSION = 1;

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const dataService = {
  getLocalTrips: async (): Promise<Trip[]> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(DATA_KEY);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error("IndexedDB Error:", e);
      return [];
    }
  },

  saveToLocal: async (trips: Trip[]): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(trips, DATA_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  getTrips: async (): Promise<Trip[]> => {
    const localTrips = await dataService.getLocalTrips();
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('data')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const cloudTrips = data.map(item => item.data as Trip);
        const cloudIds = new Set(cloudTrips.map(t => t.id));
        const onlyInLocal = localTrips.filter(t => !cloudIds.has(t.id));
        const finalTrips = [...cloudTrips, ...onlyInLocal];
        
        await dataService.saveToLocal(finalTrips);
        return finalTrips;
      } else if (localTrips.length > 0) {
        await dataService.saveTrips(localTrips);
      }
    } catch (e) {
      console.warn('[Sync] 暫時無法連線至雲端資料庫，使用本地資料。', e);
    }
    return localTrips;
  },

  saveTrips: async (trips: Trip[]): Promise<void> => {
    await dataService.saveToLocal(trips);
    if (!trips || trips.length === 0) return;

    try {
      const payload = trips.map(t => ({
        id: String(t.id),
        data: t,
        updated_at: new Date().toISOString()
      }));
      
      const { error } = await supabase
        .from('trips')
        .upsert(payload, { onConflict: 'id' });
          
      if (error) console.error('[Sync] 雲端備份失敗:', error.message);
    } catch (err) {
      console.warn('[Sync] 備份失敗，請檢查網路連線。');
    }
  },

  updateTrip: async (updatedTrip: Trip): Promise<Trip[]> => {
    const trips = await dataService.getLocalTrips();
    const newTrips = trips.map(t => t.id === updatedTrip.id ? updatedTrip : t);
    await dataService.saveTrips(newTrips);
    return newTrips;
  },

  addTrip: async (trip: Trip): Promise<Trip[]> => {
    const trips = await dataService.getLocalTrips();
    const exists = trips.find(t => t.id === trip.id);
    const newTrips = exists ? trips : [trip, ...trips];
    await dataService.saveTrips(newTrips);
    return newTrips;
  },

  subscribeToChanges: (onUpdate: () => void, onStatusChange?: (status: string) => void) => {
    const channel = supabase
      .channel('public:trips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
        onUpdate();
      })
      .subscribe((status) => {
        if (onStatusChange) onStatusChange(status);
        if (status === 'SUBSCRIBED') onUpdate();
      });
    return channel;
  }
};