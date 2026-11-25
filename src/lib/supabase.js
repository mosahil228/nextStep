import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DEMO_MODE } from '../config';

export const supabase = DEMO_MODE ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
