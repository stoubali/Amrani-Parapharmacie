/**
 * Amrani Parapharmacie - Supabase Client
 * Shared Supabase client instance used across all admin pages.
 * Requires the Supabase JS CDN script to be loaded BEFORE this file:
 * <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 */
const SUPABASE_URL = 'https://sbyfrhnhnuhwcrloqrou.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNieWZyaG5obnVod2NybG9xcm91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzY1MjksImV4cCI6MjEwMTI1MjUyOX0.xPkpK764zB9dmUnySJ9Lf6CZk24WRDlPiU5SsPgIUy0';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
    }
});

window.supabaseClient = supabaseClient;
