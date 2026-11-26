import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

export const SUPABASE_URL = "https://wpxvaqmzxhxlrutklypm.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8Dhvi0M8P31FLB9kH5-RiA_5qyq9A0O";
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
