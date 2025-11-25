import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey,{
  realtime: {
    params: {
      eventsPerSecond: 10, // Reasonable default
    },
  },
})

const supabaseUrl1 = import.meta.env.VITE_SUPABASE_URL1
const supabaseAnonKey1 = import.meta.env.VITE_SUPABASE_ANON_KEY1
export const supabase1 = createClient(supabaseUrl1, supabaseAnonKey1,{
  realtime: {
    params: {
      eventsPerSecond: 10, // Reasonable default
    },
  },
})

