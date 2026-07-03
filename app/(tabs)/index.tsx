import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
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

  useEffect(() => {
    if (isAuthenticated && user?.role === 'staff') {
      router.replace('/(tabs)/staff-bookings');
    }
  }, [isAuthenticated, user]);
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Hero />
        <Features />
        <HowItWorks />
        <Promotions />
        <ComboPackages />
        <IndividualServices />
        <Tiers />
        <Branches />
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
