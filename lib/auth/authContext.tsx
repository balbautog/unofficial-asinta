'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '@/types';
import { INITIAL_USERS } from '@/lib/data/mockData';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, roleHint?: UserRole) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout: () => void;
  switchUser: (userId: string) => void;
  isFounder: boolean;
  isSupervisor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'bale_auth_user_session';
const COOKIE_ROLE_KEY = 'bale_user_role';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Synchronize auth cookie for server-side middleware checking
  const syncRoleCookie = (role: string | null) => {
    if (typeof document !== 'undefined') {
      if (role) {
        document.cookie = `${COOKIE_ROLE_KEY}=${role}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `bale_auth_active=true; path=/; max-age=604800; SameSite=Lax`;
      } else {
        document.cookie = `${COOKIE_ROLE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
        document.cookie = `bale_auth_active=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      }
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as User;
        // Verify against known users
        const match = INITIAL_USERS.find((u) => u.id === parsed.id || u.email.toLowerCase() === parsed.email.toLowerCase());
        if (match) {
          setUser(match);
          syncRoleCookie(match.role);
        } else {
          setUser(parsed);
          syncRoleCookie(parsed.role);
        }
      } else {
        // Default initial session for immediate seamless preview (Founder: Ar. Junel Buyagon)
        const defaultUser = INITIAL_USERS[0];
        setUser(defaultUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(defaultUser));
        syncRoleCookie(defaultUser.role);
      }
    } catch (e) {
      console.error('Error hydrating auth state:', e);
      setUser(INITIAL_USERS[0]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, _roleHint?: UserRole): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    setIsLoading(true);
    try {
      // Find in database users
      const normalizedEmail = email.trim().toLowerCase();
      const matchedUser = INITIAL_USERS.find(
        (u) => u.email.toLowerCase() === normalizedEmail || u.name.toLowerCase().includes(normalizedEmail)
      );

      if (!matchedUser) {
        // If not found in initial mock, if it's admin/founder email create or reject
        if (normalizedEmail.includes('admin') || normalizedEmail.includes('founder') || normalizedEmail.includes('junel') || normalizedEmail.includes('rei')) {
          const founderUser = INITIAL_USERS[0];
          setUser(founderUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(founderUser));
          syncRoleCookie(founderUser.role);
          return { success: true, role: founderUser.role };
        } else if (normalizedEmail.includes('supervisor') || normalizedEmail.includes('marco') || normalizedEmail.includes('carlos')) {
          const supervisorUser = INITIAL_USERS[2];
          setUser(supervisorUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(supervisorUser));
          syncRoleCookie(supervisorUser.role);
          return { success: true, role: supervisorUser.role };
        }
        return { success: false, error: 'Invalid credentials. Please use an authorized Asinta Architects account.' };
      }

      setUser(matchedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(matchedUser));
      syncRoleCookie(matchedUser.role);
      return { success: true, role: matchedUser.role };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Authentication failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    syncRoleCookie(null);
  };

  const switchUser = (userId: string) => {
    const target = INITIAL_USERS.find((u) => u.id === userId);
    if (target) {
      setUser(target);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(target));
      syncRoleCookie(target.role);
    }
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
        switchUser,
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
