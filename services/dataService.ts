
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
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(DATA_KEY);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
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
      console.log('[Sync] 正在嘗試連線到 Supabase...');
      // Fix: Removing .timeout() as it is not supported by Supabase Postgrest client.
      const { data, error } = await supabase
        .from('trips')
        .select('data');
      
      if (error) {
        console.warn(`[Sync] 伺服器回傳錯誤: ${error.message}`);
        return localTrips;
      }
      
      if (data && data.length > 0) {
        const cloudTrips = data.map(item => item.data as Trip);
        const cloudIds = new Set(cloudTrips.map(t => t.id));
        const onlyInLocal = localTrips.filter(t => !cloudIds.has(t.id));
        const finalTrips = [...cloudTrips, ...onlyInLocal];
        
        await dataService.saveToLocal(finalTrips);
        console.log('[Sync] 雲端同步成功！');
        return finalTrips;
      } else if (localTrips.length > 0) {
        console.log('[Sync] 雲端無資料，嘗試將本地資料上傳備份...');
        await dataService.saveTrips(localTrips);
      }
    } catch (e: any) {
      if (e.message === 'Failed to fetch') {
        console.error('[Sync] 連線被阻擋！請檢查：1. 是否開啟了 AdBlock 廣告攔截器？ 2. 網路是否正常？');
      } else {
        console.warn('[Sync] 網路異常，目前以離線模式運作。', e);
      }
    }
    return localTrips;
  },

  saveTrips: async (trips: Trip[]): Promise<void> => {
    await dataService.saveToLocal(trips);
    if (!trips || trips.length === 0) return;

    try {
      const payload = trips.map(t => ({
        id: String(t.id),
        invite_code: t.inviteCode || String(t.id).slice(-6).toUpperCase(),
        data: t,
        updated_at: new Date().toISOString()
      }));
      
      const { error } = await supabase
        .from('trips')
        .upsert(payload, { onConflict: 'id' });
          
      if (error) console.error('[Sync] 雲端備份失敗:', error.message);
    } catch (err) {
      console.warn('[Sync] 無法連線至雲端進行備份。');
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

  joinTripByCode: async (code: string): Promise<Trip | null> => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('data')
        .eq('invite_code', code.toUpperCase().trim())
        .maybeSingle();
        
      if (error) throw error;
      return data ? (data.data as Trip) : null;
    } catch (err) {
      return null;
    }
  },

  subscribeToChanges: (onUpdate: () => void, onStatusChange?: (status: string) => void) => {
    const channel = supabase
      .channel('public:trips')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        console.log('[Sync] 偵測到遠端更新，正在同步...');
        onUpdate();
      })
      .subscribe((status) => {
        console.log('[Sync] 即時連線狀態:', status);
        if (onStatusChange) onStatusChange(status);
      });
    return channel;
  }
};
