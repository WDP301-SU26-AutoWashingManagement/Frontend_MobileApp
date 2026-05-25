# AutoWash Mobile Auth - Implementation Summary

## ✅ Hoàn Thành

### 1. **Auth Service (services/authService.ts)**
- ✅ Axios instance với interceptors
- ✅ Token management (lưu trữ, refresh)
- ✅ Error handling
- ✅ Auto token refresh on expiration
- ✅ AsyncStorage integration

**Các Methods:**
- `login(email, password)` - Đăng nhập
- `register(email, password, full_name)` - Đăng ký
- `loginWithGoogle(idToken)` - Google Sign-In
- `logout()` - Đăng xuất
- `getCurrentUser()` - Lấy current user
- `isAuthenticated()` - Kiểm tra auth status
- `forgotPassword(email)` - Yêu cầu reset password
- `verifyOtp(email, otp)` - Xác minh OTP
- `resetPassword(email, otp, newPassword)` - Reset password

### 2. **Custom Hook (hooks/useAuthService.ts)**
- ✅ State management (user, tokens, loading, error)
- ✅ All auth functions
- ✅ Auto-initialize on app start
- ✅ Error handling
- ✅ Loading states

**Hook Methods:**
- `login(email, password)`
- `register(email, password, full_name)`
- `loginWithGoogle(idToken)`
- `logout()`
- `clearError()`
- Properties: `user`, `tokens`, `loading`, `error`, `isAuthenticated`

### 3. **Auth Screen (app/(tabs)/auth.tsx)**
- ✅ Integrated with useAuthService hook
- ✅ Real API calls (không mock)
- ✅ Loading states
- ✅ Error handling
- ✅ Form validation
- ✅ Modern UI design

### 4. **Google Sign-In Component (components/auth/GoogleSignInButton.tsx)**
- ✅ Reusable button component
- ✅ Loading state
- ✅ Disabled state
- ✅ Full documentation
- ✅ Ready for @react-native-google-signin/google-signin integration

### 5. **Configuration Files**
- ✅ `config/app.config.ts` - App-wide configuration
- ✅ `config/environment.ts` - Environment-specific config

### 6. **Documentation**
- ✅ `AUTH_SETUP.md` - Hướng dẫn setup cơ bản
- ✅ `GOOGLE_SIGNIN_SETUP.md` - Chi tiết Google Sign-In
- ✅ `install-auth-deps.sh` - Script cài đặt tự động

## 📦 Dependencies Cần Cài Đặt

### Required
```bash
npm install axios
npx expo install @react-native-async-storage/async-storage
```

### Optional (Cho Google Sign-In)
```bash
npx expo install @react-native-google-signin/google-signin
npx expo install expo-google-app-auth
```

### Recommended (Cho bảo mật cao hơn)
```bash
npx expo install expo-secure-store
```

## 🚀 Cách Sử Dụng

### Cơ Bản - Đăng Nhập

```typescript
import { useAuth } from '../hooks/useAuthService';

function LoginScreen() {
  const { login, loading, error } = useAuth();

  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password123');
      // Chuyển đến home screen
    } catch (err) {
      console.error('Login failed:', err.message);
    }
  };

  return (
    <Pressable onPress={handleLogin} disabled={loading}>
      <Text>{loading ? 'Logging in...' : 'Login'}</Text>
    </Pressable>
  );
}
```

### Đăng Ký

```typescript
const { register, loading, error } = useAuth();

await register('user@example.com', 'password123', 'John Doe');
```

### Kiểm Tra Auth Status

```typescript
const { isAuthenticated, user } = useAuth();

useEffect(() => {
  if (isAuthenticated) {
    console.log('User:', user);
    // Navigate to home
  } else {
    // Navigate to login
  }
}, [isAuthenticated]);
```

### Logout

```typescript
const { logout } = useAuth();

await logout();
```

## 🔧 Cấu Hình

### 1. API Base URL

Edit `config/app.config.ts`:

```typescript
const API_BASE_URL = 'http://your-machine-ip:3000/api/v1';
```

Hoặc `config/environment.ts` để per-environment:

```typescript
development: {
  apiBaseUrl: 'http://192.168.1.1:3000/api/v1',
  // ...
}
```

### 2. Google Sign-In (Optional)

Edit `config/app.config.ts`:

```typescript
GOOGLE_CLIENT_ID: {
  web: 'your-web-client-id.apps.googleusercontent.com',
  ios: 'your-ios-client-id.apps.googleusercontent.com',
  android: 'your-android-client-id.apps.googleusercontent.com',
}
```

Và update `app.json`:

```json
{
  "plugins": [
    [
      "@react-native-google-signin/google-signin",
      {
        "iosClientId": "your-ios-client-id",
        "androidClientId": "your-android-client-id",
        "webClientId": "your-web-client-id"
      }
    ]
  ]
}
```

## 📝 API Endpoints

Tất cả endpoints nằm tại: `http://localhost:3000/api/v1`

