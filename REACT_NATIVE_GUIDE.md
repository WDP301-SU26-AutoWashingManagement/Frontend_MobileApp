# AutoWash Mobile App - React Native Implementation Guide

## 📋 Tổng quan dự án

Ứng dụng mobile cho hệ thống loyalty và booking rửa xe **AutoWash**, cho phép khách hàng:
- Đăng ký/đăng nhập tài khoản
- Xem hạng thành viên và quyền lợi
- Đặt lịch rửa xe
- Tích lũy và quản lý điểm thưởng
- Xem lịch sử booking và tính điểm
- Đổi điểm lấy ưu đãi

## 🛠 Tech Stack Đề xuất

```
React Native 0.73+
Expo (hoặc Bare React Native)
TypeScript
Redux Toolkit / Zustand (state management)
React Navigation (routing)
Tailwind CSS / NativeWind (styling)
Axios / Fetch API (HTTP client)
SQLite (local storage)
Firebase (notifications, auth optional)
```

## 📁 Cấu trúc Folder

```
mobile-app/
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   │
│   ├── screens/
│   │   ├── Auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   │
│   │   ├── Home/
│   │   │   ├── HomeScreen.tsx
│   │   │   └── DashboardCard.tsx
│   │   │
│   │   ├── Tiers/
│   │   │   ├── TiersScreen.tsx
│   │   │   └── TierDetailScreen.tsx
│   │   │
│   │   ├── Booking/
│   │   │   ├── BookingListScreen.tsx
│   │   │   ├── BookingCreateScreen.tsx
│   │   │   ├── BookingDetailScreen.tsx
│   │   │   └── BookingHistoryScreen.tsx
│   │   │
│   │   ├── Points/
│   │   │   ├── PointsScreen.tsx
│   │   │   ├── RedemptionScreen.tsx
│   │   │   ├── PointsHistoryScreen.tsx
│   │   │   └── RedemptionDetailScreen.tsx
│   │   │
│   │   ├── Profile/
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── EditProfileScreen.tsx
│   │   │   ├── SettingsScreen.tsx
│   │   │   └── VehicleListScreen.tsx
│   │   │
│   │   └── Admin/
│   │       ├── DashboardScreen.tsx
│   │       ├── BookingApprovalScreen.tsx
│   │       └── ReportsScreen.tsx
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── Toast.tsx
│   │   │
│   │   ├── tiers/
│   │   │   ├── TierCard.tsx
│   │   │   ├── TierBadge.tsx
│   │   │   └── BenefitsList.tsx
│   │   │
│   │   ├── booking/
│   │   │   ├── BookingCard.tsx
│   │   │   ├── BookingForm.tsx
│   │   │   ├── DateTimePicker.tsx
│   │   │   └── SlotSelector.tsx
│   │   │
│   │   └── points/
│   │       ├── PointsBalance.tsx
│   │       ├── PointsHistory.tsx
│   │       ├── RedemptionItem.tsx
│   │       └── PointsChart.tsx
│   │
│   ├── store/
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── userSlice.ts
│   │   │   ├── bookingSlice.ts
│   │   │   ├── pointsSlice.ts
│   │   │   └── tiersSlice.ts
│   │   │
│   │   └── store.ts
│   │
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   ├── booking.service.ts
│   │   ├── points.service.ts
│   │   ├── tiers.service.ts
│   │   ├── user.service.ts
│   │   └── storage.service.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useBooking.ts
│   │   ├── usePoints.ts
│   │   └── usePagination.ts
│   │
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   └── colors.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   └── App.tsx
│
├── app.json
├── package.json
└── tsconfig.json
```

## 🎯 Các Tính Năng Chính

### 1. **Hệ Thống Xác Thực (Authentication)**
```
- Đăng ký: số điện thoại, mật khẩu, biển số xe
- Đăng nhập: số điện thoại + mật khẩu
- Quên mật khẩu: OTP qua SMS
- Session management
- Token refresh (JWT)
- Logout & clear cache
```

### 2. **Quản Lý Hạng Thành Viên (Tiers)**
```
✅ Member (Hạng cơ bản)
  - 7 ngày đặt trước
  - 0% giảm giá
  - Tích điểm mỗi lần rửa
  - Xem lịch sử booking
  - Đổi điểm lấy ưu đãi

✅ Silver (Khách hàng thân thiết)
  - 10 ngày đặt trước
  - 5% giảm giá
  - Tất cả quyền Member
  - Nhận promo ưu tiên
  - Hàng đợi ưu tiên

✅ Gold (Khách VIP)
  - 12 ngày đặt trước
  - 10% giảm giá
  - Tích điểm x1.5
  - Add-on miễn phí
  - Featured badge

✅ Platinum (Hạng cao nhất)
  - 14 ngày đặt trước
  - 15% giảm giá
  - Tích điểm x2
  - Rửa xe miễn phí hàng tháng
```

