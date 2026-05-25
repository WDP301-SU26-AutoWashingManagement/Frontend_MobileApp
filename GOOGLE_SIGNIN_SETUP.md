# Google Sign-In Setup Guide - AutoWash Mobile

Hướng dẫn chi tiết để tích hợp Google Sign-In vào ứng dụng mobile AutoWash

## 📋 Yêu Cầu

- Google Cloud Project đã được tạo
- Client IDs cho Android, iOS và Web đã được lấy
- Expo CLI hoặc React Native CLI đã cài đặt

## 🔧 Cài Đặt Dependencies

### 1. Cài đặt Google Sign-In library

```bash
npx expo install @react-native-google-signin/google-signin expo-google-app-auth
```

### 2. Hoặc chạy script tự động

```bash
bash install-auth-deps.sh
```

## 🌐 Lấy Google Client IDs

### Step 1: Tạo Google Cloud Project

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Bật **Google+ API**

### Step 2: Tạo OAuth 2.0 Credentials

1. Vào **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**

#### Cho Web Client
- **Application type**: Web application
- **Authorized JavaScript origins**: 
  - `http://localhost:3000`
  - `https://yourdomain.com`
- **Authorized redirect URIs**: 
  - `http://localhost:3000/auth/callback`
  - `https://yourdomain.com/auth/callback`

#### Cho Android
1. Lấy **SHA-1 fingerprint** của project:
   ```bash
   # Nếu sử dụng EAS Build
   eas credentials
   
   # Hoặc tạo key riêng
   keytool -list -v -keystore ~/.android/debug.keystore
   ```

2. Tạo Android OAuth Client ID:
   - **Package name**: `com.autowash.mobile` (hoặc package name thực tế)
   - **SHA-1 fingerprint**: [Paste SHA-1 từ bước trên]

#### Cho iOS
1. Lấy **Bundle ID** từ `app.json`:
   ```json
   {
     "expo": {
       "ios": {
         "bundleIdentifier": "com.autowash.mobile"
       }
     }
   }
   ```

2. Tạo iOS OAuth Client ID

## ⚙️ Cấu Hình App

### 1. Cập nhật `app.json`

```json
{
  "expo": {
    "name": "AutoWash",
    "slug": "autowash",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.autowash.mobile",
      "supportsTabletMode": false
    },
    "android": {
      "package": "com.autowash.mobile",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "permissions": [
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ]
    },
    "plugins": [
      [
        "@react-native-google-signin/google-signin",
        {
          "iosClientId": "YOUR-IOS-CLIENT-ID.apps.googleusercontent.com",
          "androidClientId": "YOUR-ANDROID-CLIENT-ID.apps.googleusercontent.com",
          "webClientId": "YOUR-WEB-CLIENT-ID.apps.googleusercontent.com",
          "offlineEnabled": true,
          "forceCodeForRefreshToken": true
        }
      ]
    ]
  }
}
```

### 2. Cập nhật `config/app.config.ts`

```typescript
export const API_CONFIG = {
  // ... other config
  
  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: {
    web: 'YOUR-WEB-CLIENT-ID.apps.googleusercontent.com',
    ios: 'YOUR-IOS-CLIENT-ID.apps.googleusercontent.com',
    android: 'YOUR-ANDROID-CLIENT-ID.apps.googleusercontent.com',
  },
};
```

## 📱 Sử Dụng Google Sign-In

### 1. Import và Khởi Tạo (Trong Auth Screen hoặc App Root)

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuth } from '../../hooks/useAuthService';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import { API_CONFIG } from '../../config/app.config';

