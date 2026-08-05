// ====================================================================
// js/supabase-client.js — Shared Supabase Client
// ====================================================================
// Creates ONE Supabase client and exposes it as `window.supabaseClient`
// so every module (settings.js, admin.js, login.js, ...) reuses the
// same connection instead of creating duplicates.
//
// Requires the Supabase JS v2 CDN script to be loaded BEFORE this file:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//
// Replace the two placeholders below with your real project values
// (Supabase Dashboard → Project Settings → API).
// ====================================================================

const SUPABASE_URL = 'https://jdzjscecaployngmzfub.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkempzY2VjYXBsb3luZ216ZnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NDY2NzIsImV4cCI6MjEwMTQyMjY3Mn0.geBp7Tm5Lz-j2guHswp7lYtoPw3mQJYFH4wwxhM7jtM';

if (!window.supabaseClient) {
  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
