# 🚀 AutoWash Mobile Auth - Quick Start Guide

Hướng dẫn nhanh để thiết lập và sử dụng authentication

## ⚡ 5 Bước Setup (2 phút)

### 1️⃣ Cài Đặt Dependencies (30 giây)

```bash
cd Mobile/AutoWash
bash install-auth-deps.sh
```

Hoặc manual:
```bash
npm install axios
npx expo install @react-native-async-storage/async-storage
```

### 2️⃣ Cấu Hình API URL (30 giây)

Mở `config/app.config.ts`:

```typescript
API_BASE_URL: 'http://192.168.1.1:3000/api/v1'  // ← Đổi sang IP của bạn
```

**Cách lấy IP:**
- **Windows**: Mở cmd, gõ `ipconfig`
- **Mac/Linux**: Mở terminal, gõ `ifconfig`
- Tìm IPv4 Address (thường là 192.168.x.x)

### 3️⃣ Khởi Động Backend (30 giây)

```bash
cd BE/Backend
npm run dev
```

Xác nhận:
```
✓ Server running on http://localhost:3000
✓ API available at http://localhost:3000/api/v1
```

### 4️⃣ Khởi Động Mobile App (30 giây)

```bash
cd Mobile/AutoWash
npm start
```

Quét QR code bằng **Expo Go** app trên điện thoại của bạn

### 5️⃣ Test Đăng Nhập (30 giây)

1. Mở app trên điện thoại
2. Nhấn "Đăng nhập"
3. Nhập email & password
4. Nhấn "Đăng nhập"

✅ Done! Bạn đã setup xong!

---

## 📖 Tài Liệu Chi Tiết

| Tài Liệu | Mô Tả |
|----------|------|
| [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md) | 📋 Overview toàn bộ implementation |
| [AUTH_SETUP.md](./AUTH_SETUP.md) | 📖 Setup & usage guide chi tiết |
| [GOOGLE_SIGNIN_SETUP.md](./GOOGLE_SIGNIN_SETUP.md) | 🔐 Google Sign-In integration |

---

## 💻 Code Examples

### Đăng Nhập
```typescript
import { useAuth } from '../hooks/useAuthService';

export function LoginScreen() {
  const { login, loading, error } = useAuth();

  const handleLogin = async () => {
    await login('user@example.com', 'password');
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
const { register } = useAuth();

await register('user@example.com', 'password', 'John Doe');
```

### Kiểm Tra Auth
```typescript
const { isAuthenticated, user } = useAuth();

if (isAuthenticated) {
  console.log('User:', user.email);
}
```

---

## 🐛 Troubleshooting

### ❌ "Cannot connect to API"
**Giải pháp:**
1. Kiểm tra backend đang chạy: `npm run dev` ở folder `BE/Backend`
2. Verify API URL: `config/app.config.ts` phải đúng IP
3. Test: Mở browser, vào `http://your-ip:3000/api/v1`

### ❌ "Invalid credentials"
**Giải pháp:**
1. Tạo account mới bằng Register
2. Hoặc test với email khác
3. Kiểm tra backend logs

### ❌ "Token not saving"
**Giải pháp:**
1. Verify AsyncStorage installed: `npx expo install @react-native-async-storage/async-storage`
2. Restart app
3. Check device permissions

---

## 🔑 Test Credentials

Tạo account trên app bằng cách:
1. Chọn "Đăng ký"
2. Nhập email, password, name
3. Nhấn "Đăng ký"
4. Sau đó dùng account đó để login

---

## 📱 Device Specifics

### Expo Go (Điện thoại thực)
```
API URL: http://192.168.1.1:3000/api/v1
(Thay 192.168.1.1 bằng IP của bạn)
```

### Android Emulator
```
API URL: http://10.0.2.2:3000/api/v1
```

### iOS Simulator
```
API URL: http://localhost:3000/api/v1
```

---

## ✅ Checklist

- [ ] Dependencies installed
- [ ] API URL configured
- [ ] Backend running (`npm run dev`)
- [ ] Mobile app running (`npm start`)
- [ ] Can login/register
- [ ] Token saving works

---

## 🎯 Next: Google Sign-In (Optional)

Nếu muốn integrate Google Sign-In:
1. Đọc [GOOGLE_SIGNIN_SETUP.md](./GOOGLE_SIGNIN_SETUP.md)
2. Lấy Google Client IDs
3. Cấu hình app.json
4. Test integration

---

## 📞 Cần Giúp?

1. Kiểm tra logs: `expo logs` hoặc browser console
2. Đọc [AUTH_SETUP.md](./AUTH_SETUP.md) chi tiết
3. Verify network: `ping your-machine-ip`
4. Restart: `npm start` rồi clear cache

---

## 🎉 Chúc Mừng!

Bạn đã thiết lập authentication cho AutoWash Mobile! 🚀

Bước tiếp theo:
- Implement navigation (home screen sau login)
- Add more auth features (reset password, etc.)
- Setup Google Sign-In
- Deploy to production

---

**Happy coding! 💻**
