import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import servicePackageService from '../services/servicePackageService';
import { useAuth } from '../hooks/useAuthService';

export default function ComboPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    async function loadPackages() {
      try {
        const rawPackages = await servicePackageService.list({ is_active: true, limit: 12 });
        
        const packagesWithDetails = await Promise.all(
          rawPackages.map(async (pkg) => {
            const services = await servicePackageService.listDetailedServicesByPackage(pkg._id || pkg.id || '');
            const basePrice = services.reduce((sum, s) => sum + (Number(s.service_price) || 0), 0);
            const discount = Number(pkg.package_discount_percentage) || 0;
            const finalPrice = basePrice * (1 - discount / 100);
            return {
              ...pkg,
              services,
              basePrice,
              finalPrice,
            };
          })
        );
        setPackages(packagesWithDetails);
      } catch (error) {
        console.error('Lỗi khi tải gói dịch vụ trong component:', error);
      } finally {
        setLoading(false);
      }
    }
    loadPackages();
  }, []);

  const handleRegisterPress = () => {
    if (isAuthenticated) {
      router.push('/(tabs)/bookings');
    } else {
      router.push('/(tabs)/auth');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5B7" />
        <Text style={styles.loadingText}>Đang tải các gói dịch vụ...</Text>
      </View>
    );
  }

  if (packages.length === 0) return null;

  return (
    <View style={styles.section} id="combos">
      <View style={styles.header}>
        <Text style={styles.label}>Gói Dịch Vụ - Combo</Text>
        <Text style={styles.title}>Giải pháp toàn diện</Text>
        <Text style={styles.titleAccent}>Cho phương tiện của bạn</Text>
        <Text style={styles.subTitle}>
          Tiết kiệm thời gian và chi phí với các gói dịch vụ được thiết kế tối ưu.
        </Text>
      </View>

      <View style={styles.list}>
        {packages.map((pkg) => {
          const id = pkg.id || pkg._id;
          const hasDiscount = pkg.package_discount_percentage > 0;

          return (
            <View key={id} style={styles.card}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  <Text style={styles.packageName} numberOfLines={2}>
                    {pkg.package_name}
                  </Text>
                  {hasDiscount && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>
                        Tiết kiệm {pkg.package_discount_percentage}%
                      </Text>
                    </View>
                  )}
                </View>
                {pkg.description ? (
                  <Text style={styles.description} numberOfLines={2}>
                    {pkg.description}
                  </Text>
                ) : null}
              </View>

              {/* Price Section */}
              <View style={styles.priceContainer}>
                <Text style={styles.finalPrice}>{formatPrice(pkg.finalPrice)}</Text>
                {hasDiscount && pkg.basePrice > 0 && (
                  <Text style={styles.basePrice}>{formatPrice(pkg.basePrice)}</Text>
                )}
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Services List */}
              <View style={styles.servicesContainer}>
                <View style={styles.servicesHeader}>
                  <MaterialCommunityIcons name="check-circle" size={18} color="#0EA5B7" />
                  <Text style={styles.servicesTitle}>Bao gồm các dịch vụ:</Text>
                </View>
                
                <View style={styles.servicesList}>
                  {pkg.services && pkg.services.length > 0 ? (
                    pkg.services.map((s, idx) => (
                      <View key={s._id || idx} style={styles.serviceItem}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.serviceName}>{s.service_name}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noServices}>Chưa có dịch vụ nào</Text>
                  )}
                </View>
              </View>

              {/* Button */}
              <TouchableOpacity
                style={styles.button}
                onPress={handleRegisterPress}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Bottom Notice */}
      <View style={styles.noticeContainer}>
        <MaterialCommunityIcons name="information" size={20} color="#0EA5B7" style={styles.noticeIcon} />
        <Text style={styles.noticeText}>
          Giá dịch vụ có thể thay đổi tùy thuộc vào loại xe (Sedan, SUV, Bán tải,...) và tình trạng thực tế.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 28,
    backgroundColor: '#FFFFFF',
    gap: 16,
  },
  header: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: '#0EA5B7',
    textTransform: 'uppercase',
  },
  title: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  titleAccent: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: -2,
  },
  subTitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 4,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
  },
  list: {
    gap: 20,
    marginTop: 12,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardHeader: {
    gap: 6,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    lineHeight: 24,
  },
  discountBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '700',
  },
  description: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  finalPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0EA5B7',
  },
  basePrice: {
    fontSize: 13,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  servicesContainer: {
    gap: 10,
    marginBottom: 20,
  },
  servicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  servicesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  servicesList: {
    gap: 6,
    paddingLeft: 4,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: -2,
  },
  serviceName: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  noServices: {
    color: '#94A3B8',
    fontStyle: 'italic',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#0EA5B7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#CFFAFE',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    marginTop: 8,
  },
  noticeIcon: {
    marginTop: 1,
  },
  noticeText: {
    color: '#0891B2',
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
});