export function AuthScreen() {
  const { loginWithGoogle, loading, error } = useAuth();

  // Khởi tạo Google Sign-In
  React.useEffect(() => {
    try {
      GoogleSignin.configure({
        webClientId: API_CONFIG.GOOGLE_CLIENT_ID.web,
        iosClientId: API_CONFIG.GOOGLE_CLIENT_ID.ios,
        androidClientId: API_CONFIG.GOOGLE_CLIENT_ID.android,
        offlineEnabled: true,
      });
    } catch (error) {
      console.error('Google Sign-In config error:', error);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      // Check if user is already signed in
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        // If already signed in, use cached token
        const userInfo = await GoogleSignin.getTokens();
        const idToken = userInfo.id_token;
        
        if (idToken) {
          await loginWithGoogle(idToken);
        }
      } else {
        // Sign in normally
        await GoogleSignin.signIn();
        const userInfo = await GoogleSignin.getTokens();
        const idToken = userInfo.id_token;
        
        if (idToken) {
          await loginWithGoogle(idToken);
          console.log('✅ Google Sign-In successful!');
        }
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled the login flow');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Operation (eg. sign in) already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log('Play Services not available on this device');
      } else {
        console.error('Google Sign-In error:', error);
      }
    }
  };

  return (
    <View>
      <GoogleSignInButton
        onPress={handleGoogleSignIn}
        loading={loading}
        disabled={loading}
      />
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}
```

### 2. Logout from Google (Tùy Chọn)

```typescript
const handleGoogleSignOut = async () => {
  try {
    await GoogleSignin.signOut();
    await logout(); // Logout from app
    console.log('Signed out from Google');
  } catch (error) {
    console.error('Error signing out:', error);
  }
};
```

## 🧪 Kiểm Tra

### Local Testing (Expo Go)

```bash
# Terminal 1: Start Expo
npm start

# Terminal 2: Start backend
cd ../BE/Backend
npm run dev

# Scan QR code with Expo Go app
```

### Test Scenarios

1. **Fresh Login**
   - Mở app lần đầu
   - Nhấn "Đăng nhập với Google"
   - Đáp ứng cửa sổ Google Sign-In
   - Xác nhận đăng nhập thành công

2. **Cached Login**
   - Đã đăng nhập Google trước đó
   - Quay lại app
   - Nhấn Google Sign-In button
   - Nên đăng nhập nhanh hơn

3. **Error Handling**
   - Từ chối quyền truy cập
   - Internet bị ngắt
   - Backend không available
   - Verify error messages hiển thị đúng

## 🐛 Troubleshooting

### "Google Sign-In configuration error"

**Nguyên nhân**: Client IDs không hợp lệ hoặc chưa cấu hình

**Giải pháp**:
```bash
# 1. Kiểm tra app.json plugin config
# 2. Verify Client IDs từ Google Cloud Console
# 3. Rebuild app: expo prebuild --clean
# 4. Clear cache: rm -rf node_modules && npm install
```

### "Play Services not available on this device"

**Nguyên nhân**: Device/emulator không có Google Play Services

**Giải pháp**:
- Dùng emulator có Google Play (chọn "Google APIs" variant)
- Hoặc test trên thiết bị thực

### "Sign in cancelled by user"

**Nguyên nhân**: User đã cancel flow

**Giải pháp**:
- Đây là hành vi bình thường
- Kiểm tra error code: `statusCodes.SIGN_IN_CANCELLED`
- Show user-friendly message

### "Invalid OAuth request"

**Nguyên nhân**: Client ID không khớp với package/bundle ID

**Giải pháp**:
```bash
# Kiểm tra bundle ID:
# iOS: Trong app.json → ios.bundleIdentifier
# Android: Trong app.json → android.package

# Rebuild và clear caches
expo prebuild --clean
rm -rf ~/.gradle  # Clear Android gradle cache if needed
```

### "Error: idToken is undefined"

**Nguyên nhân**: Google sign-in thành công nhưng không lấy được idToken

**Giải pháp**:
```typescript
// Dùng getTokens() thay vì getTokenIds()
const userInfo = await GoogleSignin.getTokens();
const idToken = userInfo.id_token; // Note: underscore, not camelCase

// Verify idToken exists
if (!idToken) {
  console.error('idToken is missing');
  return;
}
```

## 📝 Environment Configuration

### Development
- URL: `http://192.168.1.1:3000` (hoặc IP của machine)
- Logging: Enabled
- Network Debugger: Enabled

### Staging
- URL: `https://staging-api.autowash.com`
- Logging: Enabled
- Network Debugger: Disabled

### Production
- URL: `https://api.autowash.com`
- Logging: Disabled
- Network Debugger: Disabled

Cấu hình ở `config/environment.ts`

## 🔐 Security Best Practices

1. **Không commit credentials**: Google Client IDs an toàn để public nhưng SECRET không được
2. **Token rotation**: Sử dụng refresh tokens
3. **HTTPS only**: Production phải dùng HTTPS
4. **Token expiration**: Access tokens hết hạn sau 1 giờ
5. **Secure storage**: Xem xét dùng expo-secure-store thay vì AsyncStorage

## 📚 Tài Liệu Tham Khảo

- [Google Sign-In for React Native](https://react-native-google-signin.github.io/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Expo Plugins](https://docs.expo.dev/plugins/overview/)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

## 💡 Tips

1. Lưu lại toàn bộ Client IDs ở nơi an toàn (password manager)
2. Test trên thiết bị thực trước khi deploy
3. Monitor error logs trong production
4. Implement graceful fallback nếu Google Sign-In fail
5. Keep @react-native-google-signin library updated

## 🆘 Cần Giúp Đỡ?

Nếu gặp vấn đề:

1. Kiểm tra error message chính xác
2. Xem logs: `expo logs`
3. Check Google Cloud Console settings
4. Verify plugin configuration trong app.json
5. Clear caches và rebuild: `expo prebuild --clean`