### 3. **Đặt Lịch Booking (Booking)**
```
- Chọn ngày/giờ trong khung thời gian hạng
- Chọn địa điểm rửa
- Chọn loại xe (xe máy, ô tô, bán tải...)
- Chọn gói dịch vụ
- Add-on options (dầu, bảo vệ, tẩy rửa...)
- Xác nhận slot tức thì
- Xem thời gian chờ trong ngày
- Hủy/reschedule booking
- Lịch sử booking đầy đủ
```

### 4. **Quản Lý Điểm Thưởng (Points)**
```
- Xem số điểm hiện tại
- Xem điểm sắp hết hạn (12 tháng)
- Lịch sử tích điểm chi tiết
- Danh sách các cách đổi điểm
- Redeem points → voucher / giảm giá
- Điểm x1, x1.5, x2 tùy hạng
- Notification khi điểm gần hết hạn
```

### 5. **Hồ Sơ Người Dùng (User Profile)**
```
- Avatar & thông tin cá nhân
- Danh sách biển số xe
- Chọn xe mặc định
- Địa chỉ giao hàng/chủ yếu
- Lịch sử giao dịch
- Thay đổi mật khẩu
- Xóa tài khoản
```

### 6. **Dashboard Admin (Admin Only)**
```
- Xem danh sách booking trong ngày
- Phê duyệt/hủy booking
- Xác nhận hoàn thành dịch vụ
- Thêm điểm thưởng thủ công
- Báo cáo doanh thu hôm nay / tháng / năm
- KPI dashboard
- Quản lý khuyến mãi
```

## 🔄 API Endpoints (Dự kiến)

```
AUTH
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/verify-otp

USER
GET    /api/users/me
PUT    /api/users/me
POST   /api/users/vehicles
GET    /api/users/vehicles
DELETE /api/users/vehicles/:id

TIERS
GET    /api/tiers
GET    /api/tiers/:id
GET    /api/users/:id/current-tier

BOOKING
GET    /api/bookings
POST   /api/bookings
GET    /api/bookings/:id
PUT    /api/bookings/:id
DELETE /api/bookings/:id
GET    /api/booking-slots?date=YYYY-MM-DD&location_id=X
GET    /api/booking-history
POST   /api/bookings/:id/confirm-complete (Admin)

POINTS
GET    /api/points/balance
GET    /api/points/history
POST   /api/points/redeem
GET    /api/points/expiry-warning
GET    /api/redemptions

ADMIN
GET    /api/admin/dashboard/summary
GET    /api/admin/bookings/today
PUT    /api/admin/bookings/:id/approve
PUT    /api/admin/bookings/:id/complete
GET    /api/admin/reports/daily
GET    /api/admin/reports/monthly
POST   /api/admin/points/add/:user_id
```

## 📱 Navigation Flow

```
App
├── RootNavigator
│   ├── AuthNavigator (Not Logged In)
│   │   ├── LoginScreen
│   │   ├── RegisterScreen
│   │   └── ForgotPasswordScreen
│   │
│   └── MainNavigator (Logged In)
│       ├── HomeStack
│       │   ├── HomeScreen
│       │   └── DashboardDetails
│       │
│       ├── BookingStack
│       │   ├── BookingListScreen
│       │   ├── BookingCreateScreen
│       │   ├── BookingDetailScreen
│       │   └── BookingHistoryScreen
│       │
│       ├── PointsStack
│       │   ├── PointsScreen
│       │   ├── RedemptionScreen
│       │   └── RedemptionHistoryScreen
│       │
│       ├── TiersStack
│       │   ├── TiersScreen
│       │   └── TierDetailScreen
│       │
│       └── ProfileStack
│           ├── ProfileScreen
│           ├── EditProfileScreen
│           ├── VehicleListScreen
│           └── SettingsScreen
│
└── AdminNavigator (Admin User)
    ├── AdminDashboardStack
    ├── BookingApprovalStack
    └── ReportsStack
```

## 🎨 Styling & Colors

```typescript
// Từ web app
const colors = {
  cyan: '#0EA5B7',
  cyanLight: '#E6F8FB',
  blue: '#2563EB',
  blueLight: '#EAF2FF',
  purple: '#7C3AED',
  purpleLight: '#F2EAFF',
  green: '#059669',
  greenLight: '#EAF9F4',
  slate: {
    900: '#0F172A',
    800: '#1E293B',
    700: '#334155',
    600: '#475569',
    500: '#64748B',
  },
  white: '#FFFFFF',
  black: '#000000',
}

// Typography
const fonts = {
  DMSans: 'DM Sans',
  BebasNeue: 'Bebas Neue',
  SpaceMono: 'Space Mono',
}
```

## 🚀 Setup & Installation

