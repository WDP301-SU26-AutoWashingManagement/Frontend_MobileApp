import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const VIDEO_URI =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085844_21a8f4b3-dea5-4ede-be16-d53f6973bb14.mp4';

const LINKS = [
  {
    title: 'Khám phá',
    items: ['Trang chủ', 'Tính năng', 'Hạng thành viên', 'Cách hoạt động'],
  },
  {
    title: 'Ứng dụng',
    items: ['Đặt lịch rửa xe', 'Quản lý phương tiện', 'Lịch sử đặt lịch'],
  },
  {
    title: 'Hỗ trợ & Liên hệ',
    items: ['Chi nhánh hệ thống', 'Hotline: 0933 003'],
  },
];

const SOCIALS = [
  { icon: 'facebook', label: 'Facebook' },
  { icon: 'instagram', label: 'Instagram' },
  { icon: 'tiktok', label: 'TikTok' },
];

export default function Footer() {
  const player = useVideoPlayer(VIDEO_URI, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={styles.footer}>
      <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />
      <View style={styles.overlay} />

      <View style={styles.content}>
        <View style={styles.grid}>
          <View style={styles.brandCol}>
            <View style={styles.brandRow}>
              <Image
                source={require('@/assets/images/logo2.png')}
                style={styles.logo}
                contentFit="cover"
              />
              <Text style={styles.brandText}>
                Auto<Text style={styles.brandAccent}>Wash</Text>
              </Text>
            </View>
            <Text style={styles.brandDesc}>
              Hệ thống rửa xe tự động thông minh hàng đầu. Đặt lịch nhanh chóng, tích điểm thành viên và chăm sóc phương tiện chuẩn 5 sao.
            </Text>
            <View style={styles.socialRow}>
              {SOCIALS.map((item) => (
                <Pressable key={item.label} style={styles.socialBtn}>
                  <MaterialCommunityIcons name={item.icon} size={18} color="#E6F3F7" />
                </Pressable>
              ))}
            </View>
          </View>

          {LINKS.map((section) => (
            <View key={section.title} style={styles.linkCol}>
              <Text style={styles.linkTitle}>{section.title}</Text>
              {section.items.map((item) => (
                <Text key={item} style={styles.linkItem}>
                  {item}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.bottomBar}>
          <Text style={styles.copyright}>
            © {new Date().getFullYear()} AutoWash. Tất cả các quyền được bảo lưu.
          </Text>
          <View style={styles.legalLinks}>
            <Text style={styles.legalLink}>Điều khoản sử dụng</Text>
            <Text style={styles.legalLink}>Chính sách bảo mật</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'relative',
    marginTop: 20,
    minHeight: 340,
    overflow: 'hidden',
    backgroundColor: '#04080D',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,8,12,0.58)',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 26,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 18,
    rowGap: 18,
  },
  brandCol: {
    width: '100%',
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 10,
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: '#0EA5B7',
  },
  brandDesc: {
    color: 'rgba(244,250,252,0.83)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    maxWidth: 330,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkCol: {
    minWidth: 96,
    flexGrow: 1,
  },
  linkTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  linkItem: {
    color: 'rgba(236,244,247,0.84)',
    fontSize: 13,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 24,
    marginBottom: 16,
  },
  bottomBar: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  copyright: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    textAlign: 'center',
  },
  legalLinks: {
    flexDirection: 'row',
    gap: 16,
  },
  legalLink: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
  },
});
