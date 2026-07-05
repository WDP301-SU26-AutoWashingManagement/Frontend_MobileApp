import React, { useState, useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import tierService, { Tier } from '../services/tierService';

const visualMap: Record<string, any> = {
  member: {
    icon: 'medal-outline',
    color: '#B07A3D',
    colorDark: '#6A431C',
    colorLight: '#F7E6CF',
    subtitle: 'Hạng cơ bản',
  },
  silver: {
    icon: 'star-outline',
    color: '#6d7681',
    colorDark: '#2a3542',
    colorLight: '#ECEFF3',
    subtitle: 'Khách hàng thân thiết',
  },
  gold: {
    icon: 'crown-outline',
    color: '#B8892E',
    colorDark: '#6B4710',
    colorLight: '#F6E4B7',
    subtitle: 'Khách VIP',
    featured: true,
  },
  platinum: {
    icon: 'diamond-stone',
    color: '#2B8FA3',
    colorDark: '#135B6B',
    colorLight: '#DDF2F7',
    subtitle: 'Hạng cao nhất',
  },
};

export default function Tiers() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const data = await tierService.list();
        const sorted = data.sort((a, b) => (a.min_membership_points || 0) - (b.min_membership_points || 0));
        setTiers(sorted);
      } catch (error) {
        console.error('Error loading tiers in Tiers component', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTiers();
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Hạng thành viên</Text>
      <Text style={styles.title}>Càng rửa nhiều, ưu đãi càng lớn</Text>
      <Text style={styles.subTitle}>Hệ thống tự động nâng hạ hạng hàng tháng dựa trên lịch sử đặt lịch.</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#0891B2" style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.cards}>
          {tiers.map((tier) => {
            const tName = tier.tier_name?.toLowerCase() || 'member';
            const v = visualMap[tName] || visualMap['member'];

            return (
              <View
                key={tier._id || tier.id || tier.tier_name}
                style={[
                  styles.card,
                  { borderColor: v.colorLight, backgroundColor: '#FFFFFF' },
                  v.featured && styles.featuredCard,
                ]}
              >
                {v.featured ? <Text style={styles.featuredBadge}>Phổ biến nhất</Text> : null}

                <View style={styles.cardHeader}>
                  <View style={[styles.icon, { backgroundColor: v.colorLight }]}> 
                    <MaterialCommunityIcons name={v.icon} size={20} color={v.colorDark} />
                  </View>
                  <View style={styles.headerText}>
                    <Text style={[styles.cardTitle, { color: v.colorDark }]}>{tier.tier_name}</Text>
                    <Text style={styles.cardSub}>{v.subtitle}</Text>
                    <View style={[styles.pointsBadge, { backgroundColor: v.colorLight }]}>
                      <Text style={[styles.pointsText, { color: v.colorDark }]}>
                        ⭐ {(tier.min_membership_points || 0).toLocaleString('vi-VN')} điểm
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { backgroundColor: v.colorLight }]}> 
                    <Text style={[styles.statValue, { color: v.colorDark }]}>{tier.booking_window_days} ngày</Text>
                    <Text style={styles.statLabel}>Đặt trước</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: v.colorLight }]}> 
                    <Text style={[styles.statValue, { color: v.colorDark }]}>{tier.discount_percentage}%</Text>
                    <Text style={styles.statLabel}>Giảm giá</Text>
                  </View>
                </View>

                <View style={styles.perkList}>
                  {(tier.free_features || []).map((perk, index) => (
                    <View key={index} style={styles.perkItem}>
                      <MaterialCommunityIcons name="check-circle" size={15} color={v.color} />
                      <Text style={styles.perkText}>{perk}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.notice}>
        <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#854D0E" />
        <Text style={styles.noticeText}>Tỷ lệ quy đổi: 1.000 VNĐ = 1 Điểm. Điểm tích lũy hết hạn sau 12 tháng.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#f8fafb',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: '#276749',
    textTransform: 'uppercase',
  },
  title: {
    color: '#0F2A19',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  subTitle: {
    color: '#456257',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  cards: {
    gap: 10,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    position: 'relative',
  },
  featuredCard: {
    borderColor: '#F7C95C',
    shadowColor: '#DE9B00',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF5D6',
    color: '#8A5A00',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 1,
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardSub: {
    color: '#60746B',
    fontSize: 12,
  },
  pointsBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    color: '#5F7269',
  },
  perkList: {
    gap: 7,
    marginTop: 6,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  perkText: {
    fontSize: 13,
    color: '#40534B',
    flex: 1,
    lineHeight: 18,
  },
  notice: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3D48A',
    backgroundColor: '#FFF9E8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    color: '#7A5622',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});