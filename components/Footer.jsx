import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const VIDEO_URI =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085844_21a8f4b3-dea5-4ede-be16-d53f6973bb14.mp4';

const LINKS = [
  {
    title: 'Sản phẩm',
    items: ['Tính năng', 'Hạng thành viên', 'Cách hoạt động'],
  },
  {
    title: 'Công ty',
    items: ['Về chúng tôi', 'Blog', 'Liên hệ'],
  },
  {
    title: 'Pháp lý',
    items: ['Điều khoản', 'Bảo mật', 'Cookie'],
  },
];

const SOCIALS = [
  { icon: 'facebook', label: 'Facebook' },
  { icon: 'instagram', label: 'Instagram' },
  { icon: 'twitter', label: 'Twitter' },
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
        <View style={styles.newsletterCard}>
          <Text style={styles.newsTitle}>Nhận cập nhật mới</Text>
          <Text style={styles.newsSub}>Đừng bỏ lỡ khuyến mãi độc quyền và tin tức từ AutoWash</Text>
          <View style={styles.newsForm}>
            <TextInput
              style={styles.input}
              placeholder="Email của bạn"
              placeholderTextColor="#6B7280"
              keyboardType="email-address"
            />
            <Pressable style={styles.button}>
              <Text style={styles.buttonText}>Đăng ký</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

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
              Hệ thống rửa xe thông minh với chương trình loyalty tích hợp.
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'relative',
    marginTop: 20,
    minHeight: 580,
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
  newsletterCard: {
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 22,
    padding: 16,
    marginBottom: 26,
  },
  newsTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  newsSub: {
    color: 'rgba(240,247,250,0.86)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  newsForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    paddingHorizontal: 12,
    color: '#0F172A',
    fontSize: 14,
  },
  button: {
    height: 44,
    paddingHorizontal: 14,
    backgroundColor: '#0EA5B7',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
});
