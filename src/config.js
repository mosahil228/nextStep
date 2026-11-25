// ============================================================
//  NextStep Career — site settings
//  Edit these values to change your links & branding.
// ============================================================

export const SITE = {
  name: 'NextStep Career',
  tagline: 'Your next career move starts here',

  // Your Telegram username (without @) — used for the floating chat button
  telegramUsername: 'mosahill228',

  // Your Telegram CHANNEL link (job updates)
  telegramChannel: 'https://t.me/mosahill228',

  // Your WhatsApp CHANNEL link — replace with your real channel link
  whatsappChannel: 'https://whatsapp.com/channel/0029Vaj2WhiFSAtAyYNKl92k',

  // Text shown in the scrolling notice bar at the very top
  disclaimer:
    'Apply at your own risk. NextStep Career only shares job updates collected from public sources across the internet. We are not the employer and do not guarantee any job, interview or selection. Never pay anyone for a job.',
};

// Supabase (online database). Values come from the .env file.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
// Use the new publishable key (sb_publishable_...). The old anon key also still works.
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// When Supabase is not configured the app runs in DEMO mode:
// jobs are stored in your browser only (localStorage) so you can try everything.
export const DEMO_MODE = !SUPABASE_URL || !SUPABASE_ANON_KEY;

