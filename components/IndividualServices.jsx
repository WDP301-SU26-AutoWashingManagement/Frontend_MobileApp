import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import serviceService from '../services/serviceService';
import serviceGroupService from '../services/serviceGroupService';

export default function IndividualServices() {
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
    }).format(price);
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
    <View style={styles.section} id="services">
      <View style={styles.header}>
        <Text style={styles.label}>Dịch Vụ Lẻ</Text>
        <Text style={styles.title}>Chăm Sóc Từng Chi Tiết</Text>
        <Text style={styles.subTitle}>
          Linh hoạt lựa chọn các dịch vụ phù hợp với nhu cầu của xế yêu.
        </Text>
      </View>

      <View style={{ marginBottom: 16, marginHorizontal: -16 }}>
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

      <View style={styles.grid}>
        {activeServices.length > 0 ? (
          activeServices.map((service) => {
            const id = service.id || service._id;
            
            return (
              <View key={id} style={styles.card}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons name="car-wash" size={24} color="#0EA5B7" />
                </View>
                <View style={styles.contentContainer}>
                  <Text style={styles.serviceName} numberOfLines={2}>
                    {service.service_name}
                  </Text>
                  {service.service_description ? (
                    <Text style={styles.description} numberOfLines={2}>
                      {service.service_description}
                    </Text>
                  ) : null}
                  <Text style={styles.price}>{formatPrice(service.service_price)}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <Text style={{ color: '#64748B', fontSize: 14 }}>Chưa có dịch vụ nào trong nhóm này.</Text>
          </View>
        )}
      </View>

      <View style={styles.noticeBox}>
        <MaterialCommunityIcons name="information" size={20} color="#0369A1" />
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
    backgroundColor: '#FFFFFF',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnActive: {
    backgroundColor: '#0EA5B7',
    borderColor: '#0EA5B7',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  grid: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    padding: 16,
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  description: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0EA5B7',
    marginTop: 2,
  },
  noticeBox: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 18,
  }
});
