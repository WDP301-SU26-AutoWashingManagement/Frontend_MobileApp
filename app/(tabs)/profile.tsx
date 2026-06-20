import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Clipboard,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '../../hooks/useAuthService';
import { ProfileModals } from '../modalProfile';

const ImagePicker: any = require('expo-image-picker');

const CYAN = '#06B6D4';
const CYAN_LIGHT = 'rgba(6,182,212,0.12)';
const CYAN_BORDER = 'rgba(6,182,212,0.25)';
const DARK = '#0F172A';
const GRAY = '#64748B';
const SURFACE = '#FFFFFF';
const BG = '#F1F5F9';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, loading, updateProfile, changePassword, error, clearError } = useAuth();
  const [avatarError, setAvatarError] = useState(false);
  const [modalType, setModalType] = useState<'edit' | 'password' | 'logout' | null>(null);
  const [editForm, setEditForm] = useState({ full_name: user?.full_name || '', phone: user?.phone || '' });
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  const handleLogoutPress = () => {
    setModalType('logout');
  };

  const doLogout = async () => {
    try {
      await logout();
      setModalType(null);
      router.replace('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleEditProfile = async () => {
    if (!editForm.full_name.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tên'); return; }
    try {
      if (localImage) {
        const form = new FormData();
        form.append('full_name', editForm.full_name);
        if (editForm.phone) form.append('phone', editForm.phone);
        const uriParts = localImage.split('.');
        const fileExt = uriParts[uriParts.length - 1];
        const mimeType = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : `image/${fileExt}`;
        // @ts-ignore
        form.append('avatar', { uri: localImage, name: `avatar.${fileExt}`, type: mimeType });
        await updateProfile(form as any);
      } else {
        await updateProfile({ full_name: editForm.full_name, phone: editForm.phone || undefined });
      }
      Alert.alert('Thành công', 'Cập nhật hồ sơ thành công');
      setModalType(null);
      setLocalImage(null);
    } catch (err) {
      Alert.alert('Lỗi', error || 'Cập nhật hồ sơ thất bại');
      clearError();
    }
  };

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Quyền truy cập bị từ chối', 'Vui lòng cho phép truy cập ảnh'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
      // @ts-ignore
      if (!result.cancelled && !result.canceled) {
        // @ts-ignore
        const uri = result.uri || (result.assets && result.assets[0]?.uri);
        if (uri) setLocalImage(uri);
      } else if (result.assets && result.assets.length > 0) {
        // @ts-ignore
        setLocalImage(result.assets[0].uri);
      }
    } catch (err) { Alert.alert('Lỗi', 'Không thể chọn ảnh'); }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.oldPassword.trim() || !passwordForm.newPassword.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu'); return; }
    if (passwordForm.newPassword.length < 6) { Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự'); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp'); return; }
    try {
      await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      Alert.alert('Thành công', 'Đổi mật khẩu thành công');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setModalType(null);
    } catch (err) {
      Alert.alert('Lỗi', error || 'Đổi mật khẩu thất bại');
      clearError();
    }
  };

  const avatarUri = localImage || user?.avatar_url;
  const initial = user?.full_name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>

        {/* Hero Header */}
        <View style={styles.heroCard}>
          {/* Decorative background blobs */}
          <View style={styles.blob1} />
          <View style={styles.blob2} />

          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            {avatarUri && !avatarError ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
                contentFit="cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            {/* Online dot */}
            <View style={styles.onlineDot} />
          </View>

          <Text style={styles.heroName}>{user?.full_name || 'Người dùng'}</Text>
          <Text style={styles.heroEmail}>{user?.email}</Text>

          {user?.is_email_verified && (
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="check-decagram" size={14} color={CYAN} />
              <Text style={styles.verifiedText}>Đã xác minh</Text>
            </View>
          )}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.role === 'customer' ? 'Khách hàng' : user?.role || '—'}</Text>
              <Text style={styles.statLabel}>Vai trò</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {(user as any)?.createdAt || user?.created_at ? new Date((user as any)?.createdAt || user?.created_at || '').toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }) : '—'}
              </Text>
              <Text style={styles.statLabel}>Tham gia</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.phone ? '✓' : '—'}</Text>
              <Text style={styles.statLabel}>Điện thoại</Text>
            </View>
          </View>
        </View>

        {/* Thẻ thành viên Section */}
        {user?.role === 'customer' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thẻ thành viên</Text>
            <View style={styles.tierContainer}>
              <TierProgressCard points={user?.role_data?.membership_points ?? 0} />
              
              <TierRow
                icon="star-outline"
                iconColor="#EAB308"
                label="Điểm hạng"
                value={user?.role_data?.membership_points ?? 0}
              />
              <TierRow
                icon="ribbon"
                iconColor="#06B6D4"
                label="Điểm thưởng"
                value={user?.role_data?.reward_points ?? 0}
              />
              <TierRow
                icon="share-variant-outline"
                iconColor="#A855F7"
                label="Mã giới thiệu"
                value={user?.role_data?.referral_code ?? '—'}
                isReferral
              />
            </View>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <View style={styles.card}>
            <InfoRow icon="email-outline" label="Email" value={user?.email || '—'} />
            <View style={styles.divider} />
            <InfoRow icon="phone-outline" label="Số điện thoại" value={user?.phone || 'Chưa cập nhật'} accent={!user?.phone} />
            <View style={styles.divider} />
            <InfoRow
              icon="calendar-outline"
              label="Ngày tham gia"
              value={(user as any)?.createdAt || user?.created_at ? new Date((user as any)?.createdAt || user?.created_at || '').toLocaleDateString('vi-VN') : 'N/A'}
            />
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          <View style={styles.card}>
            <ActionRow
              icon="account-edit-outline"
              label="Chỉnh sửa thông tin"
              color={CYAN}
              onPress={() => { setEditForm({ full_name: user?.full_name || '', phone: user?.phone || '' }); setModalType('edit'); }}
              disabled={loading}
            />
            <View style={styles.divider} />
            <ActionRow
              icon="lock-outline"
              label="Đổi mật khẩu"
              color="#8B5CF6"
              onPress={() => { setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); setModalType('password'); }}
              disabled={loading}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
            onPress={handleLogoutPress}
            disabled={loading}>
            <MaterialCommunityIcons name="logout-variant" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>{loading ? 'Đang đăng xuất...' : 'Đăng xuất'}</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ProfileModals
        visibleType={modalType}
        onClose={() => setModalType(null)}
        loading={loading}
        editForm={editForm}
        setEditForm={setEditForm}
        avatarUri={localImage || user?.avatar_url}
        onPickImage={pickImage}
        onSubmitEdit={handleEditProfile}
        passwordForm={passwordForm}
        setPasswordForm={setPasswordForm}
        onSubmitPassword={handleChangePassword}
        onLogout={doLogout}
      />
    </>
  );
}

