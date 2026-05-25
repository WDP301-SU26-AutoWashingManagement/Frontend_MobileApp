# 🚀 AutoWash Mobile - Environment Setup Guide

Hướng dẫn thiết lập biến môi trường cho mobile app AutoWash

## 📋 Files

### `.env.example`
File mẫu chứa tất cả biến môi trường cần thiết. **Không nên commit file này với giá trị thực.**

### `.env` (Local - Không commit)
File cấu hình cục bộ của bạn. **Thêm vào `.gitignore`**

## 🔧 Setup

### 1. Tạo file `.env` từ `.env.example`

```bash
cp .env.example .env
```

### 2. Cấu Hình các biến

```env
# ✅ REQUIRED - Bạn phải cấu hình
EXPO_PUBLIC_API_BASE_URL=http://your-machine-ip:3000/api/v1

# ✅ RECOMMENDED - Cấu hình cho Google Sign-In
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com

# ⚙️ OPTIONAL - Tuning performance
EXPO_PUBLIC_API_TIMEOUT=15000
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_ENABLE_DEBUG_MODE=true
```

## 📝 Biến Môi Trường

### API Configuration

#### `EXPO_PUBLIC_API_BASE_URL` (Required)
- **Mô tả**: URL gốc của backend API
- **Ví dụ**: `http://192.168.1.1:3000/api/v1`
- **Phát triển cục bộ**: `http://your-machine-ip:3000/api/v1`
- **Android Emulator**: `http://10.0.2.2:3000/api/v1`
- **iOS Simulator**: `http://localhost:3000/api/v1`
- **Staging**: `https://staging-api.autowash.com/api/v1`
- **Production**: `https://api.autowash.com/api/v1`

**Cách lấy IP máy của bạn:**
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

Tìm IPv4 Address (thường là `192.168.x.x` hoặc `10.x.x.x`)

#### `EXPO_PUBLIC_API_TIMEOUT`
- **Mô tả**: Thời gian chờ API request (milliseconds)
- **Giá trị mặc định**: `15000` (15 seconds)
- **Sử dụng**: Điều chỉnh nếu network chậm

### Google OAuth

