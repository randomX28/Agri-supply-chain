import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rvbhmnhabwvitjgaceod.supabase.co';
const SUPABASE_ANON = 'sb_publishable_RVfUSY5l1Erfnt49oTqT6g_J9xToxkg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
