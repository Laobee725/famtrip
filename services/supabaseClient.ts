
import { createClient } from '@supabase/supabase-js';

/**
 * 安全提醒：
 * 雖然此處使用了 Anon Key，在前端暴露是正常的。
 * 但請務必在 Supabase 後台針對 'trips' 資料表開啟 RLS (Row Level Security)，
 * 以防止未經授權的人員透過此 Key 修改或刪除您的資料。
 */

const SUPABASE_URL = 'https://wtsmveavrbkvqyuxqxy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0c212ZWF2cmJya3ZxeXV4cXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTM4ODgsImV4cCI6MjA4NDc2OTg4OH0.uStOt2U3Frq8f-GDyuCCsWM9VNjXqfnbk3H-2PepB34';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
