import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

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

      <View style={styles.notice}>
        <MaterialCommunityIcons name="calendar-clock" size={18} color="#0369A1" />
        <Text style={styles.noticeText}>Đặt lịch trong vài phút, hệ thống xác nhận ngay trong ứng dụng.</Text>
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
  notice: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#B9E6F4',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    fontSize: 13,
    color: '#0D3E53',
    flex: 1,
  },
});
