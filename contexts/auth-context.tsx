import {
  registerForPushNotificationsAsync,
  subscribeToPushTokenUpdates,
  unregisterCurrentPushTokenAsync,
} from '@/services/push-notifications';
import * as SecureStore from 'expo-secure-store';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

export type AuthUser = {
  backendId?: string;
  id: string;
  name: string;
  email: string;
  friendCode?: string;
  picture?: string | null;
  contactNumber?: string;
  homeArea?: string;
  homeLat?: number | null;
  homeLng?: number | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isRestoringSession: boolean;
  setUser: (user: AuthUser | null) => void;
  setSession: (user: AuthUser, token: string) => Promise<void>;
  updateUser: (profile: Partial<AuthUser>) => void;
  logout: () => Promise<void>;
};

const SESSION_STORAGE_KEY = 'lesgo_session';
const AuthContext = createContext<AuthContextValue | null>(null);

type StoredSession = {
  user: AuthUser;
  token: string;
};

function isStoredSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as Partial<StoredSession>;
  return typeof session.token === 'string' && Boolean(session.token) && Boolean(session.user);
}

async function isSecureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch (error) {
    console.warn('SecureStore availability check failed:', error);
    return false;
  }
}

async function saveStoredSession(session: StoredSession) {
  if (!(await isSecureStoreAvailable())) {
    return;
  }

  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session));
}

async function loadStoredSession() {
  if (!(await isSecureStoreAvailable())) {
    return null;
  }

  const storedSession = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);

  if (!storedSession) {
    return null;
  }

  const parsedSession = JSON.parse(storedSession);
  return isStoredSession(parsedSession) ? parsedSession : null;
}

async function deleteStoredSession() {
  if (!(await isSecureStoreAvailable())) {
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const setSession = async (nextUser: AuthUser, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);

    try {
      await saveStoredSession({ user: nextUser, token: nextToken });
    } catch (error) {
      console.warn('Could not save auth session:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const storedSession = await loadStoredSession();

        if (!isMounted || !storedSession) {
          return;
        }

        setUser(storedSession.user);
        setToken(storedSession.token);
      } catch (error) {
        console.warn('Could not restore auth session:', error);
        await deleteStoredSession().catch(() => {});
      } finally {
        if (isMounted) {
          setIsRestoringSession(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    registerForPushNotificationsAsync(token).catch((error) => {
      console.warn('Push notification registration failed:', error);
    });

    const subscription = subscribeToPushTokenUpdates(token);

    return () => {
      subscription.remove();
    };
  }, [token]);

  const updateUser = (profile: Partial<AuthUser>) => {
    if (!user) {
      return;
    }

    const nextUser = {
      ...user,
      ...profile,
    };

    setUser(nextUser);

    if (token) {
      saveStoredSession({ user: nextUser, token }).catch((error) => {
        console.warn('Could not update stored auth session:', error);
      });
    }
  };

  const logout = async () => {
    try {
      await unregisterCurrentPushTokenAsync(token);
    } catch (error) {
      console.warn('Push notification token removal failed:', error);
    }

    setUser(null);
    setToken(null);

    try {
      await deleteStoredSession();
    } catch (error) {
      console.warn('Could not clear auth session:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isRestoringSession, setUser, setSession, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
