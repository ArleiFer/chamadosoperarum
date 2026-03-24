import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, role }: { children: React.ReactNode, role: string }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerkAuth();
  const [localUser, setLocalUser] = useState<User | null>(null);

  useEffect(() => {
    if (isLoaded && clerkUser) {
      // Sync Clerk user with local DB
      fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkId: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || `${clerkUser.id}@operarum.com`,
          name: clerkUser.fullName || clerkUser.firstName || 'Usuário',
          role: role // 'client', 'provider', or 'admin'
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error("Failed to sync user:", data.error);
        } else {
          setLocalUser(data);
        }
      })
      .catch(err => console.error("Failed to sync user", err));
    } else if (isLoaded && !clerkUser) {
      setLocalUser(null);
    }
  }, [clerkUser, isLoaded, role]);

  const refreshUser = async () => {
    if (clerkUser) {
      try {
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || `${clerkUser.id}@operarum.com`,
            name: clerkUser.fullName || clerkUser.firstName || 'Usuário',
            role: role
          })
        });
        const data = await res.json();
        if (!data.error) {
          setLocalUser(data);
        }
      } catch (err) {
        console.error("Failed to refresh user", err);
      }
    }
  };

  const logout = () => {
    signOut();
  };

  return (
    <AuthContext.Provider value={{ user: localUser, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

