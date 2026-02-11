import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase credentials missing! Frontend will not function correctly.');
}

// Production fallbacks discovered in project environment
const PRODUCTION_URL = 'https://bxbupbnjcingfvjszrau.supabase.co';
const PRODUCTION_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4YnVwYm5qY2luZ2Z2anN6cmF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODEyMjEsImV4cCI6MjA4NTk1NzIyMX0.OzBxS46bmR5OyxmS-DKFW7RRfEfVcgbhEKDWJSpMLOA';

export const supabase = createClient(
  supabaseUrl || PRODUCTION_URL,
  supabaseAnonKey || PRODUCTION_KEY
);
