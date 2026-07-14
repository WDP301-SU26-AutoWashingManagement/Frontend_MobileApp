import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import branchService from '../services/branchService';

const VIDEO_URI = 'https://cdn.pixabay.com/video/2023/10/12/184734-873923034_large.mp4';

const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1e9) {
    return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
};

export default function Hero() {
  const { width: screenWidth } = useWindowDimensions();
  const isSmall = screenWidth < 375;

  const wordFontSize = isSmall ? 38 : 50;
  const wordLineHeight = isSmall ? 44 : 58;
  const statValSize = isSmall ? 26 : 34;
  const statLabelSize = isSmall ? 10 : 11;
  const descFontSize = isSmall ? 12 : 13;

  const topWordTopRight = isSmall ? 110 : 140;
  const descTop = isSmall ? 190 : 250;
  const bottomWordLeft = isSmall ? 280 : 330;

  const [stats, setStats] = useState({ customers: 0, bookings: 0, branches: 0 });
  const player = useVideoPlayer(VIDEO_URI, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await branchService.getPublicStats();
        if (data) {
          setStats(data);
        }
      } catch (error) {
        console.error('Lỗi khi tải thống kê trong Mobile Hero:', error);
      }
    }
    fetchStats();
  }, []);

  return (
    <View style={styles.hero}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />
      <View style={styles.overlay} />
      <View style={styles.vignetteTop} />
      <View style={styles.vignetteBottom} />

      <View style={styles.content}>
        <View style={styles.brandRow}>
          <Image
            source={require('@/assets/images/logo2.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.brandText}>
            Hybrid<Text style={styles.brandAccent}>Wash</Text>
          </Text>
        </View>

        <View style={styles.stage}>
          <Text style={[styles.heroWord, styles.wordTopLeft, { fontSize: wordFontSize, lineHeight: wordLineHeight }]}>RỬA XE</Text>
          <Text style={[styles.heroWord, styles.wordTopRight, { fontSize: wordFontSize, lineHeight: wordLineHeight, top: topWordTopRight }]}>TÍCH ĐIỂM</Text>
          <Text style={[styles.heroWord, styles.wordBottomLeft, { fontSize: wordFontSize, lineHeight: wordLineHeight, top: bottomWordLeft }]}>NHẬN ƯU ĐÃI</Text>

          <View style={[styles.descriptionWrap, { top: descTop }]}>
            <Text style={[styles.description, { fontSize: descFontSize }]}>
              Đặt lịch, theo dõi điểm thưởng và nhận ưu đãi độc quyền theo hạng thành viên trong một ứng dụng duy nhất.
            </Text>
          </View>

          <View style={[styles.statCorner, styles.statTopRight]}>
            <View style={styles.statLine} />
            <Text style={[styles.statValue, { fontSize: statValSize, lineHeight: statValSize + 2 }]}>+{formatNumber(stats.customers)}</Text>
            <Text style={[styles.statLabel, { fontSize: statLabelSize }]}>khách hàng đang sử dụng</Text>
          </View>

          <View style={[styles.statCorner, styles.statBottomLeft]}>
            <View style={styles.statLine} />
            <Text style={[styles.statValue, { fontSize: statValSize, lineHeight: statValSize + 2 }]}>+{formatNumber(stats.branches)}</Text>
            <Text style={[styles.statLabel, { textAlign: 'left', fontSize: statLabelSize }]}>chi nhánh đang hoạt động</Text>
          </View>

          <View style={[styles.statCorner, styles.statBottomRight]}>
            <View style={styles.statLine} />
            <Text style={[styles.statValue, { fontSize: statValSize, lineHeight: statValSize + 2 }]}>+{formatNumber(stats.bookings)}</Text>
            <Text style={[styles.statLabel, { fontSize: statLabelSize }]}>lượt đặt lịch thành công</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 650,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(, 10, 16, 0.3)',
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  logo: {
    width: 80,
    height: 80,
    marginTop: 30,
  },
  brandText: {
    color: '#FFFFFF',
    marginTop: 30, 
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: '#04e6ff',
  },
  stage: {
    flex: 1,
    position: 'relative',
  },
  heroWord: {
    position: 'absolute',
    color: '#FBFCFD',
    marginTop: 20,
    fontSize: 50,
    lineHeight: 58,
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.88)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  wordTopLeft: {
    top: 0,
    left: -2,
    maxWidth: 210,
  },
  wordTopRight: {
    top: 140,
    right: -4,
    maxWidth: 270,
    textAlign: 'right',
  },
  wordBottomLeft: {
    top: 330,
    left: 12,
    maxWidth: 330,
  },
  descriptionWrap: {
    position: 'absolute',
    left: 0,
    top: 250,
    maxWidth: 230,
  },
  description: {
    color: '#F3F5F7',
    fontSize: 13,
    lineHeight: 19,
    textShadowColor: 'rgba(17, 17, 17, 0.72)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statCorner: {
    position: 'absolute',
    maxWidth: 165,
  },
  statTopRight: {
    top: 6,
    right: 6,
    alignItems: 'flex-end',
  },
  statBottomLeft: {
    bottom: 18,
    left: 8,
    alignItems: 'flex-start',
  },
  statBottomRight: {
    bottom: 18,
    right: 8,
    alignItems: 'flex-end',
  },
  statLine: {
    width: 82,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.38)',
    transform: [{ rotate: '-22deg' }],
    marginBottom: 12,
  },
  statValue: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 34,
    lineHeight: 36,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  statLabel: {
    color: 'rgba(241, 246, 248, 0.84)',
    fontSize: 11,
    marginTop: 6,
    maxWidth: 180,
    textAlign: 'right',
  },
});