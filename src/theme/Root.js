import React, {useEffect, useMemo, useState} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {initSupabase, getSupabase} from '@site/src/lib/supabase';
import {AuthContext} from '@site/src/lib/auth';

// Docusaurus wraps the whole app in <Root>. We use it to init Supabase
// (browser-only) and provide auth state. No-op when env is not configured.
export default function Root({children}) {
  const {siteConfig} = useDocusaurusContext();
  const {supabaseUrl, supabaseAnonKey} = siteConfig.customFields || {};
  const [session, setSession] = useState(null);

  useEffect(() => {
    const sb = initSupabase(supabaseUrl, supabaseAnonKey);
    if (!sb) return undefined;
    sb.auth.getSession().then(({data}) => setSession(data?.session ?? null));
    const {data} = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data?.subscription?.unsubscribe?.();
  }, [supabaseUrl, supabaseAnonKey]);

  const value = useMemo(() => {
    const configured = Boolean(supabaseUrl && supabaseAnonKey);
    const redirectTo =
      typeof window !== 'undefined'
        ? window.location.origin + (siteConfig.baseUrl || '/')
        : undefined;
    return {
      configured,
      session,
      user: session?.user ?? null,
      async signInWithEmail(email) {
        const sb = getSupabase();
        if (!sb) return {error: 'not-configured'};
        return sb.auth.signInWithOtp({email, options: {emailRedirectTo: redirectTo}});
      },
      async signInWithGitHub() {
        const sb = getSupabase();
        if (!sb) return {error: 'not-configured'};
        return sb.auth.signInWithOAuth({provider: 'github', options: {redirectTo}});
      },
      async signOut() {
        const sb = getSupabase();
        if (sb) await sb.auth.signOut();
      },
    };
  }, [session, supabaseUrl, supabaseAnonKey, siteConfig.baseUrl]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
