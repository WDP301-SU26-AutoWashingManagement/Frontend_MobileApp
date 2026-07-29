import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { makeRedirectUri, Prompt } from 'expo-auth-session';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, Modal, ScrollView, StyleSheet, Text, TextInput, View, Linking,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
// Use the SessionUrlProvider to build the proxied auth.expo.io start URL when
// running in Expo Go. This avoids exp:// redirect_uri errors from providers
// that require allowlisted HTTPS redirect URLs (like Google).
import sessionUrlProvider from 'expo-auth-session/build/SessionUrlProvider';
import { API_CONFIG, FEATURES } from '../../config/app.config';
import { useAuth } from '../../hooks/useAuthService';

WebBrowser.maybeCompleteAuthSession();

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
  registerHighlight: 'HybridWash',
  registerDesc: 'Bắt đầu hành trình rửa xe thông minh của bạn hôm nay',
};

const LOGIN_INITIAL_STATE = {
  email: '',
  password: '',
  remember: true,
};



const FORGOT_PASSWORD_INITIAL_STATE = {
  email: '',
  otp: '',
  newPassword: '',
  confirmPassword: '',
};

type ForgotPasswordStep = 'email' | 'otp' | 'reset';

export default function TabTwoScreen() {
  const router = useRouter();
  const [loginForm, setLoginForm] = useState(LOGIN_INITIAL_STATE);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotPasswordStep>('email');
  const [forgotForm, setForgotForm] = useState(FORGOT_PASSWORD_INITIAL_STATE);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const {
    login: authLogin,
    loginWithGoogle: authLoginWithGoogle,
    forgotPassword: authForgotPassword,
    verifyOtp: authVerifyOtp,
    resetPassword: authResetPassword,
    loading,
    error,
    clearError,
  } = useAuth();
  const isExpoGo = Constants.appOwnership === 'expo';
  const showGoogleLogin = FEATURES.ENABLE_GOOGLE_LOGIN && Platform.OS !== 'web';
  const projectNameForProxy = '@thai5236/HybridWash';
  const returnUrl = makeRedirectUri({ path: 'oauthredirect' });
  let proxyRedirectUri = returnUrl;
  if (isExpoGo) {
    try {
      proxyRedirectUri = sessionUrlProvider.getRedirectUrl({ projectNameForProxy, urlPath: 'oauthredirect' });
    } catch (e) {
      // If we cannot build the proxy redirect URL, keep the default redirectUri
      // so app doesn't crash — we'll log the error to help debugging.
      // eslint-disable-next-line no-console
      console.warn('Could not construct proxy redirect URL, falling back to app return URL', e);
    }
  }

  const [request] = Google.useAuthRequest({
    clientId: isExpoGo ? API_CONFIG.GOOGLE_CLIENT_ID.web || undefined : undefined,
    webClientId: API_CONFIG.GOOGLE_CLIENT_ID.web || undefined,
    iosClientId: isExpoGo ? undefined : API_CONFIG.GOOGLE_CLIENT_ID.ios || undefined,
    androidClientId: isExpoGo ? undefined : API_CONFIG.GOOGLE_CLIENT_ID.android || undefined,
    redirectUri: proxyRedirectUri,
    selectAccount: true,
    prompt: Prompt.SelectAccount,
    scopes: ['openid', 'profile', 'email'],
    responseType: 'id_token',
  });

  const openForgotPassword = () => {
    clearError();
    setForgotForm((prev) => ({
      ...FORGOT_PASSWORD_INITIAL_STATE,
      email: loginForm.email.trim() || prev.email,
    }));
    setForgotStep('email');
    setForgotVisible(true);
  };

  const closeForgotPassword = () => {
    setForgotVisible(false);
    setForgotStep('email');
    setForgotForm(FORGOT_PASSWORD_INITIAL_STATE);
    clearError();
  };

  // --- CHỨC NĂNG 1: GỬI EMAIL YÊU CẦU QUÊN MẬT KHẨU (NHẬN OTP) ---
  const handleForgotPasswordSubmit = async () => {
    const email = forgotForm.email.trim();
    if (!email) {
      Alert.alert('Thiếu email', 'Vui lòng nhập email để nhận mã OTP.');
      return;
    }

    try {
      // Gọi API gửi yêu cầu OTP khôi phục mật khẩu về email người dùng
      await authForgotPassword(email);
      // Chuyển Modal khôi phục mật khẩu sang Bước 2: Nhập OTP
      setForgotStep('otp');
      Alert.alert('Đã gửi OTP', 'Nếu email tồn tại, mã OTP đã được gửi tới hộp thư của bạn.');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Không thể gửi OTP';
      Alert.alert('Lỗi', errorMsg);
    }
  };

  // --- CHỨC NĂNG 2: XÁC MINH MÃ OTP NHẬP VÀO ---
  const handleVerifyOtpSubmit = async () => {
    const email = forgotForm.email.trim();
    const otp = forgotForm.otp.trim();

    if (!otp) {
      Alert.alert('Thiếu OTP', 'Vui lòng nhập mã OTP gồm 6 ký tự.');
      return;
    }

    try {
      // Gọi API xác thực OTP từ người dùng
      await authVerifyOtp(email, otp);
      // Chuyển Modal khôi phục mật khẩu sang Bước 3: Đặt mật khẩu mới
      setForgotStep('reset');
      Alert.alert('OTP hợp lệ', 'Nhập mật khẩu mới để hoàn tất.');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'OTP không hợp lệ';
      Alert.alert('Lỗi', errorMsg);
    }
  };

  // --- CHỨC NĂNG 3: ĐẶT MẬT KHẨU MỚI (SAU KHI XÁC MINH OTP THÀNH CÔNG) ---
  const handleResetPasswordSubmit = async () => {
    const email = forgotForm.email.trim();
    const otp = forgotForm.otp.trim();
    const newPassword = forgotForm.newPassword.trim();
    const confirmPassword = forgotForm.confirmPassword.trim();

    // Kiểm tra độ dài mật khẩu mới tối thiểu 6 ký tự
    if (newPassword.length < 6) {
      Alert.alert('Mật khẩu không hợp lệ', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    // Đảm bảo mật khẩu nhập lại trùng khớp
    if (newPassword !== confirmPassword) {
      Alert.alert('Mật khẩu không khớp', 'Vui lòng nhập lại đúng mật khẩu mới.');
      return;
    }

    try {
      // Gọi API cập nhật mật khẩu mới của người dùng lên Backend
      await authResetPassword(email, otp, newPassword);
      Alert.alert('Thành công', 'Mật khẩu đã được đặt lại. Vui lòng đăng nhập lại.');
      // Đóng modal quên mật khẩu
      closeForgotPassword();
      // Điền sẵn email vừa khôi phục vào ô nhập email đăng nhập
      setLoginForm((prev) => ({ ...prev, email }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại';
      Alert.alert('Lỗi', errorMsg);
    }
  };

  // --- CHỨC NĂNG 4: GỬI LẠI MÃ OTP ---
  const handleResendOtp = async () => {
    const email = forgotForm.email.trim();
    if (!email) {
      Alert.alert('Thiếu email', 'Vui lòng nhập email trước khi gửi lại OTP.');
      return;
    }

    try {
      // Gửi lại mã OTP mới về email
      await authForgotPassword(email);
      Alert.alert('Đã gửi lại OTP', 'Mã mới đã được gửi tới email của bạn.');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Không thể gửi lại OTP';
      Alert.alert('Lỗi', errorMsg);
    }
  };

  // --- CHỨC NĂNG 5: ĐĂNG NHẬP THƯỜNG (BẰNG EMAIL VÀ MẬT KHẨU) ---
  const handleLoginSubmit = async () => {
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu.');
      return;
    }

    try {
      // Gọi API đăng nhập bằng Email và Password
      await authLogin(loginForm.email, loginForm.password);
      setLoginForm(LOGIN_INITIAL_STATE);

      // Reset toàn bộ navigation stack của Expo Router, buộc tất cả các Tabs tải lại dữ liệu mới
      router.replace('/(tabs)');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Đăng nhập thất bại';
      Alert.alert('Lỗi', errorMsg);
    }
  };



  // --- LUỒNG XỬ LÝ ĐĂNG NHẬP BẰNG GOOGLE ---
  const handleGoogleLogin = async () => {
    // 1. Kiểm tra tính khả dụng của tính năng Google Sign-In cấu hình trong app
    if (!showGoogleLogin) {
      Alert.alert('Không hỗ trợ', 'Google Sign-In không khả dụng trên nền tảng này.');
      return;
    }

    try {
      // 2. Đảm bảo cấu hình request Google Auth (do hook Google.useAuthRequest tạo ra) đã sẵn sàng
      if (!request?.url) {
        Alert.alert('Đang tải', 'Vui lòng đợi Google Sign-In khởi tạo xong rồi thử lại.');
        return;
      }

      // 3. Tạo startUrl xác thực Google thông qua Session Proxy của Expo (auth.expo.io)
      // Điều này bắt buộc khi chạy trong môi trường Expo Go để vượt qua hạn chế HTTPS redirect của Google
      const startUrl = sessionUrlProvider.getStartUrl(request.url, returnUrl, projectNameForProxy);

      // eslint-disable-next-line no-console
      console.log('Auth startUrl:', startUrl);
      // eslint-disable-next-line no-console
      console.log('Auth request.url:', request.url);
      // eslint-disable-next-line no-console
      console.log('Auth proxyRedirectUri:', proxyRedirectUri);
      // eslint-disable-next-line no-console
      console.log('Auth returnUrl:', returnUrl);

      // 4. Kích hoạt In-app Browser để người dùng chọn tài khoản Google & đăng nhập
      const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);

      // 5. Nếu người dùng tắt trình duyệt giữa chừng hoặc không thành công -> dừng luồng
      if (result.type !== 'success') {
        return;
      }

      // 6. Phân tích URL redirect trả về từ trình duyệt để lấy tham số xác thực
      const parsed = request.parseReturnUrl(result.url);
      console.log('🔐 [GoogleLogin] result.url:', result.url);
      console.log('🔐 [GoogleLogin] parsed:', parsed);
      if (parsed.type !== 'success') {
        Alert.alert('Lỗi', 'Google trả về lỗi đăng nhập. Vui lòng thử lại.');
        return;
      }

      // 7. Trích xuất ID Token của Google từ kết quả redirect thành công
      const idToken =
        parsed.params?.id_token ||
        parsed.params?.idToken ||
        parsed.authentication?.idToken ||
        null;

      if (!idToken) {
        Alert.alert('Lỗi', 'Không lấy được Google ID Token');
        return;
      }

      // 8. Gửi ID Token lên Backend của HybridWash để xác thực, đồng bộ tài khoản & lấy Token riêng của hệ thống
      await authLoginWithGoogle(idToken);
      
      // 9. Reset biểu mẫu đăng nhập thường và chuyển hướng người dùng vào tab Home
      setLoginForm(LOGIN_INITIAL_STATE);
      router.replace('/(tabs)');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Đăng nhập Google thất bại';
      Alert.alert('Lỗi', errorMsg);
    }
  };

  // Debug: log incoming deep links and auth response changes to diagnose
  // why the app might not receive the token after returning from auth.expo.io.
  useEffect(() => {
    const onUrl = ({ url }: { url: string }) => {
      // eslint-disable-next-line no-console
      console.log('[Linking] incoming url:', url);
      if (__DEV__) {
        try {
          Alert.alert('Incoming deep link', url);
        } catch { }
      }
    };

    const subscription = Linking.addEventListener('url', onUrl);

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Top Curved Figma-style Header */}
          <View style={styles.headerBackground}>
            {/* Soft Blue and Slate Blue Bubble Shapes */}
            <View style={styles.blueBubble} />
            <View style={styles.darkBubble} />

            <View style={styles.logoWrapper}>
              <Image
                source={require('@/assets/images/logo2.png')}
                style={styles.logoImage}
                contentFit="contain"
              />
            </View>
          </View>

          {/* Welcome Titles */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Chào mừng trở lại!</Text>
            <Text style={styles.welcomeSubtitle}>Đăng nhập vào tài khoản của bạn</Text>
          </View>

          {/* Form Content */}
          <View style={styles.formCard}>
              {/* LOGIN FORM */}
              <View style={styles.formBlock}>
                {/* Email field */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="email-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      value={loginForm.email}
                      onChangeText={(email) => setLoginForm((prev) => ({ ...prev, email }))}
                      placeholder="ban@email.com"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      editable={!loading}
                      style={styles.textInput}
                    />
                  </View>
                </View>

                {/* Password field */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Mật khẩu</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="lock-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      value={loginForm.password}
                      onChangeText={(password) => setLoginForm((prev) => ({ ...prev, password }))}
                      placeholder="••••••••"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      editable={!loading}
                      style={styles.textInput}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                      <MaterialCommunityIcons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#9CA3AF"
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Remember & Forgot Password Row */}
                <View style={styles.checkboxRow}>
                  <Pressable
                    onPress={() =>
                      setLoginForm((prev) => ({ ...prev, remember: !prev.remember }))
                    }
                    style={styles.rememberContainer}
                    disabled={loading}>
                    <View style={[styles.checkbox, loginForm.remember && styles.checkboxChecked]}>
                      {loginForm.remember ? (
                        <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                      ) : null}
                    </View>
                    <Text style={styles.rememberLabel}>Ghi nhớ đăng nhập</Text>
                  </Pressable>

                  <Pressable onPress={openForgotPassword} disabled={loading}>
                    <Text style={styles.forgotLink}>Quên mật khẩu?</Text>
                  </Pressable>
                </View>

                {/* Login Button */}
                <Pressable
                  onPress={handleLoginSubmit}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && !loading && styles.primaryButtonPressed,
                    loading && styles.primaryButtonDisabled,
                  ]}>
                  <Text style={styles.primaryButtonText}>
                    {loading ? 'Đang xử lý...' : 'ĐĂNG NHẬP'}
                  </Text>
                </Pressable>

                {/* Social Login Row */}
                {showGoogleLogin ? (
                  <>
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>Hoặc đăng nhập với</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.socialRow}>
                      {/* <Pressable
                        style={styles.socialButton}
                        onPress={() => Alert.alert('Thông tin', 'Đăng nhập bằng Facebook sẽ sớm ra mắt!')}>
                        <MaterialCommunityIcons name="facebook" size={24} color="#1877F2" />
                      </Pressable> */}

                      <Pressable
                        style={styles.socialButton}
                        onPress={handleGoogleLogin}
                        disabled={!request || loading}>
                        <Image
                          source={require('@/assets/images/google_logo.png')}
                          style={{ width: 24, height: 24 }}
                          contentFit="contain"
                        />
                      </Pressable>
                      {/* 
                      <Pressable
                        style={styles.socialButton}
                        onPress={() => Alert.alert('Thông tin', 'Đăng nhập bằng Apple sẽ sớm ra mắt!')}>
                        <MaterialCommunityIcons name="apple" size={24} color="#000000" />
                      </Pressable> */}
                    </View>
                  </>
                ) : FEATURES.ENABLE_GOOGLE_LOGIN ? (
                  <Text style={styles.googleHint}>
                    Đăng nhập Google chỉ khả dụng trong native dev build, không phải Expo Go.
                  </Text>
                ) : null}
              </View>
          </View>

          {/* Forgot Password Modal */}
          <Modal visible={forgotVisible} transparent animationType="fade" onRequestClose={closeForgotPassword}>
            <View style={styles.modalOverlay}>
              <Pressable style={styles.modalBackdrop} onPress={closeForgotPassword} />

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalKeyboardWrap}>
                <View style={styles.modalCard}>
                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalTitle}>Khôi phục mật khẩu</Text>
                      <Text style={styles.modalSubtitle}>
                        {forgotStep === 'email'
                          ? 'Nhập email để nhận mã OTP'
                          : forgotStep === 'otp'
                            ? 'Xác minh mã OTP đã gửi'
                            : 'Tạo mật khẩu mới cho tài khoản'}
                      </Text>
                    </View>
                    <Pressable onPress={closeForgotPassword} style={styles.modalCloseButton}>
                      <MaterialCommunityIcons name="close" size={18} color="#1E293B" />
                    </Pressable>
                  </View>

                  <View style={styles.stepRow}>
                    {[
                      { key: 'email', label: 'Email' },
                      { key: 'otp', label: 'OTP' },
                      { key: 'reset', label: 'Mật khẩu' },
                    ].map((step, index) => {
                      const active = forgotStep === step.key;
                      const completed =
                        (step.key === 'email' && forgotStep !== 'email') ||
                        (step.key === 'otp' && forgotStep === 'reset');

                      return (
                        <View key={step.key} style={styles.stepItem}>
                          <View style={[styles.stepDot, active && styles.stepDotActive, completed && styles.stepDotDone]}>
                            {completed ? (
                              <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                            ) : (
                              <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{index + 1}</Text>
                            )}
                          </View>
                          <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{step.label}</Text>
                          {index < 2 ? <View style={[styles.stepLine, completed && styles.stepLineDone]} /> : null}
                        </View>
                      );
                    })}
                  </View>

                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.modalBody}>

                    {/* STEP 1: Enter Email */}
                    {forgotStep === 'email' ? (
                      <View style={styles.modalForm}>
                        <View style={styles.fieldGroup}>
                          <Text style={styles.inputLabel}>Email tài khoản</Text>
                          <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="email-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                              value={forgotForm.email}
                              onChangeText={(email) => setForgotForm((prev) => ({ ...prev, email }))}
                              placeholder="ban@email.com"
                              placeholderTextColor="#9CA3AF"
                              keyboardType="email-address"
                              autoCapitalize="none"
                              autoComplete="email"
                              editable={!loading}
                              style={styles.textInput}
                            />
                          </View>
                        </View>

                        <View style={styles.helperPanel}>
                          <MaterialCommunityIcons name="email-outline" size={18} color="#0EA5E9" />
                          <Text style={styles.helperPanelText}>
                            Hệ thống sẽ gửi OTP đến email này nếu tài khoản tồn tại.
                          </Text>
                        </View>

                        <Pressable
                          onPress={handleForgotPasswordSubmit}
                          disabled={loading}
                          style={({ pressed }) => [
                            styles.primaryButton,
                            pressed && !loading && styles.primaryButtonPressed,
                            loading && styles.primaryButtonDisabled,
                          ]}>
                          {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <Text style={styles.primaryButtonText}>GỬI MÃ OTP</Text>
                          )}
                        </Pressable>
                      </View>
                    ) : null}

                    {/* STEP 2: Verify OTP */}
                    {forgotStep === 'otp' ? (
                      <View style={styles.modalForm}>
                        <View style={styles.fieldGroup}>
                          <Text style={styles.inputLabel}>Email</Text>
                          <View style={[styles.inputWrapper, styles.inputDisabled]}>
                            <MaterialCommunityIcons name="email-outline" size={20} color="#64748B" style={styles.inputIcon} />
                            <TextInput
                              value={forgotForm.email}
                              editable={false}
                              style={[styles.textInput, { color: '#64748B' }]}
                            />
                          </View>
                        </View>

                        <View style={styles.fieldGroup}>
                          <Text style={styles.inputLabel}>Mã OTP</Text>
                          <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="numeric" size={20} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                              value={forgotForm.otp}
                              onChangeText={(otp) => setForgotForm((prev) => ({ ...prev, otp }))}
                              placeholder="123456"
                              placeholderTextColor="#9CA3AF"
                              keyboardType="number-pad"
                              maxLength={6}
                              autoComplete="one-time-code"
                              editable={!loading}
                              style={styles.textInput}
                            />
                          </View>
                        </View>

                        <View style={styles.inlineActions}>
                          <Pressable onPress={handleResendOtp} disabled={loading} style={styles.secondaryButton}>
                            <Text style={styles.secondaryButtonText}>GỬI LẠI OTP</Text>
                          </Pressable>

                          <Pressable
                            onPress={handleVerifyOtpSubmit}
                            disabled={loading}
                            style={({ pressed }) => [
                              styles.primaryButton,
                              styles.inlinePrimaryButton,
                              pressed && !loading && styles.primaryButtonPressed,
                              loading && styles.primaryButtonDisabled,
                            ]}>
                            {loading ? (
                              <ActivityIndicator color="#FFFFFF" />
                            ) : (
                              <Text style={styles.primaryButtonText}>XÁC MINH</Text>
                            )}
                          </Pressable>
                        </View>
                      </View>
                    ) : null}

                    {/* STEP 3: Reset Password */}
                    {forgotStep === 'reset' ? (
                      <View style={styles.modalForm}>
                        <View style={styles.fieldGroup}>
                          <Text style={styles.inputLabel}>Mật khẩu mới</Text>
                          <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="lock-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                              value={forgotForm.newPassword}
                              onChangeText={(newPassword) =>
                                setForgotForm((prev) => ({ ...prev, newPassword }))
                              }
                              placeholder="••••••••"
                              placeholderTextColor="#9CA3AF"
                              secureTextEntry={!showNewPassword}
                              autoComplete="new-password"
                              editable={!loading}
                              style={styles.textInput}
                            />
                            <Pressable onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeButton}>
                              <MaterialCommunityIcons
                                name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#9CA3AF"
                              />
                            </Pressable>
                          </View>
                        </View>

                        <View style={styles.fieldGroup}>
                          <Text style={styles.inputLabel}>Nhập lại mật khẩu mới</Text>
                          <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="lock-check-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                              value={forgotForm.confirmPassword}
                              onChangeText={(confirmPassword) =>
                                setForgotForm((prev) => ({ ...prev, confirmPassword }))
                              }
                              placeholder="••••••••"
                              placeholderTextColor="#9CA3AF"
                              secureTextEntry={!showConfirmNewPassword}
                              autoComplete="new-password"
                              editable={!loading}
                              style={styles.textInput}
                            />
                            <Pressable onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)} style={styles.eyeButton}>
                              <MaterialCommunityIcons
                                name={showConfirmNewPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#9CA3AF"
                              />
                            </Pressable>
                          </View>
                        </View>

                        <Pressable
                          onPress={handleResetPasswordSubmit}
                          disabled={loading}
                          style={({ pressed }) => [
                            styles.primaryButton,
                            pressed && !loading && styles.primaryButtonPressed,
                            loading && styles.primaryButtonDisabled,
                          ]}>
                          {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <Text style={styles.primaryButtonText}>ĐẶT LẠI MẬT KHẨU</Text>
                          )}
                        </Pressable>
                      </View>
                    ) : null}
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>

          {/* Benefits Section */}
          <View style={styles.benefitsSection}>
            <View style={styles.benefitsHeader}>
              <View style={styles.benefitsIcon}>
                <MaterialCommunityIcons name="check-all" size={18} color="#0EA5E9" />
              </View>
              <Text style={styles.benefitsTitle}>Tại sao chọn HybridWash?</Text>
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
    backgroundColor: '#FFFFFF',
  },

  keyboardWrap: {
    flex: 1,
  },

  content: {
    paddingBottom: 24,
  },

  /* Top Figma-style Curved Header */
  headerBackground: {
    height: 190,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 40 : 10,
  },

  blueBubble: {
    position: 'absolute',
    top: -50,
    left: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#E0F2FE', // Light blue shape
    opacity: 0.8,
  },

  darkBubble: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#78909C', // Slate grey curved shape
    opacity: 0.9,
  },

  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  logoImage: {
    width: 180,
    height: 180,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0284C7',
    marginTop: 8,
    letterSpacing: 1.5,
  },

  /* Welcome Section */
  welcomeSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },

  welcomeTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  welcomeSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 18,
  },

  /* Form Card Container */
  formCard: {
    paddingHorizontal: 20,
    gap: 16,
  },

  formBlock: {
    gap: 4,
  },

  fieldGroup: {
    gap: 4,
  },

  inputLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  inputWrapper: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F3F4F6', // Sleek light grey input field
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  inputDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },

  inputIcon: {
    marginRight: 10,
  },

  textInput: {
    flex: 1,
    height: '100%',
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },

  eyeButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },

  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },

  rememberLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },

  forgotLink: {
    color: '#0EA5E9',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Action Buttons */
  primaryButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 6,
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
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  /* Social Sign-In Divider & Buttons */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },

  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#F1F5F9',
  },

  dividerText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '800',
    marginHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },

  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },

  googleHint: {
    marginTop: 10,
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },

  /* Footer Links */
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },

  footerText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  footerLink: {
    fontSize: 13,
    color: '#0EA5E9',
    fontWeight: '800',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  modalKeyboardWrap: {
    width: '100%',
  },

  modalCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 20,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },

  modalTitle: {
    color: '#1E293B',
    fontSize: 18,
    fontWeight: '900',
  },

  modalSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
    fontWeight: '500',
  },

  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: {
    gap: 12,
    paddingTop: 8,
  },

  modalForm: {
    gap: 8,
  },

  helperPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    marginBottom: 8,
  },

  helperPanelText: {
    flex: 1,
    color: '#0369A1',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },

  inlineActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },

  secondaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  inlinePrimaryButton: {
    flex: 1,
    marginTop: 0,
  },

  /* Benefits Panel */
  benefitsSection: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#E0F2FE',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
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
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  benefitsTitle: {
    color: '#0369A1',
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
    borderRadius: 3,
    backgroundColor: '#0EA5E9',
    marginTop: 6,
    flexShrink: 0,
  },

  benefitText: {
    flex: 1,
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },

  /* Step Indicator styles */
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },

  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },

  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  stepDotActive: {
    backgroundColor: '#0EA5E9',
  },

  stepDotDone: {
    backgroundColor: '#10B981',
  },

  stepNumber: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },

  stepNumberActive: {
    color: '#FFFFFF',
  },

  stepLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '700',
  },

  stepLabelActive: {
    color: '#1E293B',
  },

  stepLine: {
    position: 'absolute',
    top: 14,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: '#E2E8F0',
    zIndex: 0,
  },

  stepLineDone: {
    backgroundColor: '#10B981',
  },
});