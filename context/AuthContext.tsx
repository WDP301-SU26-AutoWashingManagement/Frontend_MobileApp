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
  forgotPassword: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  updateProfile: (updates: { full_name?: string; phone?: string; avatar_url?: string } | FormData) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
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
          // Fetch fresh profile in the background to sync latest points/referral codes
          try {
            const freshUser = await authService.getProfile();
            console.log('🔄 [AuthContext] Fresh profile fetched from server:', freshUser.email);
            setUser(freshUser);
          } catch (profileErr) {
            console.error('[AuthContext] Failed to fetch fresh profile on start:', profileErr);
            const stillAuthenticated = await authService.isAuthenticated();
            if (!stillAuthenticated) {
              console.log('⚠️ [AuthContext] Session expired or invalid, logging out user');
              setUser(null);
              setIsAuthenticated(false);
            }
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
      console.log('✅ [AuthContext] Login successful, fetching full profile:', email);
      
      const fullUser = await authService.getProfile();
      setUser(fullUser);
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
      console.log('✅ [AuthContext] Register successful, fetching full profile:', email);
      
      const fullUser = await authService.getProfile();
      setUser(fullUser);
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
      console.log('🔐 [AuthContext] Google idToken received (len):', idToken?.length);
      console.log('✅ [AuthContext] Google login successful, fetching full profile');
      
      const fullUser = await authService.getProfile();
      setUser(fullUser);
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

  const forgotPassword = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔐 [AuthContext] Forgot password request:', email);
      await authService.forgotPassword(email);
      console.log('✅ [AuthContext] Forgot password request sent');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Yêu cầu cấp lại mật khẩu thất bại';
      console.error('[AuthContext] Forgot password error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, otp: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔐 [AuthContext] Verify OTP request:', email);
      await authService.verifyOtp(email, otp);
      console.log('✅ [AuthContext] OTP verified');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Xác minh OTP thất bại';
      console.error('[AuthContext] Verify OTP error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string, otp: string, newPassword: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔐 [AuthContext] Reset password request:', email);
      await authService.resetPassword(email, otp, newPassword);
      console.log('✅ [AuthContext] Password reset successful');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại';
      console.error('[AuthContext] Reset password error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: { full_name?: string; phone?: string; avatar_url?: string } | FormData) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔐 [AuthContext] Updating profile...');
      const updatedUser = await authService.updateProfile(updates);
      console.log('✅ [AuthContext] Profile updated:', updatedUser.email);
      setUser(updatedUser);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Cập nhật hồ sơ thất bại';
      console.error('[AuthContext] Update profile error:', errorMsg);
      console.error(err);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔐 [AuthContext] Changing password...');
      await authService.changePassword(oldPassword, newPassword);
      console.log('✅ [AuthContext] Password changed successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Thay đổi mật khẩu thất bại';
      console.error('[AuthContext] Change password error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Don't render children until auth is initialized
  if (!isInitialized) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        loading,
        error,
        isAuthenticated,
        login,
        register,
        loginWithGoogle,
        logout,
        clearError,
        forgotPassword,
        verifyOtp,
        resetPassword,
        updateProfile,
        changePassword,
      }}>
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