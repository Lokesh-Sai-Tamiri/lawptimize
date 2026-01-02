'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import type { UserRole } from './types';

interface UserContextType {
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string;
    role: UserRole | null;
    organizationId: string | null;
    organizationName: string | null;
    joinedAt: string | null;
    advocateCode: string | null;
    highCourt: string | null;
  } | null;
  isLoading: boolean;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const [user, setUser] = useState<UserContextType['user']>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const fetchUserData = async () => {
    if (!clerkUser) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/me', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsLoading(false);
      } else if (response.status === 401) {
        // Session not ready yet, will retry
        console.log('Session not ready, will retry...');
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          setTimeout(fetchUserData, 1000 * (retryCount + 1));
        } else {
          // Max retries reached, stop loading
          console.error('Max retries reached for user data fetch');
          setUser(null);
          setIsLoading(false);
        }
      } else {
        // Other error, stop loading
        console.error('Error fetching user data:', response.status, response.statusText);
        setUser(null);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUser(null);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      // Reset retry count when user loads
      setRetryCount(0);
      fetchUserData();
    }
  }, [clerkUser, isLoaded]);

  const value: UserContextType = {
    user,
    isLoading,
    isAdmin: user?.role === 'admin',
    refreshUser: fetchUserData,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}
