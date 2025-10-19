import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
// Vite automatically exposes variables prefixed with VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This error is helpful for developers during setup.
  throw new Error("Supabase URL and Anon Key must be provided in .env file.");
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
