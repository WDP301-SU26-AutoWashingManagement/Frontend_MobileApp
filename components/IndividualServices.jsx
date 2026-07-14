import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import serviceService from '../services/serviceService';
import serviceGroupService from '../services/serviceGroupService';

const { width } = Dimensions.get('window');

export default function IndividualServices() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [serviceGroups, setServiceGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [servicesRes, groupsRes] = await Promise.all([
          serviceService.list({ is_active: true, limit: 100 }),
          serviceGroupService.list({ is_active: true, limit: 50 })
        ]);
        setServices(servicesRes);
        setServiceGroups(groupsRes);
      } catch (error) {
        console.error('Lỗi khi tải dịch vụ lẻ:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(price).replace('₫', 'đ');
  };

  const getServiceIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('sơn') || n.includes('bóng')) return 'brush';
    if (n.includes('rửa') || n.includes('xịt') || n.includes('bọt') || n.includes('tuyết')) return 'car-wash';
    if (n.includes('lốp') || n.includes('mâm') || n.includes('bánh') || n.includes('vỏ')) return 'car-tire-alert';
    if (n.includes('kính') || n.includes('gạt')) return 'windshield-outline';
    if (n.includes('nội thất') || n.includes('dọn')) return 'car-seat';
    if (n.includes('khoang máy') || n.includes('động cơ')) return 'engine';
    return 'car-clean';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#0EA5B7" />
      </View>
    );
  }

  if (services.length === 0 || serviceGroups.length === 0) return null;

  const activeServices = activeGroupId === 'all'
    ? services
    : services.filter((s) => {
        const groupId = typeof s.service_group_id === 'object'
          ? (s.service_group_id?._id || s.service_group_id?.id)
          : s.service_group_id;
        return groupId === activeGroupId;
      });

  return (
    <View style={styles.section}>
      {/* Header section similar to Web */}
      <View style={styles.header}>
        <Text style={styles.label}>Dịch Vụ Lẻ</Text>
        <Text style={styles.title}>Dịch vụ riêng biệt</Text>
        <Text style={styles.titleBold}>Chăm sóc chi tiết xế yêu</Text>
        <Text style={styles.subTitle}>
          Lựa chọn các dịch vụ lẻ phù hợp với nhu cầu phát sinh cụ thể cho chiếc xe của bạn.
        </Text>
      </View>

      {/* Tabs category list */}
      <View style={{ marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          <Pressable
            style={[styles.tabBtn, activeGroupId === 'all' && styles.tabBtnActive]}
            onPress={() => setActiveGroupId('all')}
          >
            <Text style={[styles.tabText, activeGroupId === 'all' && styles.tabTextActive]}>Tất cả</Text>
          </Pressable>
          {serviceGroups.map((group) => {
            const id = group._id || group.id;
            const isActive = activeGroupId === id;
            return (
              <Pressable
                key={id}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveGroupId(id)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{group.group_name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Horizontal Carousel List */}
      <View style={{ marginHorizontal: -16 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
          snapToInterval={296} // Card width 280 + margins 16
          decelerationRate="fast"
        >
          {activeServices.length > 0 ? (
            activeServices.map((service) => {
              const id = service.id || service._id;
              const duration = service.duration || 30; // Fallback to 30 mins
              
              return (
                <View key={id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.iconContainer}>
                      <MaterialCommunityIcons name={getServiceIcon(service.service_name)} size={24} color="#0EA5B7" />
                    </View>

                    <Text style={styles.serviceName} numberOfLines={2}>
                      {service.service_name}
                    </Text>

                    <View style={styles.durationRow}>
                      <Ionicons name="time-outline" size={14} color="#64748B" />
                      <Text style={styles.durationText}>{duration} phút</Text>
                    </View>

                    {service.service_description ? (
                      <Text style={styles.description} numberOfLines={3}>
                        {service.service_description}
                      </Text>
                    ) : (
                      <Text style={[styles.description, { color: '#CBD5E1', fontStyle: 'italic' }]}>
                        Chưa có mô tả chi tiết cho dịch vụ này.
                      </Text>
                    )}
                  </View>

                  <View>
                    <View style={styles.cardDivider} />
                    <View style={styles.cardFooter}>
                      <View>
                        <Text style={styles.priceLabel}>Đơn giá từ</Text>
                        <Text style={styles.priceValue}>{formatPrice(service.service_price)}</Text>
                      </View>

                      <Pressable 
                        style={({ pressed }) => [styles.bookBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => router.push('/(tabs)/bookings')}
                      >
                        <Text style={styles.bookBtnText}>Đặt lịch</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="folder-open-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyText}>Chưa có dịch vụ nào trong nhóm này.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Bottom Notice Banner */}
      <View style={styles.noticeBox}>
        <Ionicons name="information-circle-outline" size={20} color="#0EA5B7" />
        <Text style={styles.noticeText}>
          Khách hàng có thể kết hợp nhiều dịch vụ lẻ trong cùng một lần đặt lịch để tiết kiệm thời gian chờ đợi.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    backgroundColor: '#F8FAFC',
    gap: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#0EA5B7',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '400',
    textAlign: 'center',
  },
  titleBold: {
    color: '#0F172A',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: -2,
    marginBottom: 8,
  },
  subTitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: 4,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
    height: 50,
  },
  tabBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  tabBtnActive: {
    backgroundColor: '#0EA5B7',
    borderColor: '#0EA5B7',
    shadowColor: '#0EA5B7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  carouselContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    width: 280,
    minHeight: 290,
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTop: {
    gap: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(14,165,183,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  durationText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0EA5B7',
    marginTop: 1,
  },
  bookBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#0EA5B7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bookBtnText: {
    color: '#0EA5B7',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    width: width - 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14,165,183,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,183,0.12)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#0891B2',
    lineHeight: 18,
    fontWeight: '500',
  },
});
