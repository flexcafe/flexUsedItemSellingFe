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
import type { VerificationActionResult } from "@/core/domain/types/verification";
import { useServices } from "./ServicesProvider";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData | RegisterInput) => Promise<VerificationActionResult>;
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
  const { authService } = useServices();

  useEffect(() => {
    authService.onUnauthorized(() => {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      queryClient.clear();
    });
  }, [authService, queryClient]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = await authService.bootstrap();
        if (mounted) {
          setState({
            user,
            isLoading: false,
            isAuthenticated: user !== null,
          });
        }
      } catch {
        if (mounted) setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    })();
    return () => { mounted = false; };
  }, [authService]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const user = await authService.login(credentials);
    if (!user) return false;

    setState({ user, isLoading: false, isAuthenticated: true });
    return true;
  }, [authService]);

  const register = useCallback(async (data: RegisterData | RegisterInput) => {
    return authService.register(data);
  }, [authService]);

  const logout = useCallback(async () => {
    await authService.logout();
    queryClient.clear();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, [authService, queryClient]);

  const sendPhoneOtp = useCallback(async (phone: string) => {
    await authService.sendPhoneOtp(phone);
  }, [authService]);

  const verifyPhoneOtp = useCallback(async (phone: string, code: string) => {
    await authService.verifyPhoneOtp(phone, code);
  }, [authService]);

  const sendEmailVerification = useCallback(async (email: string) => {
    await authService.sendEmailVerification(email);
  }, [authService]);

  const verifyEmail = useCallback(async (email: string, token: string) => {
    await authService.verifyEmail(email, token);
  }, [authService]);

  const requestKbzPayVerification = useCallback(async (message: string) => {
    await authService.requestKbzPayVerification(message);
  }, [authService]);

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
