import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabaseClient';
import {
  fetchProfile,
  signInWithPassword,
  signOut,
  type Profile,
  type UserRole,
} from '@/services/authService';

interface UseAuthResult {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadProfile = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setUser(null);
      setProfile(null);
      return;
    }
    setUser(session.user);
    try {
      const p = await fetchProfile(session.user.id);
      setProfile(p);
    } catch (err) {
      setProfile(null);
      setAuthError(err instanceof Error ? err.message : 'Error cargando perfil');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      await loadProfile(data.session);
      if (!cancelled) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadProfile(session);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      await signInWithPassword(email, password);
      return true;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Error de login');
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setProfile(null);
    setUser(null);
  }, []);

  return {
    user,
    profile,
    role: profile?.role ?? null,
    loading,
    authError,
    login,
    logout,
  };
}
