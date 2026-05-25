import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import authService, { LoginRequest, RegisterRequest, Tokens, User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  tokens: Tokens | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Khởi tạo auth state khi app mở
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔐 [AuthContext] Initializing auth...');
        const authenticated = await authService.isAuthenticated();
        console.log('🔐 [AuthContext] Auth Check on App Start:', authenticated);
        
        if (authenticated) {
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            console.log('✅ [AuthContext] User restored from storage:', currentUser.email);
            setUser(currentUser);
            setIsAuthenticated(true);
          }
        } else {
          console.log('❌ [AuthContext] No authentication found - user needs to login');
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('[AuthContext] Error initializing auth:', err);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsInitialized(true);
      }
    };
    initializeAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔐 [AuthContext] Login attempt:', email);
      const loginRequest: LoginRequest = { email, password, type: 'customer' };
      const result = await authService.login(loginRequest);
      console.log('✅ [AuthContext] Login successful:', email);
      setUser(result.user);
      setTokens(result.tokens);
      setIsAuthenticated(true); // ✅ Toàn app nhận được update này
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Đăng nhập thất bại';
      console.error('[AuthContext] Login error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, full_name: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔐 [AuthContext] Register attempt:', email);
      const registerRequest: RegisterRequest = { email, password, full_name, role: 'customer' };
      const result = await authService.register(registerRequest);
      console.log('✅ [AuthContext] Register successful:', email);
      setUser(result.user);
      setTokens(result.tokens);
      setIsAuthenticated(true); // ✅ Toàn app nhận được update này
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Đăng ký thất bại';
      console.error('[AuthContext] Register error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔐 [AuthContext] Google login attempt');
      const result = await authService.loginWithGoogle({ idToken });
      console.log('✅ [AuthContext] Google login successful');
      setUser(result.user);
      setTokens(result.tokens);
      setIsAuthenticated(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Đăng nhập Google thất bại';
      console.error('[AuthContext] Google login error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔐 [AuthContext] Logout');
      await authService.logout();
      console.log('✅ [AuthContext] Logout successful');
      setUser(null);
      setTokens(null);
      setIsAuthenticated(false); // ✅ Toàn app nhận được update này
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Đăng xuất thất bại';
      console.error('[AuthContext] Logout error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Don't render children until auth is initialized
  if (!isInitialized) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{ user, tokens, loading, error, isAuthenticated, login, register, loginWithGoogle, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook dùng thay thế useAuthService cũ — API giữ nguyên, không cần sửa các screen
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}