import React, { useRef } from 'react';
import { Link } from 'expo-router';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export type ProfileModalType = 'edit' | 'password' | 'logout' | null;

export interface ProfileEditForm { full_name: string; phone: string; }
export interface ProfilePasswordForm { oldPassword: string; newPassword: string; confirmPassword: string; }
export interface ProfileModalsProps {
  visibleType: ProfileModalType;
  onClose: () => void;
  loading: boolean;
  editForm: ProfileEditForm;
  setEditForm: React.Dispatch<React.SetStateAction<ProfileEditForm>>;
  avatarUri: string | null | undefined;
  onPickImage: () => void;
  onSubmitEdit: () => void;
  passwordForm: ProfilePasswordForm;
  setPasswordForm: React.Dispatch<React.SetStateAction<ProfilePasswordForm>>;
  onSubmitPassword: () => void;
  onLogout: () => void;
}

const CYAN = '#06B6D4';
const DARK = '#0F172A';
const GRAY = '#64748B';
const BG = '#F1F5F9';

function StyledInput({
  label, value, onChangeText, placeholder, secureTextEntry, keyboardType, error, icon,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; secureTextEntry?: boolean; keyboardType?: any;
  error?: boolean; icon?: string;
}) {
  return (
    <View style={inputStyles.group}>
      <Text style={inputStyles.label}>{label}</Text>
      <View style={[inputStyles.inputWrap, error && inputStyles.inputWrapError]}>
        {icon && <MaterialCommunityIcons name={icon as any} size={18} color={error ? '#EF4444' : GRAY} style={inputStyles.icon} />}
        <TextInput
          style={inputStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
        />
      </View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  group: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: GRAY, marginBottom: 6, letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 12, backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
  },
  inputWrapError: { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.04)' },
  icon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 14, color: DARK },
});

