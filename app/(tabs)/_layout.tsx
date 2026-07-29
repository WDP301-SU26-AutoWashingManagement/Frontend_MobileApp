import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuthService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, user } = useAuth(); //  Lấy từ context, tự động update khi login/logout

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>

      {/* Home - Always visible except for staff */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          href: (isAuthenticated && user?.role === 'staff') ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />

      {/* Vehicles - Visible only when authenticated and is customer */}
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Phương tiện',
          href: (!isAuthenticated || user?.role !== 'customer') ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="car.fill" color={color} />,
        }}
      />

      {/* Bookings - Visible only when authenticated and is customer */}
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Đặt lịch',
          href: (!isAuthenticated || user?.role !== 'customer') ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />

      {/* History - Visible only when authenticated and is customer */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'Lịch sử',
          href: (!isAuthenticated || user?.role !== 'customer') ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.fill" color={color} />,
        }}
      />

      {/* Staff Bookings - Visible only when authenticated and is staff */}
      <Tabs.Screen
        name="staff-bookings"
        options={{
          title: 'Lịch hẹn',
          href: (!isAuthenticated || user?.role !== 'staff') ? null : undefined,
          tabBarIcon: ({ color }) => <MaterialCommunityIcons size={26} name="calendar-check" color={color} />,
        }}
      />

      {/* Staff Check-in - Visible only when authenticated and is staff */}
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'Check-in',
          href: (!isAuthenticated || user?.role !== 'staff') ? null : undefined,
          tabBarIcon: ({ color }) => <MaterialCommunityIcons size={26} name="qrcode-scan" color={color} />,
        }}
      />

      {/* Transactions - Visible only when authenticated and is staff manager */}
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Giao dịch',
          href: (!isAuthenticated || user?.role !== 'staff' || user?.role_data?.staff_type === 'technical') ? null : undefined,
          tabBarIcon: ({ color }) => <MaterialCommunityIcons size={24} name="receipt" color={color} />,
        }}
      />

      {/* Staff Attendance - Visible only when authenticated and is staff technical */}
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Điểm danh',
          href: (!isAuthenticated || user?.role !== 'staff' || user?.role_data?.staff_type !== 'technical') ? null : undefined,
          tabBarIcon: ({ color }) => <MaterialCommunityIcons size={24} name="fingerprint" color={color} />,
        }}
      />

      {/* Profile - Visible only when authenticated */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Tài khoản',
          href: !isAuthenticated ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.crop.circle" color={color} />,
        }}
      />

      {/* Auth - Visible only when NOT authenticated */}
      <Tabs.Screen
        name="auth"
        options={{
          title: 'Đăng nhập',
          href: isAuthenticated ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.crop.circle" color={color} />,
        }}
      />
    </Tabs>
  );
}