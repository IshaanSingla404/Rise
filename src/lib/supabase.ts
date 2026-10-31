import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Supabase email links land back on the app with their result in the URL
 * (hash for the implicit flow, query string for some error redirects).
 * Read it before the client consumes and clears the hash.
 */
export type AuthRedirect = { type: string | null; errorCode: string | null; errorDescription: string | null };
function readAuthRedirect(): AuthRedirect {
  if (typeof window === 'undefined') return { type: null, errorCode: null, errorDescription: null };
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const get = (k: string) => hash.get(k) ?? query.get(k);
  return {
    type: get('type'),
    errorCode: get('error_code') ?? get('error'),
    errorDescription: get('error_description'),
  };
}
export const initialAuthRedirect = readAuthRedirect();

export const supabaseConfigured = Boolean(url && anonKey);
export const supabase = supabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export function requiredClient() {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then reload.');
  return supabase;
}
