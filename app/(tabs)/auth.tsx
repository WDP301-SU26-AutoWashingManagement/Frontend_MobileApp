import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../hooks/useAuthService';

const BENEFITS = [
  'Đặt lịch rửa xe trong vài chạm',
  'Tích điểm và nhận ưu đãi theo hạng',
  'Theo dõi lịch sử giao dịch rõ ràng',
];

const AUTH_PROMO_COPY = {
  loginTitle: 'Mở khóa ưu đãi',
  loginHighlight: 'độc quyền',
  loginDesc: 'Đăng nhập để nhận điểm thưởng và hạng thành viên VIP',
  registerTitle: 'Tham gia cộng đồng',
  registerHighlight: 'AutoWash',
  registerDesc: 'Bắt đầu hành trình rửa xe thông minh của bạn hôm nay',
};

const LOGIN_INITIAL_STATE = {
  email: '',
  password: '',
  remember: true,
};

const REGISTER_INITIAL_STATE = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export default function TabTwoScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState(LOGIN_INITIAL_STATE);
  const [registerForm, setRegisterForm] = useState(REGISTER_INITIAL_STATE);
  const { login: authLogin, register: authRegister, loginWithGoogle: authLoginWithGoogle, loading, error, clearError } = useAuth();

  const isLogin = mode === 'login';

  const passwordsMatch =
    registerForm.confirmPassword.length > 0 &&
    registerForm.password === registerForm.confirmPassword;

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    clearError();
  };

  const handleLoginSubmit = async () => {
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu.');
      return;
    }

    try {
      await authLogin(loginForm.email, loginForm.password);
      setLoginForm(LOGIN_INITIAL_STATE);

      // Reset toàn bộ navigation stack, buộc tất cả tabs re-mount
      router.replace('/(tabs)');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Đăng nhập thất bại';
      Alert.alert('Lỗi', errorMsg);
    }
  };

  const handleRegisterSubmit = async () => {
    if (!registerForm.name.trim() || !registerForm.email.trim() || !registerForm.password.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ họ tên, email và mật khẩu.');
      return;
    }

    if (registerForm.password.length < 6) {
      Alert.alert('Mật khẩu không hợp lệ', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      Alert.alert('Mật khẩu không khớp', 'Vui lòng nhập lại đúng mật khẩu.');
      return;
    }

    try {
      await authRegister(registerForm.email, registerForm.password, registerForm.name);
      setRegisterForm(REGISTER_INITIAL_STATE);

      // Reset toàn bộ navigation stack, buộc tất cả tabs re-mount
      router.replace('/(tabs)');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Đăng ký thất bại';
      Alert.alert('Lỗi', errorMsg);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      Alert.alert('Chủ ý', 'Cần cài đặt Google Sign-In SDK. Xem tài liệu @react-native-google-signin/google-signin');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Đăng nhập Google thất bại';
      Alert.alert('Lỗi', errorMsg);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Background Glows */}
      <View style={styles.glowTopLeft} />
      <View style={styles.glowBottomRight} />

      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Header with Brand */}
          <View style={styles.headerSection}>
            <View style={styles.brandContainer}>
              <Image
                source={require('@/assets/images/logo2.png')}
                style={styles.brandLogo}
                contentFit="contain"
              />
              <View>
                <Text style={styles.brandTitle}>
                  Auto<Text style={styles.brandAccent}>Wash</Text>
                </Text>
                <Text style={styles.brandSubtitle}>Rửa xe thông minh</Text>
              </View>
            </View>
          </View>

          {/* Promo Panel */}
          <View style={[styles.promoPanel, { marginBottom: 16 }]}>
            <View style={styles.promoGlow} />
            <View style={styles.promoContent}>
              <View style={styles.promoBadge}>
                <MaterialCommunityIcons name="gift-outline" size={14} color="#A5F3FC" />
                <Text style={styles.promoBadgeText}>Ưu đãi thành viên</Text>
              </View>

              <Text style={styles.promoTitle}>
                {isLogin ? AUTH_PROMO_COPY.loginTitle : AUTH_PROMO_COPY.registerTitle}
                {'\n'}
                <Text style={styles.promoHighlight}>
                  {isLogin ? AUTH_PROMO_COPY.loginHighlight : AUTH_PROMO_COPY.registerHighlight}
                </Text>
              </Text>

              <Text style={styles.promoDesc}>
                {isLogin ? AUTH_PROMO_COPY.loginDesc : AUTH_PROMO_COPY.registerDesc}
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Segmented Control */}
            <View style={styles.segmentedControl}>
              <Pressable
                onPress={() => switchMode('login')}
                style={[styles.segmentButton, isLogin && styles.segmentButtonActive]}>
                <Text style={[styles.segmentText, isLogin && styles.segmentTextActive]}>
                  Đăng nhập
                </Text>
              </Pressable>
              <Pressable
                onPress={() => switchMode('register')}
                style={[styles.segmentButton, !isLogin && styles.segmentButtonActive]}>
                <Text style={[styles.segmentText, !isLogin && styles.segmentTextActive]}>
                  Đăng ký
                </Text>
              </Pressable>
            </View>

            {/* Login Form */}
            {isLogin ? (
              <View style={styles.formBlock}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    value={loginForm.email}
                    onChangeText={(email) => setLoginForm((prev) => ({ ...prev, email }))}
                    placeholder="ban@email.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!loading}
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Mật khẩu</Text>
                  <TextInput
                    value={loginForm.password}
                    onChangeText={(password) => setLoginForm((prev) => ({ ...prev, password }))}
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    autoComplete="password"
                    editable={!loading}
                    style={styles.input}
                  />
                </View>

                <View style={styles.checkboxRow}>
                  <Pressable
                    onPress={() =>
                      setLoginForm((prev) => ({ ...prev, remember: !prev.remember }))
                    }
                    style={styles.rememberContainer}
                    disabled={loading}>
                    <View style={[styles.checkbox, loginForm.remember && styles.checkboxChecked]}>
                      {loginForm.remember ? (
                        <MaterialCommunityIcons name="check" size={12} color="#0F172A" />
                      ) : null}
                    </View>
                    <Text style={styles.rememberLabel}>Ghi nhớ đăng nhập</Text>
                  </Pressable>

                  <Pressable disabled={loading}>
                    <Text style={styles.forgotLink}>Quên mật khẩu?</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleLoginSubmit}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && !loading && styles.primaryButtonPressed,
                    loading && styles.primaryButtonDisabled,
                  ]}>
                  <Text style={styles.primaryButtonText}>
                    {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.formBlock}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Họ và tên</Text>
                  <TextInput
                    value={registerForm.name}
                    onChangeText={(name) => setRegisterForm((prev) => ({ ...prev, name }))}
                    placeholder="Nguyễn Văn A"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    editable={!loading}
                    style={styles.input}
                  />
                  <Text style={styles.helperText}>Tối thiểu 3 ký tự</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    value={registerForm.email}
                    onChangeText={(email) => setRegisterForm((prev) => ({ ...prev, email }))}
                    placeholder="ban@email.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!loading}
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Mật khẩu</Text>
                  <TextInput
                    value={registerForm.password}
                    onChangeText={(password) =>
                      setRegisterForm((prev) => ({ ...prev, password }))
                    }
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    autoComplete="new-password"
                    editable={!loading}
                    style={styles.input}
                  />
                  <Text style={styles.helperText}>Tối thiểu 6 ký tự</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Nhập lại mật khẩu</Text>
                  <View
                    style={[
                      styles.input,
                      registerForm.confirmPassword.length > 0 &&
                        (passwordsMatch
                          ? { borderColor: '#06B6D4' }
                          : { borderColor: '#EF4444' }),
                    ]}>
                    <TextInput
                      value={registerForm.confirmPassword}
                      onChangeText={(confirmPassword) =>
                        setRegisterForm((prev) => ({ ...prev, confirmPassword }))
                      }
                      placeholder="••••••••"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                      autoComplete="new-password"
                      editable={!loading}
                      style={styles.inputText}
                    />
                    {passwordsMatch ? (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={18}
                        color="#06B6D4"
                        style={styles.inputIcon}
                      />
                    ) : null}
                  </View>
                  {registerForm.confirmPassword.length > 0 && !passwordsMatch && (
                    <Text style={styles.errorText}>Không khớp</Text>
                  )}
                </View>

                <Pressable
                  onPress={handleRegisterSubmit}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && !loading && styles.primaryButtonPressed,
                    loading && styles.primaryButtonDisabled,
                  ]}>
                  <Text style={styles.primaryButtonText}>
                    {loading ? 'Đang xử lý...' : 'Đăng ký'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Benefits Section */}
          <View style={styles.benefitsSection}>
            <View style={styles.benefitsHeader}>
              <View style={styles.benefitsIcon}>
                <MaterialCommunityIcons name="check-all" size={18} color="#0EA5B7" />
              </View>
              <Text style={styles.benefitsTitle}>Tại sao chọn AutoWash?</Text>
            </View>

            <View style={styles.benefitsList}>
              {BENEFITS.map((benefit, idx) => (
                <View key={idx} style={styles.benefitItem}>
                  <View style={styles.benefitDot} />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
  },

  keyboardWrap: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 14,
  },

  /* Background Glows */
  glowTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
    opacity: 1,
  },

  glowBottomRight: {
    position: 'absolute',
    bottom: -100,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    opacity: 1,
  },

  /* Header Section */
  headerSection: {
    paddingVertical: 8,
    paddingBottom: 12,
  },

  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  brandLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(6, 182, 212, 0.3)',
  },

  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  brandAccent: {
    color: '#06B6D4',
  },

  brandSubtitle: {
    fontSize: 12,
    color: 'rgba(200, 215, 230, 0.9)',
    marginTop: 2,
  },

  /* Promo Panel */
  promoPanel: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#1a2f3f',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    overflow: 'hidden',
  },

  promoGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
  },

  promoContent: {
    gap: 10,
  },

  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },

  promoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  promoTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 28,
  },

  promoHighlight: {
    color: '#06B6D4',
  },

  promoDesc: {
    fontSize: 13,
    color: '#B3E5FC',
    lineHeight: 19,
    fontWeight: '500',
  },

  /* Form Card */
  formCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#FFFFFF',
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },

  /* Segmented Control */
  segmentedControl: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    backgroundColor: '#F0F4F8',
    gap: 4,
  },

  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  segmentButtonActive: {
    backgroundColor: '#06B6D4',
  },

  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },

  segmentTextActive: {
    color: '#FFFFFF',
  },

  /* Form Block */
  formBlock: {
    gap: 10,
  },

  fieldGroup: {
    gap: 6,
  },

  label: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  input: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#111827',
    fontSize: 14,
  },

  inputText: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    paddingVertical: 10,
  },

  inputIcon: {
    marginRight: 8,
  },

  helperText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },

  errorText: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 2,
  },

  checkboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },

  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },

  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },

  rememberLabel: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },

  forgotLink: {
    color: '#06B6D4',
    fontSize: 12,
    fontWeight: '700',
  },

  primaryButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#06B6D4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },

  primaryButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },

  primaryButtonDisabled: {
    opacity: 0.65,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* Benefits Section */
  benefitsSection: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    gap: 10,
    marginBottom: 8,
  },

  benefitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  benefitsIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  benefitsTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  benefitsList: {
    gap: 8,
  },

  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },

  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#06B6D4',
    marginTop: 6,
    flexShrink: 0,
  },

  benefitText: {
    flex: 1,
    color: '#E0E7FF',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
});