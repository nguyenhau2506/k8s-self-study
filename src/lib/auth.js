import {createContext, useContext} from 'react';

// Auth state shared across the app. Defaults are safe for SSR / not-configured.
export const AuthContext = createContext({
  configured: false,
  session: null,
  user: null,
  signInWithEmail: async () => ({error: 'not-configured'}),
  signInWithGitHub: async () => ({error: 'not-configured'}),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);