function ModalShell({ visible, onClose, loading, title, icon, children }: {
  visible: boolean; onClose: () => void; loading: boolean;
  title: string; icon: string; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={shellStyles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={shellStyles.sheet}>
            {/* Handle bar */}
            <View style={shellStyles.handle} />

            {/* Header */}
            <View style={shellStyles.header}>
              <View style={shellStyles.titleRow}>
                <View style={shellStyles.titleIcon}>
                  <MaterialCommunityIcons name={icon as any} size={18} color={CYAN} />
                </View>
                <Text style={shellStyles.title}>{title}</Text>
              </View>
              <Pressable
                onPress={onClose} disabled={loading}
                style={({ pressed }) => [shellStyles.closeBtn, pressed && { opacity: 0.6 }]}>
                <MaterialCommunityIcons name="close" size={18} color={GRAY} />
              </Pressable>
            </View>

            <ScrollView
              style={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {children}
              <View style={{ height: Platform.OS === 'ios' ? 34 : 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const shellStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '90%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(6,182,212,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: DARK },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
});

function ProfileEditModal(props: {
  visible: boolean; onClose: () => void; loading: boolean;
  editForm: ProfileEditForm; setEditForm: React.Dispatch<React.SetStateAction<ProfileEditForm>>;
  avatarUri: string | null | undefined; onPickImage: () => void; onSubmitEdit: () => void;
}) {
  const { visible, onClose, loading, editForm, setEditForm, avatarUri, onPickImage, onSubmitEdit } = props;
  const initial = editForm.full_name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <ModalShell visible={visible} onClose={onClose} loading={loading} title="Chỉnh sửa thông tin" icon="account-edit-outline">
      {/* Avatar picker */}
      <View style={editStyles.avatarSection}>
        <View style={editStyles.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={editStyles.avatar} contentFit="cover" />
          ) : (
            <View style={editStyles.avatarFallback}>
              <Text style={editStyles.avatarInitial}>{initial}</Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={onPickImage} disabled={loading}
          style={({ pressed }) => [editStyles.changePhotoBtn, pressed && { opacity: 0.7 }]}>
          <MaterialCommunityIcons name="camera-outline" size={15} color={CYAN} />
          <Text style={editStyles.changePhotoText}>Thay ảnh đại diện</Text>
        </Pressable>
      </View>

      <StyledInput
        label="Họ và tên"
        value={editForm.full_name}
        onChangeText={(t) => setEditForm(c => ({ ...c, full_name: t }))}
        placeholder="Nhập họ và tên"
        icon="account-outline"
      />
      <StyledInput
        label="Số điện thoại"
        value={editForm.phone}
        onChangeText={(t) => setEditForm(c => ({ ...c, phone: t }))}
        placeholder="Nhập số điện thoại"
        keyboardType="phone-pad"
        icon="phone-outline"
      />

      <Pressable
        style={({ pressed }) => [editStyles.submitBtn, loading && editStyles.submitBtnDisabled, pressed && { opacity: 0.85 }]}
        disabled={loading}
        onPress={onSubmitEdit}>
        {loading
          ? <Text style={editStyles.submitText}>Đang lưu...</Text>
          : <>
              <MaterialCommunityIcons name="check" size={18} color="#fff" />
              <Text style={editStyles.submitText}>Lưu thay đổi</Text>
            </>
        }
      </Pressable>
    </ModalShell>
  );
}

const editStyles = StyleSheet.create({
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarWrap: { marginBottom: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: CYAN },
  avatarFallback: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(6,182,212,0.12)',
    borderWidth: 3, borderColor: CYAN,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 30, fontWeight: '800', color: CYAN },
  changePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: CYAN,
    backgroundColor: 'rgba(6,182,212,0.06)',
  },
  changePhotoText: { fontSize: 13, fontWeight: '700', color: CYAN },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: CYAN,
    paddingVertical: 14, borderRadius: 14, marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

function ProfilePasswordModal(props: {
  visible: boolean; onClose: () => void; loading: boolean;
  passwordForm: ProfilePasswordForm;
  setPasswordForm: React.Dispatch<React.SetStateAction<ProfilePasswordForm>>;
  onSubmitPassword: () => void;
}) {
  const { visible, onClose, loading, passwordForm, setPasswordForm, onSubmitPassword } = props;
  const mismatch = !!passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword;

  return (
    <ModalShell visible={visible} onClose={onClose} loading={loading} title="Đổi mật khẩu" icon="lock-outline">
      <StyledInput
        label="Mật khẩu hiện tại"
        value={passwordForm.oldPassword}
        onChangeText={(t) => setPasswordForm(c => ({ ...c, oldPassword: t }))}
        placeholder="Nhập mật khẩu hiện tại"
        secureTextEntry
        icon="lock-outline"
      />
      <StyledInput
        label="Mật khẩu mới"
        value={passwordForm.newPassword}
        onChangeText={(t) => setPasswordForm(c => ({ ...c, newPassword: t }))}
        placeholder="Tối thiểu 6 ký tự"
        secureTextEntry
        icon="lock-reset"
      />
      <View style={pwStyles.group}>
        <Text style={pwStyles.label}>Xác nhận mật khẩu mới</Text>
        <View style={[inputStyles.inputWrap, mismatch && inputStyles.inputWrapError]}>
          <MaterialCommunityIcons name="lock-check-outline" size={18} color={mismatch ? '#EF4444' : GRAY} style={inputStyles.icon} />
          <TextInput
            style={inputStyles.input}
            value={passwordForm.confirmPassword}
            onChangeText={(t) => setPasswordForm(c => ({ ...c, confirmPassword: t }))}
            placeholder="Nhập lại mật khẩu mới"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>
        {mismatch && (
          <View style={pwStyles.errorRow}>
            <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#EF4444" />
            <Text style={pwStyles.errorText}>Mật khẩu không khớp</Text>
          </View>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [pwStyles.submitBtn, (loading || mismatch) && pwStyles.submitBtnDisabled, pressed && { opacity: 0.85 }]}
        disabled={loading || mismatch}
        onPress={onSubmitPassword}>
        {loading
          ? <Text style={pwStyles.submitText}>Đang xử lý...</Text>
          : <>
              <MaterialCommunityIcons name="shield-check-outline" size={18} color="#fff" />
              <Text style={pwStyles.submitText}>Đổi mật khẩu</Text>
            </>
        }
      </Pressable>
    </ModalShell>
  );
}

const pwStyles = StyleSheet.create({
  group: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: GRAY, marginBottom: 6, letterSpacing: 0.3 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  errorText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#8B5CF6',
    paddingVertical: 14, borderRadius: 14, marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

export function ProfileLogoutModal(props: {
  visible: boolean; onClose: () => void; loading: boolean; onLogout: () => void;
}) {
  return (
    <ModalShell visible={props.visible} onClose={props.onClose} loading={props.loading} title="Đăng xuất" icon="logout-variant">
      <View style={logoutStyles.container}>
        <View style={logoutStyles.iconCircle}>
          <MaterialCommunityIcons name="logout-variant" size={32} color="#EF4444" />
        </View>
        <Text style={logoutStyles.title}>Bạn có chắc chắn?</Text>
        <Text style={logoutStyles.subtitle}>
          Bạn đang thao tác đăng xuất khỏi hệ thống. Bạn có muốn tiếp tục không?
        </Text>

        <View style={logoutStyles.buttonRow}>
          <Pressable
            style={({ pressed }) => [logoutStyles.cancelBtn, pressed && logoutStyles.btnPressed]}
            onPress={props.onClose}
            disabled={props.loading}>
            <Text style={logoutStyles.cancelText}>Hủy</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [logoutStyles.confirmBtn, pressed && logoutStyles.btnPressed]}
            onPress={props.onLogout}
            disabled={props.loading}>
            <Text style={logoutStyles.confirmText}>
              {props.loading ? 'Đang xử lý...' : 'Đăng xuất'}
            </Text>
          </Pressable>
        </View>
      </View>
    </ModalShell>
  );
}

const logoutStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: DARK,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: GRAY,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.8,
  },
});

export function ProfileModals(props: ProfileModalsProps) {
  return (
    <>
      <ProfileEditModal
        visible={props.visibleType === 'edit'}
        onClose={props.onClose}
        loading={props.loading}
        editForm={props.editForm}
        setEditForm={props.setEditForm}
        avatarUri={props.avatarUri}
        onPickImage={props.onPickImage}
        onSubmitEdit={props.onSubmitEdit}
      />
      <ProfilePasswordModal
        visible={props.visibleType === 'password'}
        onClose={props.onClose}
        loading={props.loading}
        passwordForm={props.passwordForm}
        setPasswordForm={props.setPasswordForm}
        onSubmitPassword={props.onSubmitPassword}
      />
      <ProfileLogoutModal
        visible={props.visibleType === 'logout'}
        onClose={props.onClose}
        loading={props.loading}
        onLogout={props.onLogout}
      />
    </>
  );
}

export default function ModalScreen() {
  return (
    <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <ThemedText type="title">Modal helpers</ThemedText>
      <ThemedText>Reusable profile modals live here.</ThemedText>
      <Link href="/" dismissTo style={{ marginTop: 15, paddingVertical: 15 }}>
        <ThemedText type="link">Go to home screen</ThemedText>
      </Link>
    </ThemedView>
  );
}