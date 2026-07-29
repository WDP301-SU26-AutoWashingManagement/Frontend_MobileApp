import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import servicePackageService from '../services/servicePackageService';

const steps = [
  {
    icon: 'account-plus-outline',
    num: '01',
    title: 'Đăng ký tài khoản',
    desc: 'Nhập số điện thoại và biển số xe. Hệ thống tạo hồ sơ và cấp hạng Member ngay lập tức.',
  },
  {
    icon: 'calendar-check-outline',
    num: '02',
    title: 'Đặt lịch rửa xe',
    desc: 'Chọn ngày giờ phù hợp trong khung thời gian theo hạng (7–14 ngày). Hệ thống xác nhận khung giờ ngay.',
  },
  {
    icon: 'car-wash',
    num: '03',
    title: 'Rửa xe & tích điểm',
    desc: 'Quản trị viên xác nhận hoàn thành dịch vụ. Điểm được cộng tự động vào tài khoản của bạn.',
  },
  {
    icon: 'gift-outline',
    num: '04',
    title: 'Đổi điểm nhận ưu đãi',
    desc: 'Dùng điểm đổi lấy giảm giá, rửa xe miễn phí hoặc tiện ích cộng thêm. Ưu đãi áp dụng tự động khi thanh toán.',
  },
];

export default function HowItWorks() {
  const [washPrice, setWashPrice] = useState('50.000đ');

  useEffect(() => {
    const fetchWashPrice = async () => {
      try {
        const services = await servicePackageService.listActiveServices();
        const washService = services.find(
          s => s.service_name === 'Dịch vụ rửa xe' || s.service_name?.toLowerCase() === 'dịch vụ rửa xe'
        );
        if (washService && washService.service_price !== undefined) {
          const formatted = Number(washService.service_price).toLocaleString('vi-VN') + 'đ';
          setWashPrice(formatted);
        }
      } catch (err) {
        console.error('Error fetching wash price in HowItWorks:', err);
      }
    };
    fetchWashPrice();
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Quy trình</Text>
      <Text style={styles.title}>Cách hoạt động</Text>
      <Text style={styles.subTitle}>Từ đăng ký đến nhận ưu đãi chỉ qua 4 bước đơn giản.</Text>

      <View style={styles.stepList}>
        {steps.map((step) => (
          <View key={step.num} style={styles.stepCard}>
            <View style={styles.stepHead}>
              <Text style={styles.stepNum}>BƯỚC {step.num}</Text>
              <View style={styles.stepIconWrap}>
                <MaterialCommunityIcons name={step.icon} size={21} color="#0891B2" />
              </View>
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDesc}>{step.desc}</Text>
          </View>
        ))}
      </View>

      <View style={styles.noticeCard}>
        <View style={styles.noticeIconCircle}>
          <MaterialCommunityIcons name="information-variant" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.noticeContent}>
          <View style={styles.noticeHeader}>
            <Text style={styles.noticeTitle}>Lưu ý quan trọng khi Đặt lịch</Text>
            <View style={styles.defaultBadge}>
              <MaterialCommunityIcons name="check-circle-outline" size={11} color="#2563EB" />
              <Text style={styles.defaultBadgeText}>Dịch vụ mặc định</Text>
            </View>
          </View>
          <Text style={styles.noticeTextMain}>
            Mọi lịch hẹn <Text style={{ fontWeight: '700', color: '#0F172A' }}>mặc định bao gồm Dịch vụ rửa xe</Text> (<Text style={styles.priceHighlight}>{washPrice}</Text>). Quý khách có thể chọn thêm dịch vụ lẻ hoặc gói Combo tùy nhu cầu.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#ECF9FC',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: '#0E7490',
    textTransform: 'uppercase',
  },
  title: {
    color: '#072D3A',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  subTitle: {
    color: '#466777',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  stepList: {
    gap: 10,
  },
  stepCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C9ECF4',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 7,
  },
  stepHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepNum: {
    fontSize: 11,
    letterSpacing: 0.9,
    fontWeight: '700',
    color: '#0E7490',
  },
  stepIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DFF4FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 17,
    color: '#0B2431',
    fontWeight: '700',
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4D6878',
  },
  noticeCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
    backgroundColor: '#F0F9FF',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  noticeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noticeContent: {
    flex: 1,
    gap: 6,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0369A1',
  },
  noticeTextMain: {
    fontSize: 12,
    lineHeight: 18,
    color: '#334155',
  },
  priceHighlight: {
    color: '#2563EB',
    fontWeight: '800',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 5,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#BAE6FD',
  },
});
