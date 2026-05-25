# Auth Setup Guide - Mobile

Hướng dẫn setup authentication cho mobile app AutoWash

## 📦 Dependencies Cần Cài Đặt

### 1. Axios (HTTP Client)
```bash
npm install axios
# hoặc
yarn add axios
```

### 2. React Native Async Storage (Lưu trữ token)
```bash
npx expo install @react-native-async-storage/async-storage
```

### 3. Google Sign-In (Tùy chọn - cho đăng nhập Google)
```bash
npx expo install @react-native-google-signin/google-signin expo-google-app-auth
```

## 🗂️ File Structure

```
AutoWash/
├── services/
│   └── authService.ts          # Auth API service với axios
├── hooks/
│   └── useAuthService.ts       # Custom hook cho authentication
└── app/
    └── (tabs)/
        └── auth.tsx            # Auth screen
```

## 🔧 Cấu Hình

### 1. Backend Base URL

Trong file `services/authService.ts`, cập nhật URL:

```typescript
const API_BASE_URL = 'http://localhost:3000/api/v1';  // Development
// hoặc
const API_BASE_URL = 'https://your-api.com/api/v1';   // Production
```

### 2. Google Sign-In (Nếu sử dụng)

Thêm vào `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "@react-native-google-signin/google-signin",
        {
          "iosClientId": "your-ios-client-id.apps.googleusercontent.com",
          "androidClientId": "your-android-client-id.apps.googleusercontent.com",
          "webClientId": "your-web-client-id.apps.googleusercontent.com"
        }
      ]
    ]
  }
}
```

## 📝 Cách Sử Dụng

### Login Đơn Giản

```typescript
import { useAuth } from '../../hooks/useAuthService';

function MyComponent() {
  const { login, loading, error } = useAuth();

  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password123');
      console.log('Login successful!');
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

### Register

```typescript
const { register, loading } = useAuth();

const handleRegister = async () => {
  try {
    await register('user@example.com', 'password123', 'John Doe');
    console.log('Registration successful!');
  } catch (err) {
    console.error('Registration failed:', err.message);
  }
};
```

### Google Login

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const { loginWithGoogle, loading } = useAuth();

const handleGoogleLogin = async () => {
  try {
    // Initialize Google Sign-In
    await GoogleSignin.configure({
      webClientId: 'your-web-client-id',
    });

    const userInfo = await GoogleSignin.signIn();
    const idToken = userInfo.idToken;

    if (idToken) {
      await loginWithGoogle(idToken);
      console.log('Google login successful!');
    }
  } catch (err) {
    console.error('Google login failed:', err);
  }
};
```

### Kiểm tra Auth Status

```typescript
const { isAuthenticated, user } = useAuth();

useEffect(() => {
  if (isAuthenticated) {
    console.log('User:', user);
    // Navigate to home screen
  }
}, [isAuthenticated]);
```

### Logout

```typescript
const { logout, loading } = useAuth();

const handleLogout = async () => {
  try {
    await logout();
    console.log('Logout successful!');
  } catch (err) {
    console.error('Logout failed:', err);
  }
};
```

## 🔑 Token Management

Tokens được tự động lưu và quản lý:

- **Access Token** - Được sử dụng trong tất cả requests (15 phút)
- **Refresh Token** - Được sử dụng để lấy access token mới (7 ngày)
- **Tokens được lưu trong** - AsyncStorage (bảo mật trên device)

### Automatic Token Refresh

Khi access token hết hạn, axios interceptor sẽ:
1. Tự động gọi `/auth/refresh` với refresh token
2. Lưu token mới
3. Retry request ban đầu

Nếu refresh token cũng hết hạn, user sẽ bị logout tự động.

## 🚨 Error Handling

```typescript
const { error, clearError } = useAuth();

useEffect(() => {
  if (error) {
    Alert.alert('Error', error);
    clearError(); // Clear error sau khi hiển thị
  }
}, [error]);
```

## 🔐 Security Notes

1. **Token Storage**: Tokens được lưu trong AsyncStorage (lưu ý: không phải lưu trữ an toàn nhất)
   - Để bảo mật cao hơn, xem xét sử dụng expo-secure-store

2. **HTTPS Required**: Luôn sử dụng HTTPS cho production

3. **Token Expiration**: Access token có thời gian sống ngắn (15 phút)

4. **Authorization Header**: `Authorization: Bearer <token>`

## 🧪 Testing Endpoints

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Register
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'
```

### Google Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "google-id-token-here"
  }'
```

## 📚 API Endpoints

Tất cả endpoints nằm tại: `http://localhost:3000/api/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Đăng nhập với email/password |
| POST | `/auth/register` | Đăng ký tài khoản mới |
| POST | `/auth/google` | Đăng nhập với Google ID Token |
| POST | `/auth/refresh` | Làm mới access token |
| POST | `/auth/forgot-password` | Yêu cầu cấp lại mật khẩu |
| POST | `/auth/verify-otp` | Xác minh OTP |
| POST | `/auth/reset-password` | Đặt lại mật khẩu |

## 🐛 Troubleshooting

### Token không lưu được
- Kiểm tra AsyncStorage đã được cài đặt đúng
- Kiểm tra quyền truy cập lưu trữ của app

### API request fail
- Kiểm tra backend có running (port 3000)
- Kiểm tra URL base config đúng
- Kiểm tra network connection

### Google Sign-In không hoạt động
- Kiểm tra Google Client ID config
- Kiểm tra app.json plugin config
- Rebuild app native

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. Backend error message từ response
2. Console logs (check useAuth hooks)
3. AsyncStorage data (debug tools)
