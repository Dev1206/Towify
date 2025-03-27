import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Add your Supabase URL and anon key
// Replace with actual values from your Supabase project
const supabaseUrl = 'https://jyrdzmyfxqtvsmfcvpvk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5cmR6bXlmeHF0dnNtZmN2cHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NTE1MDcsImV4cCI6MjA1ODQyNzUwN30.irpVFz6wqye1XpIk_YlmdOOCtkGflNQGOsA7WMvR7SA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 