import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuthService';

import Branches from '@/components/Branches';
import ComboPackages from '@/components/ComboPackages';
import Features from '@/components/Features';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/How';
import Promotions from '@/components/Promotions';
import IndividualServices from '@/components/IndividualServices';
import Tiers from '@/components/Tiers';

export default function HomeScreen() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'staff') {
      router.replace('/(tabs)/staff-bookings');
    }
  }, [isAuthenticated, user]);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((prev) => prev + 1);
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0EA5B7']}
            tintColor="#0EA5B7"
          />
        }
      >
        <Hero refreshKey={refreshKey} />
        <Features />
        <HowItWorks refreshKey={refreshKey} />
        <Promotions refreshKey={refreshKey} />
        <ComboPackages refreshKey={refreshKey} />
        <IndividualServices refreshKey={refreshKey} />
        <Tiers refreshKey={refreshKey} />
        <Branches refreshKey={refreshKey} />
        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfdfd',
  },
  content: {
    paddingBottom: 0,
  },
});