function InfoRow({ icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <MaterialCommunityIcons name={icon} size={18} color={CYAN} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, accent && styles.infoValueAccent]}>{value}</Text>
      </View>
    </View>
  );
}

function ActionRow({ icon, label, color, onPress, disabled }: { icon: any; label: string; color: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
      onPress={onPress}
      disabled={disabled}>
      <View style={[styles.actionIconBox, { backgroundColor: color + '18' }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
    </Pressable>
  );
}

const TIER_THRESHOLDS = [
  { name: 'member', min: 0, label: 'Thành viên' },
  { name: 'silver', min: 100, label: 'Bạc' },
  { name: 'gold', min: 300, label: 'Vàng' },
  { name: 'platinum', min: 600, label: 'Bạch kim' },
];

function getTierProgress(currentPoints: number) {
  let currentTierIndex = 0;
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (currentPoints >= TIER_THRESHOLDS[i].min) {
      currentTierIndex = i;
      break;
    }
  }

  const currentTier = TIER_THRESHOLDS[currentTierIndex];
  const isMaxTier = currentTierIndex === TIER_THRESHOLDS.length - 1;

  if (isMaxTier) {
    return {
      currentPoints,
      nextPoints: currentTier.min,
      nextTierLabel: 'Cấp tối đa',
      percentage: 1,
      pointsNeeded: 0,
      currentTierLabel: currentTier.label,
    };
  }

  const nextTier = TIER_THRESHOLDS[currentTierIndex + 1];
  const range = nextTier.min - currentTier.min;
  const progress = currentPoints - currentTier.min;
  const percentage = Math.min(Math.max(progress / range, 0), 1);
  const pointsNeeded = nextTier.min - currentPoints;

  return {
    currentPoints,
    nextPoints: nextTier.min,
    nextTierLabel: nextTier.label,
    percentage,
    pointsNeeded,
    currentTierLabel: currentTier.label,
  };
}

function TierProgressCard({ points }: { points: number }) {
  const progressInfo = getTierProgress(points);
  
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressTextRow}>
        <Text style={styles.progressTextCurrent}>
          {progressInfo.currentPoints.toLocaleString('vi-VN')}
          <Text style={styles.pointsUnit}> điểm</Text>
        </Text>
        <Text style={styles.progressTextNext}>
          /{progressInfo.nextPoints.toLocaleString('vi-VN')} điểm ({progressInfo.nextTierLabel})
        </Text>
      </View>

      <View style={styles.progressBarWrapper}>
        <View style={styles.progressBarTrack}>
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${progressInfo.percentage * 100}%` }
            ]} 
          />
        </View>
        
        <View style={styles.nextTierIconContainer}>
          <MaterialCommunityIcons 
            name="crown" 
            size={18} 
            color={progressInfo.percentage >= 1 ? '#EAB308' : '#94A3B8'} 
          />
        </View>
      </View>

      {progressInfo.pointsNeeded > 0 ? (
        <Text style={styles.progressHelperText}>
          Tích lũy thêm <Text style={styles.pointsHighlight}>{progressInfo.pointsNeeded}</Text> điểm để lên hạng {progressInfo.nextTierLabel}
        </Text>
      ) : (
        <Text style={styles.progressHelperText}>
          Chúc mừng! Bạn đã đạt cấp độ cao nhất ({progressInfo.currentTierLabel})
        </Text>
      )}
    </View>
  );
}

function TierRow({
  icon,
  iconColor,
  label,
  value,
  isReferral,
}: {
  icon: any;
  iconColor: string;
  label: string;
  value: string | number;
  isReferral?: boolean;
}) {
  const handlePress = () => {
    if (!isReferral) return;

    if (!value || value === '—') {
      Alert.alert('Mã giới thiệu', 'Tài khoản của bạn chưa có mã giới thiệu.');
      return;
    }

    try {
      Clipboard.setString(value.toString());
      Alert.alert('Thành công', `Đã sao chép mã giới thiệu: ${value}`);
    } catch (err) {
      Alert.alert('Mã giới thiệu', `Mã giới thiệu của bạn là: ${value}`);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.tierRow,
        isReferral && pressed && styles.tierRowPressed,
      ]}
      onPress={isReferral ? handlePress : undefined}
      disabled={!isReferral}
    >
      <View style={styles.tierRowLeft}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} style={styles.tierRowIcon} />
        <Text style={styles.tierRowLabel}>{label}</Text>
      </View>
      <Text style={[styles.tierRowValue, isReferral && styles.tierRowValueReferral]}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  contentContainer: { paddingBottom: 20 },

  // Hero
  heroCard: {
    backgroundColor: SURFACE,
    marginHorizontal: 16,
    marginTop: Platform.OS === 'ios' ? 60 : 20,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  blob1: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: CYAN_LIGHT,
  },
  blob2: {
    position: 'absolute', bottom: -20, left: -20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(139,92,246,0.08)',
  },

  avatarWrapper: { position: 'relative', marginBottom: 14 },
  avatarImage: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: CYAN,
  },
  avatarFallback: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: CYAN_LIGHT,
    borderWidth: 3, borderColor: CYAN,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 34, fontWeight: '800', color: CYAN },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2, borderColor: SURFACE,
  },

  heroName: { fontSize: 22, fontWeight: '800', color: DARK, letterSpacing: -0.5, marginBottom: 3 },
  heroEmail: { fontSize: 13, color: GRAY, marginBottom: 10 },

  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: CYAN_LIGHT, borderRadius: 20,
    borderWidth: 1, borderColor: CYAN_BORDER,
    marginBottom: 20,
  },
  verifiedText: { fontSize: 12, fontWeight: '700', color: CYAN },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BG, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 8,
    width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 13, fontWeight: '800', color: DARK },
  statLabel: { fontSize: 11, color: GRAY, fontWeight: '500' },
  statDivider: { width: 1, height: 28, backgroundColor: '#E2E8F0' },

  // Section
  section: { marginTop: 16, marginHorizontal: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: GRAY,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 8, marginLeft: 4,
  },

  // Card
  card: {
    backgroundColor: SURFACE, borderRadius: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 },

  // Info Row
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  infoIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: CYAN_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: GRAY, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: DARK },
  infoValueAccent: { color: '#94A3B8', fontStyle: 'italic' },

  // Action Row
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  actionRowPressed: { backgroundColor: '#F8FAFC' },
  actionIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: DARK },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)',
  },
  logoutBtnPressed: { backgroundColor: 'rgba(239,68,68,0.14)' },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },

  // Tier Styles
  tierContainer: {
    gap: 12,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  tierRowPressed: {
    backgroundColor: '#E2E8F0',
  },
  tierRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierRowIcon: {
    marginRight: 2,
  },
  tierRowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  tierRowValue: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
  },
  tierRowValueReferral: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Progress Card Styles
  progressCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1.5,
  },
  progressTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  progressTextCurrent: {
    fontSize: 22,
    fontWeight: '800',
    color: '#EF4444',
  },
  pointsUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  progressTextNext: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
  progressBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    gap: 10,
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },
  nextTierIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progressHelperText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  pointsHighlight: {
    fontWeight: '700',
    color: '#EF4444',
  },
});