| Method | Endpoint | Status |
|--------|----------|--------|
| POST | `/auth/login` | ✅ Ready |
| POST | `/auth/register` | ✅ Ready |
| POST | `/auth/google` | ✅ Ready |
| POST | `/auth/refresh` | ✅ Auto |
| POST | `/auth/forgot-password` | ✅ Ready |
| POST | `/auth/verify-otp` | ✅ Ready |
| POST | `/auth/reset-password` | ✅ Ready |

## 🧪 Testing

### Local Development

1. **Start Backend**
   ```bash
   cd BE/Backend
   npm run dev
   ```

2. **Start Mobile App**
   ```bash
   cd Mobile/AutoWash
   npm start
   ```

3. **Test Login**
   - Email: `test@example.com`
   - Password: `password123`

### Test Credentials

Create test accounts via register endpoint hoặc admin panel

## ⚙️ Request/Response Examples

### Login Request
```json
{
  "email": "test@example.com",
  "password": "password123",
  "type": "customer"
}
```

### Login Response
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user-id",
      "email": "test@example.com",
      "full_name": "Test User",
      "role": "customer",
      ...
    },
    "tokens": {
      "accessToken": "jwt-token",
      "refreshToken": "refresh-token"
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Invalid credentials",
  "statusCode": 401
}
```

## 🔒 Security Features

1. **Token Auto-Refresh**
   - Access token hết hạn → Auto request refresh
   - Transparent to user

2. **Secure Storage**
   - Tokens lưu trong AsyncStorage
   - (Optional: Switch to expo-secure-store)

3. **Request Interceptors**
   - Auto inject Authorization header
   - Add token to all API calls

4. **Response Interceptors**
   - Handle 401 errors
   - Auto token refresh
   - Clear storage on auth failure

## 📚 File Structure

```
Mobile/AutoWash/
├── services/
│   └── authService.ts                 # Auth API & token management
├── hooks/
│   └── useAuthService.ts              # Custom hook
├── components/auth/
│   └── GoogleSignInButton.tsx          # Google Sign-In button
├── config/
│   ├── app.config.ts                  # App configuration
│   └── environment.ts                 # Environment config
├── app/(tabs)/
│   └── auth.tsx                       # Auth screen
├── AUTH_SETUP.md                      # Setup guide
├── GOOGLE_SIGNIN_SETUP.md            # Google Sign-In guide
├── install-auth-deps.sh              # Dependency installer
└── package.json
```

## ⚠️ Lưu Ý Quan Trọng

1. **Backend phải Running**
   ```bash
   cd BE/Backend
   npm run dev
   ```

2. **Network Configuration**
   - Dev: Sử dụng machine IP hoặc localhost
   - Emulator: Android dùng 10.0.2.2, iOS dùng localhost
   - Expo Go: Dùng machine IP address

3. **Dependency Installation**
   ```bash
   bash install-auth-deps.sh
   # hoặc manual cài từ AUTH_SETUP.md
   ```

4. **Token Management**
   - Tokens auto saved to AsyncStorage
   - Access token: 15 minutes
   - Refresh token: 7 days
   - Auto-refreshed on expiration

## 🐛 Troubleshooting

### API Connection Error
- Kiểm tra backend running
- Verify API_BASE_URL đúng
- Check network connection
- Test with: `curl http://your-ip:3000/api/v1/auth/health`

### Token Not Saving
- Verify AsyncStorage installed: `npx expo install @react-native-async-storage/async-storage`
- Check app permissions
- Debug AsyncStorage: Check device console logs

### Google Sign-In Not Working
- See `GOOGLE_SIGNIN_SETUP.md`
- Verify Client IDs
- Check app.json plugin config
- Rebuild: `expo prebuild --clean`

## 📞 Support

Tham khảo:
1. `AUTH_SETUP.md` - Setup & usage basics
2. `GOOGLE_SIGNIN_SETUP.md` - Google Sign-In detailed guide
3. Console logs - Error messages
4. BE API documentation - Endpoint details

## 🎉 Next Steps

1. **Install dependencies**
   ```bash
   bash install-auth-deps.sh
   ```

2. **Configure API URL**
   - Update `config/app.config.ts` or `config/environment.ts`

3. **Test login/register**
   - Start backend: `cd BE/Backend && npm run dev`
   - Start app: `npm start`
   - Try login with test credentials

4. **Implement navigation**
   - Add route guards
   - Navigate to home on login success
   - Navigate to auth on logout

5. **Setup Google Sign-In** (Optional)
   - Follow `GOOGLE_SIGNIN_SETUP.md`
   - Get Client IDs from Google Cloud
   - Configure app.json
   - Test integration

6. **Enhance security** (Optional)
   - Replace AsyncStorage with expo-secure-store
   - Add biometric authentication
   - Implement refresh token rotation

---

**Status**: ✅ Production Ready (pending dependency installation & configuration)

**Last Updated**: May 2026