#### `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- **Mô tả**: Google Web Client ID
- **Lấy từ**: [Google Cloud Console](https://console.cloud.google.com/)
- **Ví dụ**: `105164387309-03fclhkcheijf96tssf4d0rc52ebcu1s.apps.googleusercontent.com`

#### `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- **Mô tả**: Google iOS Client ID
- **Bắt buộc**: Để Google Sign-In hoạt động trên iOS

#### `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- **Mô tả**: Google Android Client ID
- **Bắt buộc**: Để Google Sign-In hoạt động trên Android

Xem [GOOGLE_SIGNIN_SETUP.md](./GOOGLE_SIGNIN_SETUP.md) để biết chi tiết.

### App Configuration

#### `EXPO_PUBLIC_ENVIRONMENT`
- **Mô tả**: Môi trường hiện tại
- **Giá trị**: `development | staging | production`
- **Mặc định**: `development`

#### `EXPO_PUBLIC_APP_NAME`
- **Mô tả**: Tên ứng dụng
- **Mặc định**: `AutoWash`

#### `EXPO_PUBLIC_APP_VERSION`
- **Mô tả**: Phiên bản ứng dụng
- **Mặc định**: `1.0.0`

### Feature Flags

#### `EXPO_PUBLIC_ENABLE_GOOGLE_LOGIN`
- **Mô tả**: Kích hoạt Google Sign-In
- **Giá trị**: `true | false`
- **Mặc định**: `true`

#### `EXPO_PUBLIC_ENABLE_BIOMETRIC_LOGIN`
- **Mô tả**: Kích hoạt đăng nhập sinh trắc học (Face ID, Touch ID)
- **Giá trị**: `true | false`
- **Mặc định**: `false`

#### `EXPO_PUBLIC_ENABLE_DEBUG_MODE`
- **Mô tả**: Hiển thị debug logs trong console
- **Giá trị**: `true | false`
- **Mặc định**: `true` (development)

### Logging

#### `EXPO_PUBLIC_LOG_LEVEL`
- **Mô tả**: Mức độ chi tiết của logs
- **Giá trị**: `debug | info | warn | error`
- **Mặc định**: `info`

## 🔐 Security Best Practices

### 1. **Không commit `.env` file**

Thêm vào `.gitignore`:
```gitignore
.env
.env.local
.env.*.local
```

### 2. **Giữ secret keys an toàn**

- ❌ Không commit `.env` với API keys
- ❌ Không share `.env` file qua email/chat
- ✅ Dùng `.env.example` cho template
- ✅ Share `.env` qua secret manager (1Password, Vault, etc)

### 3. **Per-Environment Configuration**

```env
# .env.development
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_ENABLE_DEBUG_MODE=true

# .env.staging
EXPO_PUBLIC_API_BASE_URL=https://staging-api.autowash.com/api/v1
EXPO_PUBLIC_ENABLE_DEBUG_MODE=false

# .env.production
EXPO_PUBLIC_API_BASE_URL=https://api.autowash.com/api/v1
EXPO_PUBLIC_ENABLE_DEBUG_MODE=false
```

Switch bằng:
```bash
# For development
cp .env.development .env

# For staging
cp .env.staging .env

# For production
cp .env.production .env
```

### 4. **Sử dụng `EXPO_PUBLIC_` prefix**

Các biến EXPO_PUBLIC_ được expose vào client code (không an toàn cho secrets).

**Quy tắc:**
- ✅ API URLs (public information)
- ✅ Google Client IDs (công khai từ Google)
- ❌ API secrets
- ❌ Private keys
- ❌ Database passwords

## 🧪 Kiểm Tra Configuration

### Kiểm tra biến môi trường được load

```typescript
// File: config/app.config.ts
import { API_CONFIG } from './app.config';

console.log('API URL:', API_CONFIG.API_BASE_URL);
console.log('Environment:', API_CONFIG.ENVIRONMENT);
console.log('Features:', API_CONFIG.FEATURES);
```

### Kiểm tra kết nối API

```bash
# Test API connection
curl http://your-machine-ip:3000/api/v1/health
# Response: { "status": "ok" }
```

## 🚀 Development Setup

### Local Development (Expo Go)

```bash
# 1. Tạo .env file
cp .env.example .env

# 2. Cập nhật API URL
echo "EXPO_PUBLIC_API_BASE_URL=http://192.168.1.1:3000/api/v1" >> .env

# 3. Khởi động app
npm start

# 4. Quét QR code với Expo Go
```

### Android Emulator

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000/api/v1
```

### iOS Simulator

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

## 🐛 Troubleshooting

### ❌ "Cannot connect to API"

**Kiểm tra:**
1. Backend đang chạy: `npm run dev` ở folder `BE/Backend`
2. API URL đúng trong `.env`
3. Network: Ping IP machine
   ```bash
   ping 192.168.1.1
   ```

### ❌ "Environment variable not found"

**Giải pháp:**
1. Đảm bảo `.env` file tồn tại
2. Restart app: `expo restart` hoặc `npm start --reset-cache`
3. Xác minh biến có `EXPO_PUBLIC_` prefix

### ❌ "Google Sign-In not working"

**Kiểm tra:**
1. Google Client IDs trong `.env`
2. App.json plugin config
3. See [GOOGLE_SIGNIN_SETUP.md](./GOOGLE_SIGNIN_SETUP.md)

## 📚 Related Files

- [AUTH_SETUP.md](./AUTH_SETUP.md) - Authentication setup
- [GOOGLE_SIGNIN_SETUP.md](./GOOGLE_SIGNIN_SETUP.md) - Google Sign-In guide
- [QUICK_START.md](./QUICK_START.md) - Quick start guide
- [.env.example](./.env.example) - Environment variables template
- [config/app.config.ts](./config/app.config.ts) - Configuration loader

## 🔗 Environment Variables Mapping

```
.env variables → config/app.config.ts → App code
         ↓                  ↓                ↓
EXPO_PUBLIC_API_BASE_URL → API_CONFIG.API_BASE_URL → authService.ts
```

## ✅ Checklist

- [ ] `.env` file created from `.env.example`
- [ ] API_BASE_URL configured correctly
- [ ] Backend is running on correct port
- [ ] Can connect to API: `curl http://your-ip:3000/api/v1`
- [ ] App restarts with `npm start --reset-cache`
- [ ] Can login successfully
- [ ] Debug logs visible (if ENABLE_DEBUG_MODE=true)

## 💡 Tips

1. **Keep `.env.example` updated** - Khi add biến mới
2. **Use different `.env` for each environment** - Dev/Staging/Prod
3. **Never commit `.env`** - Chỉ commit `.env.example`
4. **Test API connection** - Trước khi debug app issues
5. **Clear cache when changing env** - `npm start --reset-cache`

---

**Happy coding!** 🚀
