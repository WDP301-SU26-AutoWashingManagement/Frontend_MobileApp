import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuthService';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated } = useAuth(); //  Lấy từ context, tự động update khi login/logout

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>

      {/* Home - Always visible */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
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

      {/* Profile - Visible only when authenticated */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Tài khoản',
          href: !isAuthenticated ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.crop.circle" color={color} />,
        }}
      />

      {/* Vehicles - Visible only when authenticated */}
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Phương tiện',
          href: !isAuthenticated ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="car.fill" color={color} />,
        }}
      />

      {/* Bookings - Visible only when authenticated */}
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Đặt lịch',
          href: !isAuthenticated ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />

      {/* History - Visible only when authenticated */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'Lịch sử',
          href: !isAuthenticated ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}