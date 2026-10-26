import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  apiGet,
  apiPost,
  publicGet,
  getToken,
  setToken,
  removeToken,
} from '../lib/api';
import type {
  User,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
} from '../types';
import type { DemoInfo, DemoRole } from '../lib/demo';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<User>;
  /** null — ещё не знаем, включён ли демо-режим на сервере */
  demo: DemoInfo | null;
  isDemoUser: boolean;
  demoLogin: (role: DemoRole) => Promise<User>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Грузимся только если есть токен для проверки — иначе старт сразу готов
  const [isLoading, setIsLoading] = useState(() => !!getToken());

  // On mount: verify existing token
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    // Пока шёл запрос, могли войти заново (например, /demo/admin поверх старой сессии) —
    // тогда ответ про прежнего пользователя уже не нужен
    apiGet<User>('/api/auth/me')
      .then((me) => { if (getToken() === token) setUser(me); })
      .catch(() => { if (getToken() === token) removeToken(); })
      .finally(() => setIsLoading(false));
  }, []);

  const [demo, setDemo] = useState<DemoInfo | null>(null);
  useEffect(() => {
    publicGet<DemoInfo>('/api/auth/demo')
      .then(setDemo)
      .catch(() => setDemo({ enabled: false, accounts: {} }));
  }, []);

  const demoLogin = async (role: DemoRole): Promise<User> => {
    const response = await apiPost<TokenResponse>('/api/auth/demo', { role });
    setToken(response.access_token);
    setUser(response.user);
    return response.user;
  };

  const isDemoUser =
    !!user && !!demo?.enabled && Object.values(demo.accounts).includes(user.email);

  const login = async (data: LoginRequest) => {
    const response = await apiPost<TokenResponse>('/api/auth/login', data);
    setToken(response.access_token);
    setUser(response.user);
  };

  const register = async (data: RegisterRequest): Promise<User> => {
    const response = await apiPost<TokenResponse>('/api/auth/register', data);
    setToken(response.access_token);
    setUser(response.user);
    return response.user;
  };

  const refreshUser = async () => {
    const updated = await apiGet<User>('/api/auth/me');
    setUser(updated);
  };

  const logout = () => {
    removeToken();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        demo,
        isDemoUser,
        demoLogin,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook соседствует с провайдером по соглашению
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
