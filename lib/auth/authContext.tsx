'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { User, UserRole } from '@/types';
import { createClient } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout: () => Promise<void>;
  isFounder: boolean;
  isSupervisor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'This account has not confirmed its email address yet. Check your inbox.';
  }
  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return 'Cannot reach the Supabase authentication server. Check your connection and configuration.';
  }
  return message;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadedProfileIdRef = useRef<string | null>(null);

  // Fetch the signed-in user's BALE profile (name + database role) from
  // public.users. RLS guarantees a user can only ever read their own row.
  const fetchProfile = async (authUserId: string): Promise<{ profile: User | null; error?: string }> => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('id', authUserId)
      .maybeSingle();

    if (error) {
      return { profile: null, error: error.message };
    }
    return { profile: (data as User) ?? null };
  };

  useEffect(() => {
    let mounted = true;

    const resolveSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error || !session?.user) {
        setUser(null);
        loadedProfileIdRef.current = null;
        setIsLoading(false);
        return;
      }

      try {
        const { profile, error: profileError } = await fetchProfile(session.user.id);
        if (!mounted) return;

        if (profileError) {
          // Network / database failure while resolving the profile.
          console.error('Failed to load BALE profile from public.users:', profileError);
          setUser(null);
        } else if (profile) {
          loadedProfileIdRef.current = profile.id;
          setUser(profile);
        } else {
          // Auth account exists but has no BALE profile row — force sign out.
          await supabase.auth.signOut();
          setUser(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    resolveSession();

    // Keep the context in sync with Supabase session events (login, logout,
    // token refresh, tab sync).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        loadedProfileIdRef.current = null;
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        // Skip when this profile was already resolved by `login()` to avoid
        // duplicate requests.
        if (loadedProfileIdRef.current === session.user.id) return;

        supabase
          .from('users')
          .select('id, name, email, role, created_at')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(async ({ data, error }) => {
            if (!mounted) return;
            if (error) {
              console.error('Failed to load BALE profile from public.users:', error.message);
              setUser(null);
              return;
            }
            if (data) {
              loadedProfileIdRef.current = (data as User).id;
              setUser(data as User);
            } else {
              await supabase.auth.signOut();
              setUser(null);
            }
          });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { success: false, error: friendlyAuthError(error.message) };
      }
      if (!data.user) {
        return { success: false, error: 'Authentication failed. No session was returned.' };
      }

      // Fetch the database role for the authenticated user (public.users).
      const { profile, error: profileError } = await fetchProfile(data.user.id);
      if (profileError) {
        return {
          success: false,
          error: `Signed in, but the BALE profile could not be loaded from the database: ${profileError}`,
        };
      }
      if (!profile) {
        // Auth account without a BALE profile — reject and clean the session.
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'This account has no BALE role assigned. Please contact the firm administrator.',
        };
      }

      loadedProfileIdRef.current = profile.id;
      setUser(profile);
      return { success: true, role: profile.role };
    } catch (err: any) {
      return { success: false, error: friendlyAuthError(err?.message || 'Authentication failed') };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    loadedProfileIdRef.current = null;
    setUser(null);
  };

  const role = user?.role || null;
  const isFounder = role === 'founder';
  const isSupervisor = role === 'supervisor';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        login,
        logout,
        isFounder,
        isSupervisor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
