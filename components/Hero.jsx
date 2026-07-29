import { useEffect, useState, useRef } from 'react';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, Text, View, useWindowDimensions, Pressable, Modal, ScrollView, Alert, Platform, Animated } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import branchService from '../services/branchService';
import promotionService from '../services/promotionService';

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

export default function Hero({ refreshKey }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isSmall = screenWidth < 375;

  const wordFontSize = isSmall ? 36 : Math.min(Math.round(screenWidth * 0.1), 44);
  const wordLineHeight = isSmall ? 42 : Math.min(Math.round(screenWidth * 0.11), 48);
  const statValSize = isSmall ? 22 : 28;
  const statLabelSize = isSmall ? 10 : 11;
  const descFontSize = isSmall ? 11 : 12;

  const topWordTopRight = isSmall ? 85 : 105;
  const descTop = isSmall ? 155 : 185;
  const bottomWordLeft = isSmall ? 240 : 280;

  const [stats, setStats] = useState({ customers: 0, bookings: 0, branches: 0 });
  const [promotions, setPromotions] = useState([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(0)).current;

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
  }, [refreshKey]);

  useEffect(() => {
    async function loadPromotions() {
      try {
        const data = await promotionService.list({ is_active: true, limit: 10 });
        setPromotions(data || []);
      } catch (error) {
        console.error('Lỗi khi tải khuyến mãi trong Hero:', error);
      }
    }
    loadPromotions();
  }, [refreshKey]);

  useEffect(() => {
    if (promotions.length > 0) {
      const startShake = () => {
        shakeAnimation.setValue(0);
        Animated.sequence([
          Animated.timing(shakeAnimation, { toValue: 1, duration: 60, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: -1, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: 0.8, duration: 80, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: -0.8, duration: 80, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: 0.5, duration: 80, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: -0.5, duration: 80, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start(() => {
          setTimeout(startShake, 4000);
        });
      };
      const initialTimeout = setTimeout(startShake, 2000);
      return () => clearTimeout(initialTimeout);
    }
  }, [promotions]);

  const bellRotation = shakeAnimation.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-18deg', '18deg'],
  });

  useEffect(() => {
    const startPulse = () => {
      pulseAnimation.setValue(0);
      Animated.timing(pulseAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }).start(() => startPulse());
    };
    startPulse();
  }, []);

  const pulseScale = pulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.0],
  });

  const pulseOpacity = pulseAnimation.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.8, 0.3, 0],
  });

  const copyToClipboard = async (code) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Đã sao chép', `Đã sao chép mã khuyến mãi "${code}" vào bộ nhớ tạm.`);
  };

  return (
    <View style={[styles.hero, { height: Math.max(Math.round(screenHeight * 0.72), 620) }]}>
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
          <View style={styles.brandLeft}>
            <Image
              source={require('@/assets/images/logo2.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={styles.brandText}>
              Hybrid<Text style={styles.brandAccent}>Wash</Text>
            </Text>
          </View>

          <View style={styles.rightHeaderContainer}>
            <Text style={styles.promoTextLabel}>Ưu đãi</Text>
            <View style={styles.notificationWrapper}>
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseScale }],
                    opacity: pulseOpacity
                  }
                ]}
              />
              <Pressable style={styles.notificationBtn} onPress={() => setShowPromoModal(true)}>
                <Animated.View style={{ transform: [{ rotate: bellRotation }] }}>
                  <Ionicons name="notifications" size={24} color="#FFFFFF" style={styles.notificationIcon} />
                </Animated.View>
                {promotions.length > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{promotions.length}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.stage}>
          <Text style={[styles.heroWord, styles.wordTopLeft, { fontSize: wordFontSize, lineHeight: wordLineHeight }]}>RỬA XE</Text>
          <Text style={[styles.heroWord, styles.wordTopRight, { fontSize: wordFontSize, lineHeight: wordLineHeight, top: topWordTopRight }]}>TÍCH ĐIỂM</Text>
          <Text style={[styles.heroWord, styles.wordBottomLeft, { fontSize: wordFontSize, lineHeight: wordLineHeight, top: bottomWordLeft, maxWidth: screenWidth * 0.75 }]}>NHẬN ƯU ĐÃI</Text>

          <View style={[styles.descriptionWrap, { top: descTop }]}>
            <Text style={[styles.description, { fontSize: descFontSize }]}>
              Đặt lịch, theo dõi điểm thưởng và nhận ưu đãi độc quyền theo hạng thành viên trong một ứng dụng duy nhất.
            </Text>
          </View>

          <View style={[styles.statCorner, styles.statTopRight]}>
            <Text style={[styles.statValue, { fontSize: statValSize, lineHeight: statValSize + 2 }]}>+{formatNumber(stats.customers)}</Text>
            <Text style={[styles.statLabel, { fontSize: statLabelSize }]}>khách hàng đang sử dụng</Text>
          </View>

          <View style={[styles.statCorner, styles.statBottomLeft]}>
            <Text style={[styles.statValue, { fontSize: statValSize, lineHeight: statValSize + 2 }]}>+{formatNumber(stats.branches)}</Text>
            <Text style={[styles.statLabel, { textAlign: 'left', fontSize: statLabelSize }]}>chi nhánh đang hoạt động</Text>
          </View>

          <View style={[styles.statCorner, styles.statBottomRight]}>
            <Text style={[styles.statValue, { fontSize: statValSize, lineHeight: statValSize + 2 }]}>+{formatNumber(stats.bookings)}</Text>
            <Text style={[styles.statLabel, { fontSize: statLabelSize }]}>lượt đặt lịch thành công</Text>
          </View>
        </View>
      </View>

      {/* Promotion Modal Overlay */}
      <Modal
        visible={showPromoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPromoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowPromoModal(false)} />
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <MaterialCommunityIcons name="star-four-points" size={20} color="#0EA5B7" />
                <Text style={styles.modalHeaderTitle}>Ưu Đãi Đặc Biệt</Text>
              </View>
              <View style={styles.modalPillBadge}>
                <Text style={styles.modalPillBadgeText}>{promotions.length} ưu đãi</Text>
              </View>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {promotions.map((promo) => {
                const id = promo.id || promo._id;
                const isPercentage = promo.discount_type === 'percentage';
                const discountText = isPercentage
                  ? `Giảm ${promo.discount_value}%`
                  : `Giảm ${(promo.discount_value / 1000)}k`;

                return (
                  <Pressable
                    key={id}
                    style={styles.promoModalCard}
                    onPress={() => copyToClipboard(promo.promotion_code)}
                  >
                    <View style={styles.promoCardTopLine} />

                    <View style={styles.promoCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                        <View style={styles.modalCodeBadge}>
                          <Text style={styles.modalCodeBadgeText}>{promo.promotion_code}</Text>
                        </View>
                        <Text style={styles.modalPromoName} numberOfLines={1}>
                          {promo.promotion_name || 'Khuyến mãi'}
                        </Text>
                      </View>

                      <View style={styles.modalDiscountBadge}>
                        <Text style={styles.modalDiscountBadgeText}>{discountText}</Text>
                      </View>
                    </View>

                    <View style={styles.modalCardFooter}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.modalPromoDesc} numberOfLines={1}>
                          {promo.description || 'Ưu đãi đặt lịch đặc biệt'}
                          {promo.min_order_amount > 0 && ` • Đơn từ ${new Intl.NumberFormat('vi-VN').format(promo.min_order_amount / 1000)}k`}
                        </Text>
                      </View>
                      <View style={styles.copyButton}>
                        <MaterialCommunityIcons name="content-copy" size={11} color="#0EA5B7" style={{ marginRight: 2 }} />
                        <Text style={styles.copyButtonText}>Sao chép</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable style={styles.modalCloseButton} onPress={() => setShowPromoModal(false)}>
              <Text style={styles.modalCloseButtonText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 44 : 30,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 60,
    height: 60,
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: '#04e6ff',
  },
  rightHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoTextLabel: {
    color: '#0cf56dff',
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: 'rgba(21, 99, 53, 0.98)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(37, 238, 114, 0.8)',
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  notificationWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0ed467ff',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0aee62ff',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0ad37fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  notificationIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#035a19ff',
  },
  badgeText: {
    color: '#0a8332ff',
    fontSize: 10,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    maxHeight: '65%',
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: -4 },
    elevation: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalPillBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  modalPillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  modalScroll: {
    marginHorizontal: -4,
  },
  modalScrollContent: {
    paddingVertical: 2,
    gap: 8,
  },
  promoModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  promoCardTopLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#0ea5b9',
  },
  promoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalCodeBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalCodeBadgeText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 10,
  },
  modalDiscountBadge: {
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalDiscountBadgeText: {
    color: '#9333EA',
    fontWeight: '700',
    fontSize: 10,
  },
  modalPromoName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  modalPromoDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  modalCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    borderStyle: 'dashed',
  },
  modalMinOrderText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  copyButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0EA5B7',
  },
  modalCloseButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  modalCloseButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
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
    left: 0,
    maxWidth: 210,
  },
  wordTopRight: {
    right: 0,
    maxWidth: 270,
    textAlign: 'right',
  },
  wordBottomLeft: {
    left: 0,
  },
  descriptionWrap: {
    position: 'absolute',
    left: 0,
    maxWidth: 230,
  },
  description: {
    color: '#F3F5F7',
    fontSize: 12,
    lineHeight: 18,
    textShadowColor: 'rgba(17, 17, 17, 0.72)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statCorner: {
    position: 'absolute',
    maxWidth: 165,
  },
  statTopRight: {
    top: 0,
    right: 0,
    alignItems: 'flex-end',
  },
  statBottomLeft: {
    bottom: 10,
    left: 0,
    alignItems: 'flex-start',
  },
  statBottomRight: {
    bottom: 10,
    right: 0,
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