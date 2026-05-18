import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

const features = [
  {
    icon: 'tune-variant',
    accent: '#0EA5B7',
    accentSoft: '#DDF8FC',
    badge: 'Quản trị',
    title: 'Quản lý toàn quyền kiểm soát',
    desc: 'Cấu hình quy tắc hạng, tích lũy điểm, định giá theo hạng và chạy khuyến mãi mục tiêu (ví dụ: chỉ Silver trở lên). Quản lý giám sát và phê duyệt các cấu hình lớn.',
    tags: ['Cấu hình hạng', 'Khuyến mãi mục tiêu', 'Phê duyệt quản lý'],
  },
  {
    icon: 'chart-timeline-variant',
    accent: '#2563EB',
    accentSoft: '#E4ECFF',
    badge: 'Báo cáo',
    title: 'Báo cáo & hiệu suất',
    desc: 'Quản lý nhận báo cáo doanh thu, KPI và hiệu suất chương trình khách hàng thân thiết theo thời gian thực. Admin xem danh sách đặt lịch trong ngày.',
    tags: ['Báo cáo doanh thu', 'Bảng điều khiển KPI', 'Danh sách đặt lịch'],
  },
  {
    icon: 'bell-ring-outline',
    accent: '#7C3AED',
    accentSoft: '#F2E7FF',
    badge: 'Tự động',
    title: 'Tự động hóa thông minh',
    desc: 'Nâng hoặc hạ hạng tự động hàng tháng, điểm hết hạn sau 12 tháng, tự động áp dụng quyền lợi khi thanh toán - không cần nhân viên xử lý thủ công.',
    tags: ['Đánh giá hạng tự động', 'Điểm hết hạn', 'Áp dụng quyền lợi tự động'],
  },
  {
    icon: 'shield-check-outline',
    accent: '#059669',
    accentSoft: '#E1F8EE',
    badge: 'Thanh toán',
    title: 'Checkout minh bạch',
    desc: 'Giảm giá theo hạng được áp tự động, cộng thêm giảm giá đổi điểm nếu khách sử dụng điểm và ưu đãi khuyến mãi nếu đang có chiến dịch.',
    tags: ['Giá theo hạng', 'Đổi điểm', 'Ghép khuyến mãi'],
  },
];

export default function Features() {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Tính năng</Text>
      <Text style={styles.title}>Đầy đủ cho khách hàng và vận hành</Text>
      <Text style={styles.subTitle}>Bộ tính năng được trình bày gọn, dễ đọc và bám sát giá trị sử dụng.</Text>

      <View style={styles.grid}>
        {features.map((feature, index) => (
          <View key={feature.title} style={[styles.card, { borderColor: feature.accentSoft }]}> 
            <View style={styles.cardHead}>
              <View style={[styles.iconWrap, { backgroundColor: feature.accentSoft }]}> 
                <MaterialCommunityIcons name={feature.icon} size={22} color={feature.accent} />
              </View>
              <Text style={[styles.badge, { color: feature.accent, backgroundColor: feature.accentSoft }]}> 
                {String(index + 1).padStart(2, '0')} - {feature.badge}
              </Text>
            </View>

            <Text style={styles.cardTitle}>{feature.title}</Text>
            <Text style={styles.cardDesc}>{feature.desc}</Text>

            <View style={styles.tagWrap}>
              {feature.tags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: feature.accentSoft }]}> 
                  <Text style={[styles.tagText, { color: feature.accent }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#F6FBFD',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: '#1197B1',
    textTransform: 'uppercase',
  },
  title: {
    color: '#0B1F2A',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  subTitle: {
    color: '#4A5E6E',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },
  grid: {
    gap: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 8,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: '#112635',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  cardDesc: {
    color: '#536878',
    fontSize: 13,
    lineHeight: 20,
  },
  tagWrap: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
