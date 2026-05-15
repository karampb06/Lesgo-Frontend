import { createContext, PropsWithChildren, useContext, useState } from 'react';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  picture?: string | null;
  contactNumber?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  updateUser: (profile: Partial<AuthUser>) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const updateUser = (profile: Partial<AuthUser>) => {
    setUser((currentUser) => {
      if (!currentUser) {
        return currentUser;
      }

      return {
        ...currentUser,
        ...profile,
      };
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, updateUser, logout }}>
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
