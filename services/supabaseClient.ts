import { createClient } from '@supabase/supabase-js';

// 請從你的 Supabase Project Settings -> API 頁面複製以下兩個數值替換
const SUPABASE_URL = 'https://wmsuwntfeuaqldryqmxt.supabase.co'; // <--- 替換成你的 URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtc3V3bnRmZXVhcWxkcnlxbXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNDY1OTUsImV4cCI6MjA4NDgyMjU5NX0.szr4lni6LyU70hDO20frrqNMaSFGdvC_q9-3oYH4taI'; // <--- 替換成你的 Key

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
