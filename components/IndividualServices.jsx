import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import serviceService from '../services/serviceService';

export default function IndividualServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadServices() {
      try {
        const data = await serviceService.list({ is_active: true, limit: 12 });
        setServices(data);
      } catch (error) {
        console.error('Lỗi khi tải dịch vụ lẻ:', error);
      } finally {
        setLoading(false);
      }
    }
    loadServices();
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

  if (services.length === 0) return null;

  return (
    <View style={styles.section} id="services">
      <View style={styles.header}>
        <Text style={styles.label}>Dịch Vụ Lẻ</Text>
        <Text style={styles.title}>Chăm Sóc Từng Chi Tiết</Text>
        <Text style={styles.subTitle}>
          Linh hoạt lựa chọn các dịch vụ phù hợp với nhu cầu của xế yêu.
        </Text>
      </View>

      <View style={styles.grid}>
        {services.map((service) => {
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
        })}
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
    marginBottom: 12,
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
});
