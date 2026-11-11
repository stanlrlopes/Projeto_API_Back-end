import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Role, User } from '../types/api.types';
import { LoginFormInput, RegisterApiPayload } from '../schemas';
import { authService } from '../services/authService';
import {
  FORBIDDEN_EVENT,
  isValidJwtStructure,
  TOKEN_STORAGE_KEY,
  UNAUTHORIZED_EVENT,
} from '../services/api';
import { ToastContext } from './ToastContext';

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: Role | null;
  studentId: string | null;
  teacherId: string | null;
  login: (credentials: LoginFormInput) => Promise<User>;
  register: (payload: RegisterApiPayload) => Promise<User>;
  logout: () => void;
  refreshSession: () => Promise<User | null>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

function normalizeUserLinks(userData: User): User {
  return {
    ...userData,
    studentId: userData.studentId ?? userData.student?.id ?? null,
    teacherId: userData.teacherId ?? userData.teacher?.id ?? null,
  };
}

function getInitialStoredToken(): string | null {
  const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!isValidJwtStructure(raw)) {
    if (raw) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    return null;
  }
  return raw;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(getInitialStoredToken);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() =>
    Boolean(getInitialStoredToken()),
  );

  const toastCtx = useContext(ToastContext);

  const clearSessionState = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshSession = useCallback(async (): Promise<User | null> => {
    const storedToken = getInitialStoredToken();
    if (!storedToken) {
      clearSessionState();
      setIsLoading(false);
      return null;
    }

    try {
      setIsLoading(true);
      const currentUser = await authService.me();
      const normalized = normalizeUserLinks(currentUser);
      setToken(storedToken);
      setUser(normalized);
      return normalized;
    } catch {
      clearSessionState();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [clearSessionState]);

  useEffect(() => {
    const storedToken = getInitialStoredToken();
    if (storedToken) {
      void refreshSession();
    } else {
      setIsLoading(false);
    }
  }, [refreshSession]);

  useEffect(() => {
    const handleUnauthorized = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      clearSessionState();
      setIsLoading(false);
      if (toastCtx) {
        toastCtx.warning(
          'Sessão encerrada',
          customEvent.detail?.message ||
            'Sua sessão expirou ou o token não é mais válido. Faça login novamente.',
        );
      }
    };

    const handleForbidden = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      // 403 Forbidden: preserva a sessão autenticada e apenas informa a restrição de permissão
      if (toastCtx) {
        toastCtx.error(
          'Permissão insuficiente (403)',
          customEvent.detail?.message ||
            'Seu perfil atual não possui permissão para realizar esta operação.',
        );
      }
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    window.addEventListener(FORBIDDEN_EVENT, handleForbidden);

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
      window.removeEventListener(FORBIDDEN_EVENT, handleForbidden);
    };
  }, [clearSessionState, toastCtx]);

  const login = useCallback(
    async (credentials: LoginFormInput): Promise<User> => {
      const { token: jwtToken, user: loggedUser } =
        await authService.login(credentials);
      const normalized = normalizeUserLinks(loggedUser);
      if (isValidJwtStructure(jwtToken)) {
        localStorage.setItem(TOKEN_STORAGE_KEY, jwtToken);
        setToken(jwtToken);
      }
      setUser(normalized);
      return normalized;
    },
    [],
  );

  const register = useCallback(
    async (payload: RegisterApiPayload): Promise<User> => {
      const createdUser = await authService.register(payload);
      return normalizeUserLinks(createdUser);
    },
    [],
  );

  const logout = useCallback(() => {
    clearSessionState();
    if (toastCtx) {
      toastCtx.info(
        'Sessão encerrada',
        'Você saiu da plataforma EducaAPI com segurança.',
      );
    }
  }, [clearSessionState, toastCtx]);

  const value = useMemo<AuthContextValue>(() => {
    const isAuthenticated = Boolean(token && user);
    const role = user?.role ?? null;
    const studentId = user?.studentId ?? user?.student?.id ?? null;
    const teacherId = user?.teacherId ?? user?.teacher?.id ?? null;

    return {
      user,
      token,
      isAuthenticated,
      isLoading,
      role,
      studentId,
      teacherId,
      login,
      register,
      logout,
      refreshSession,
    };
  }, [user, token, isLoading, login, register, logout, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
