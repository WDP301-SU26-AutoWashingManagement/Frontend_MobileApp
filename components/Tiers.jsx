import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

const tiers = [
  {
    name: 'Member',
    subtitle: 'Hạng cơ bản',
    icon: 'medal-outline',
    color: '#B07A3D',
    colorDark: '#6A431C',
    colorLight: '#F7E6CF',
    window: '7 ngày',
    discount: '0%',
    perks: [
      'Tích điểm mỗi lần rửa',
      'Xem lịch sử booking',
      'Đổi điểm lấy ưu đãi',
    ],
  },
  {
    name: 'Silver',
    subtitle: 'Khách hàng thân thiết',
    icon: 'star-outline',
    color: '#6d7681',
    colorDark: '#2a3542',
    colorLight: '#ECEFF3',
    window: '10 ngày',
    discount: '5%',
    perks: [
      'Tất cả quyền Member',
      'Giảm 5% mỗi lần rửa',
      'Nhận promo ưu tiên',
      'Hàng đợi ưu tiên',
    ],
  },
  {
    name: 'Gold',
    subtitle: 'Khách VIP',
    icon: 'crown-outline',
    color: '#B8892E',
    colorDark: '#6B4710',
    colorLight: '#F6E4B7',
    window: '12 ngày',
    discount: '10%',
    perks: [
      'Tất cả quyền Silver',
      'Giảm 10% mỗi lần rửa',
      'Tích điểm x1.5',
      'Add-on miễn phí',
    ],
    featured: true,
  },
  {
    name: 'Platinum',
    subtitle: 'Hạng cao nhất',
    icon: 'diamond-stone',
    color: '#2B8FA3',
    colorDark: '#135B6B',
    colorLight: '#DDF2F7',
    window: '14 ngày',
    discount: '15%',
    perks: [
      'Tất cả quyền Gold',
      'Giảm 15% mỗi lần rửa',
      'Tích điểm x2',
      'Rửa xe miễn phí hàng tháng',
    ],
  },
];

export default function Tiers() {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Hạng thành viên</Text>
      <Text style={styles.title}>Càng rửa nhiều, ưu đãi càng lớn</Text>
      <Text style={styles.subTitle}>Hệ thống tự động nâng hạ hạng hàng tháng dựa trên lịch sử đặt lịch.</Text>

      <View style={styles.cards}>
        {tiers.map((tier) => (
          <View
            key={tier.name}
            style={[
              styles.card,
              { borderColor: tier.colorLight, backgroundColor: '#FFFFFF' },
              tier.featured && styles.featuredCard,
            ]}
          >
            {tier.featured ? <Text style={styles.featuredBadge}>Phổ biến nhất</Text> : null}

            <View style={styles.cardHeader}>
              <View style={[styles.icon, { backgroundColor: tier.colorLight }]}> 
                <MaterialCommunityIcons name={tier.icon} size={20} color={tier.colorDark} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.cardTitle, { color: tier.colorDark }]}>{tier.name}</Text>
                <Text style={styles.cardSub}>{tier.subtitle}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: tier.colorLight }]}> 
                <Text style={[styles.statValue, { color: tier.colorDark }]}>{tier.window}</Text>
                <Text style={styles.statLabel}>Đặt trước</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: tier.colorLight }]}> 
                <Text style={[styles.statValue, { color: tier.colorDark }]}>{tier.discount}</Text>
                <Text style={styles.statLabel}>Giảm giá</Text>
              </View>
            </View>

            <View style={styles.perkList}>
              {tier.perks.map((perk) => (
                <View key={perk} style={styles.perkItem}>
                  <MaterialCommunityIcons name="check-circle" size={15} color={tier.color} />
                  <Text style={styles.perkText}>{perk}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.notice}>
        <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#854D0E" />
        <Text style={styles.noticeText}>Điểm tích lũy hết hạn sau 12 tháng. Hệ thống đánh giá nâng hạ hạng tự động mỗi tháng.</Text>
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
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardSub: {
    color: '#60746B',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
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
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
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