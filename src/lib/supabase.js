import {createClient} from '@supabase/supabase-js';

// Env-gated, browser-only singleton.
//   undefined = not initialized yet
//   null      = configured OFF (no env, or SSR)
//   object    = live client
let _client = undefined;

/**
 * Initialize once from site customFields (called in src/theme/Root.js).
 * Returns null during SSR or when Supabase env is not configured.
 */
export function initSupabase(url, key) {
  if (typeof window === 'undefined') return null;
  if (_client !== undefined) return _client;
  _client =
    url && key
      ? createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        })
      : null;
  return _client;
}

/** The initialized client, or null if not configured / not yet initialized. */
export function getSupabase() {
  return _client === undefined ? null : _client;
}

/** True when Supabase is configured and usable in the browser. */
export function isSupabaseConfigured() {
  return Boolean(getSupabase());
}