```bash
# 1. Khởi tạo dự án
npx create-expo-app AutoWashMobile
cd AutoWashMobile

# 2. Cài đặt dependencies
npm install

# Redux & State
npm install @reduxjs/toolkit react-redux

# Navigation
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npm install react-native-screens react-native-safe-area-context

# UI & Styling
npm install nativewind tailwindcss

# HTTP Client
npm install axios

# Storage
npm install @react-native-async-storage/async-storage

# Icons
npm install react-native-vector-icons @expo/vector-icons

# Date picker
npm install react-native-date-picker

# Form validation
npm install react-hook-form yup

# 3. Chạy ứng dụng
npx expo start
```

## 💾 State Management (Redux Toolkit)

```typescript
// store/slices/authSlice.ts
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
    },
  },
})

// store/slices/bookingSlice.ts
const bookingSlice = createSlice({
  name: 'booking',
  initialState: {
    bookings: [],
    selectedBooking: null,
    slots: [],
    isLoading: false,
  },
  reducers: {
    // bookings CRUD
  },
})

// store/slices/pointsSlice.ts
const pointsSlice = createSlice({
  name: 'points',
  initialState: {
    balance: 0,
    history: [],
    redemptions: [],
    expiryWarning: null,
  },
  reducers: {
    // points actions
  },
})
```

## 🔐 Async Thunk Examples

```typescript
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ phone, password }, { rejectWithValue }) => {
    try {
      const response = await authService.login(phone, password);
      await AsyncStorage.setItem('token', response.token);
      return response.user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)

export const fetchUserBookings = createAsyncThunk(
  'booking/fetchUserBookings',
  async (_, { rejectWithValue }) => {
    try {
      return await bookingService.getUserBookings();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)
```

## 🎯 Screen Examples Structure

```typescript
// screens/Home/HomeScreen.tsx
import React, { useEffect } from 'react'
import { View, ScrollView } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import DashboardCard from '../../components/DashboardCard'
import { fetchUserData } from '../../store/slices/userSlice'

export default function HomeScreen() {
  const dispatch = useDispatch()
  const { user, tier } = useSelector((state) => state.user)

  useEffect(() => {
    dispatch(fetchUserData())
  }, [dispatch])

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <Text className="text-3xl font-bold">Xin chào, {user?.name}</Text>
        <DashboardCard tier={tier} points={user?.points} />
        {/* More components */}
      </View>
    </ScrollView>
  )
}

// screens/Booking/BookingListScreen.tsx
export default function BookingListScreen() {
  const { bookings, isLoading } = useSelector((state) => state.booking)

  return (
    <FlatList
      data={bookings}
      renderItem={({ item }) => <BookingCard booking={item} />}
      ListEmptyComponent={<EmptyState message="Chưa có booking nào" />}
    />
  )
}
```

## 📤 Local Storage

```typescript
// services/storage.service.ts
export const StorageService = {
  setToken: async (token: string) => {
    await AsyncStorage.setItem('auth_token', token)
  },
  getToken: async () => {
    return await AsyncStorage.getItem('auth_token')
  },
  setUser: async (user: any) => {
    await AsyncStorage.setItem('user', JSON.stringify(user))
  },
  getUser: async () => {
    const data = await AsyncStorage.getItem('user')
    return data ? JSON.parse(data) : null
  },
  clearAll: async () => {
    await AsyncStorage.clear()
  },
}
```

## 🔔 Push Notifications (Optional)

```typescript
// Nên dùng Firebase Cloud Messaging
// - Thông báo booking sắp đến
// - Điểm mới được tích lũy
// - Khuyến mãi & ưu đãi
// - Hệ thống nâng hạng
```

## 📊 Metrics Tạm Tính

| Yếu tố | Con số |
|--------|--------|
| Screens | ~20 |
| Components | ~30 |
| API Endpoints | ~25 |
| Store Slices | ~5 |
| Estimated LOC | 15,000+ |
| Dev Time | 8-12 tuần |

## ⚡ Performance Tips

```
- Lazy load screens
- Memoize components (React.memo)
- Optimize FlatList renderItem
- Cache API responses
- Debounce input fields
- Use Image cache
- Minimize re-renders
```

## 🧪 Testing Strategy

```
- Unit tests: Utils, validators, formatters
- Component tests: Buttons, Cards, Forms
- Integration tests: Navigation, API calls
- E2E tests: Login → Booking → Redeem flow
- Tools: Jest, React Native Testing Library
```

## 📝 Checklist Phát Triển

- [ ] Setup project & dependencies
- [ ] Cấu hình Redux store
- [ ] Build navigation structure
- [ ] Implement auth (login/register)
- [ ] Build home screen
- [ ] Build booking feature
- [ ] Build points feature
- [ ] Build tiers display
- [ ] Build profile section
- [ ] Implement API integration
- [ ] Add error handling
- [ ] Add loading states
- [ ] Add form validation
- [ ] Add offline support
- [ ] Test on iOS & Android
- [ ] Optimize performance
- [ ] Security review
- [ ] App store deployment prep

---

**Tạo bởi:** AutoWash Mobile Team  
**Cập nhật:** 2026  
**Version:** 1.0.0
