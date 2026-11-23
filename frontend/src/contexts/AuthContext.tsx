import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { UNAUTHORIZED_EVENT, tokenStorage } from '../services/api';
import { authApi } from '../services/endpoints';
import type { User } from '../types';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  // Restaura a sessão a partir do token salvo.
  useEffect(() => {
    if (!tokenStorage.get()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(({ user: me }) => setUser(me))
      .catch(() => tokenStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  // Token expirado/inválido em qualquer requisição → encerra a sessão.
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: logged, token } = await authApi.login(email, password);
    tokenStorage.set(token);
    setUser(logged);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const { user: created, token } = await authApi.register(data);
    tokenStorage.set(token);
    setUser(created);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateUser: setUser }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
