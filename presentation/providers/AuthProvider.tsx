import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthUser } from "@/core/domain/entities/User";
import type {
  LoginCredentials,
  RegisterData,
  RegisterInput,
} from "@/core/domain/types/auth";
import type { IAuthService } from "@/core/domain/services/IAuthService";
import { TokenStorage } from "@/core/infrastructure/storage/TokenStorage";
import { HttpClient } from "@/core/infrastructure/api/HttpClient";
import container from "@/core/infrastructure/di/container";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData | RegisterInput) => Promise<boolean>;
  logout: () => Promise<void>;
  sendPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, code: string) => Promise<void>;
  sendEmailVerification: (email: string) => Promise<void>;
  verifyEmail: (email: string, token: string) => Promise<void>;
  requestKbzPayVerification: (message: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const httpClient = container.resolve<HttpClient>("httpClient");
    httpClient.setOnUnauthorized(() => {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      queryClient.clear();
    });
  }, [queryClient]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const hasToken = await TokenStorage.hasToken();
      if (!hasToken) {
        if (mounted) setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }
      try {
        const authService = container.resolve<IAuthService>("authService");
        const user = await authService.getProfile();
        if (mounted) {
          setState({
            user,
            isLoading: false,
            isAuthenticated: user !== null,
          });
        }
      } catch {
        await TokenStorage.clearTokens();
        if (mounted) setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    })();
    return () => { mounted = false; };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const authService = container.resolve<IAuthService>("authService");
    const user = await authService.login(credentials);
    if (!user) return false;

    await TokenStorage.setAccessToken(user.accessToken);
    setState({ user, isLoading: false, isAuthenticated: true });
    return true;
  }, []);

  const register = useCallback(async (data: RegisterData | RegisterInput) => {
    const authService = container.resolve<IAuthService>("authService");
    const user = await authService.register(data);
    if (!user) return false;

    await TokenStorage.setAccessToken(user.accessToken);
    setState({ user, isLoading: false, isAuthenticated: true });
    return true;
  }, []);

  const logout = useCallback(async () => {
    await TokenStorage.clearTokens();
    queryClient.clear();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, [queryClient]);

  const sendPhoneOtp = useCallback(async (phone: string) => {
    const authService = container.resolve<IAuthService>("authService");
    await authService.sendPhoneOtp(phone);
  }, []);

  const verifyPhoneOtp = useCallback(async (phone: string, code: string) => {
    const authService = container.resolve<IAuthService>("authService");
    await authService.verifyPhoneOtp(phone, code);
  }, []);

  const sendEmailVerification = useCallback(async (email: string) => {
    const authService = container.resolve<IAuthService>("authService");
    await authService.sendEmailVerification(email);
  }, []);

  const verifyEmail = useCallback(async (email: string, token: string) => {
    const authService = container.resolve<IAuthService>("authService");
    await authService.verifyEmail(email, token);
  }, []);

  const requestKbzPayVerification = useCallback(async (message: string) => {
    const authService = container.resolve<IAuthService>("authService");
    await authService.requestKbzPayVerification(message);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
      sendPhoneOtp,
      verifyPhoneOtp,
      sendEmailVerification,
      verifyEmail,
      requestKbzPayVerification,
    }),
    [
      state,
      login,
      register,
      logout,
      sendPhoneOtp,
      verifyPhoneOtp,
      sendEmailVerification,
      verifyEmail,
      requestKbzPayVerification,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
