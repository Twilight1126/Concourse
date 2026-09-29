import { createClient } from "@supabase/supabase-js";

const authMode =
  import.meta.env.VITE_AUTH_MODE || (import.meta.env.DEV ? "local" : "supabase");

export const isSupabaseAuthEnabled = authMode === "supabase";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  isSupabaseAuthEnabled && supabaseUrl && supabaseKey,
);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
