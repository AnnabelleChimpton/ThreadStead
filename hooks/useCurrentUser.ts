import { useState, useEffect } from 'react';
import { UserRole } from '@prisma/client';

export interface CurrentUser {
  id: string;
  did: string;
  role: UserRole;
  primaryHandle: string | null;
}

export interface UseCurrentUserResult {
  user: CurrentUser | null;
  loading: boolean;
  loggedIn: boolean;
}

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.loggedIn && data.user) {
            setUser(data.user);
            setLoggedIn(true);
          } else {
            setUser(null);
            setLoggedIn(false);
          }
        } else {
          setUser(null);
          setLoggedIn(false);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
        setUser(null);
        setLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  return { user, loading, loggedIn };
}