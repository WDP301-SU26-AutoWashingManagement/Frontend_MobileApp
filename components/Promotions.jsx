import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import promotionService from '../services/promotionService';

export default function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    async function loadPromotions() {
      try {
        const data = await promotionService.list({ is_active: true, limit: 10 });
        setPromotions(data);
      } catch (error) {
        console.error('Lỗi khi tải khuyến mãi:', error);
        setErrorMsg(error.message || 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    }
    loadPromotions();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#0EA5B7" />
      </View>
    );
  }

  if (promotions.length === 0) {
    return (
      <View style={[styles.section, { paddingVertical: 20 }]}>
        <Text style={{ textAlign: 'center', color: 'red' }}>Chưa có data Khuyến mãi</Text>
        {errorMsg && <Text style={{ textAlign: 'center', color: 'red' }}>{errorMsg}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.section} id="promotions">
      <View style={styles.header}>
        <Text style={styles.label}>Ưu Đãi Đặc Biệt</Text>
        <Text style={styles.title}>Khuyến Mãi Đang Diễn Ra</Text>
        <Text style={styles.subTitle}>
          Sử dụng mã khuyến mãi khi đặt lịch để nhận ưu đãi hấp dẫn.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {promotions.map((promo) => {
          const id = promo.id || promo._id;

          return (
            <View key={id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.codeBadge}>
                  <MaterialCommunityIcons name="tag-outline" size={14} color="#0EA5B7" />
                  <Text style={styles.codeBadgeText}>{promo.promotion_code}</Text>
                </View>
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="star-four-points-outline" size={12} color="#A855F7" />
                  <Text style={styles.badgeText}>
                    {promo.discount_type === 'percentage' ? `Giảm ${promo.discount_value}%` : `Giảm ${(promo.discount_value / 1000)}k`}
                  </Text>
                </View>
              </View>

              <Text style={styles.promoName} numberOfLines={1}>{promo.promotion_name || 'Khuyến mãi'}</Text>
              {promo.description ? (
                <Text style={styles.promoDesc} numberOfLines={1}>{promo.description}</Text>
              ) : null}

              <View style={styles.infoRow}>
                <View style={styles.dateInfo}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={12} color="#94A3B8" />
                  <Text style={styles.dateText}>
                    {promo.end_at ? `HSD: ${new Date(promo.end_at).toLocaleDateString('vi-VN')}` : 'Không giới hạn'}
                  </Text>
                </View>
                <Text style={styles.minOrderText}>
                  Đơn từ {new Intl.NumberFormat('vi-VN').format(promo.min_order_amount || 0)}đ
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 28,
    backgroundColor: '#F8FAFC',
    gap: 16,
  },
  header: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 16,
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
    backgroundColor: '#F8FAFC',
  },
  list: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    padding: 16,
    width: 260,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  codeBadgeText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    color: '#9333EA',
    fontWeight: '700',
    fontSize: 11,
  },
  promoName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  promoDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  minOrderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
});
