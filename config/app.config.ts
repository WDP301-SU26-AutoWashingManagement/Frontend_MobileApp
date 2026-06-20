// Mobile app configuration
// Uses environment variables from .env file

import { Platform } from 'react-native';

export const API_CONFIG = {
  // Backend API Base URL
  API_BASE_URL: Platform.OS === 'web' 
    ? 'http://localhost:3000/api/v1' 
    : (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.3:3000/api/v1'),

  // API Timeout in milliseconds
  API_TIMEOUT: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '15000', 10),

  // Token configuration
  TOKEN_ACCESS_EXPIRES_IN: 15 * 60 * 1000, // 15 minutes
  TOKEN_REFRESH_EXPIRES_IN: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: {
    web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  },
};

// App URLs
export const APP_ROUTES = {
  // Auth routes
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT_PASSWORD: 'forgot-password',

  // Main routes
  HOME: 'home',
  BOOKINGS: 'bookings',
  PROFILE: 'profile',
  SETTINGS: 'settings',
};

// Feature flags
export const FEATURES = {
  ENABLE_GOOGLE_LOGIN: process.env.EXPO_PUBLIC_ENABLE_GOOGLE_LOGIN === 'true',
  ENABLE_APPLE_LOGIN: false,
  ENABLE_BIOMETRIC_LOGIN: process.env.EXPO_PUBLIC_ENABLE_BIOMETRIC_LOGIN === 'true',
};

// Toast/Alert messages
export const MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: 'Đăng nhập thành công!',
    LOGIN_ERROR: 'Đăng nhập thất bại. Vui lòng kiểm tra thông tin.',
    REGISTER_SUCCESS: 'Đăng ký thành công!',
    REGISTER_ERROR: 'Đăng ký thất bại. Vui lòng thử lại.',
    LOGOUT_SUCCESS: 'Đăng xuất thành công!',
    SESSION_EXPIRED: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
    INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác.',
    EMAIL_NOT_FOUND: 'Email này chưa được đăng ký.',
    EMAIL_ALREADY_EXISTS: 'Email này đã được sử dụng.',
  },
  NETWORK: {
    NO_CONNECTION: 'Không có kết nối mạng. Vui lòng kiểm tra Internet.',
    TIMEOUT: 'Yêu cầu hết thời gian chờ. Vui lòng thử lại.',
    SERVER_ERROR: 'Lỗi máy chủ. Vui lòng thử lại sau.',
  },
};
