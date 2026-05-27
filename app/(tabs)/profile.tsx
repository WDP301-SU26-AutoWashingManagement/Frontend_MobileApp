

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '../../hooks/useAuthService';
// Use runtime require to avoid needing type declarations in this workspace
const ImagePicker: any = require('expo-image-picker');

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, loading, updateProfile, changePassword, error, clearError } = useAuth();
  const [avatarError, setAvatarError] = useState(false);
  const [modalType, setModalType] = useState<'edit' | 'password' | null>(null);

  const [editForm, setEditForm] = useState({ full_name: user?.full_name || '', phone: user?.phone || '' });
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleEditProfile = async () => {
    if (!editForm.full_name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên');
      return;
    }

    try {
      // If user picked a new image, send multipart/form-data
      if (localImage) {
        const form = new FormData();
        form.append('full_name', editForm.full_name);
        if (editForm.phone) form.append('phone', editForm.phone);

        const uriParts = localImage.split('.');
        const fileExt = uriParts[uriParts.length - 1];
        const mimeType = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : `image/${fileExt}`;

        // @ts-ignore - React Native FormData file shape
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
      if (!perm.granted) {
        Alert.alert('Quyền truy cập bị từ chối', 'Vui lòng cho phép truy cập ảnh để thay đổi avatar');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
      // Handle different result shapes across SDKs
      // @ts-ignore
      if (!result.cancelled && !result.canceled) {
        // older SDK: result.uri
        // @ts-ignore
        const uri = result.uri || (result.assets && result.assets[0]?.uri);
        if (uri) setLocalImage(uri);
      } else if (result.assets && result.assets.length > 0) {
        // newer SDK
        // @ts-ignore
        setLocalImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Image pick error', err);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.oldPassword.trim() || !passwordForm.newPassword.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

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

  return (
    <>
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user?.avatar_url && !avatarError ? (
            <Image
              source={{ uri: user.avatar_url }}
              style={styles.avatarImage}
              contentFit="cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.name}>{user?.full_name || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        
        {user?.is_email_verified && (
          <View style={styles.verifiedBadge}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#06B6D4" />
            <Text style={styles.verifiedText}>Đã xác minh</Text>
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="phone" size={20} color="#64748B" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Số điện thoại</Text>
            <Text style={styles.infoValue}>{user?.phone || 'Chưa cập nhật'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="shield-account" size={20} color="#64748B" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Vai trò</Text>
            <Text style={styles.infoValue}>{user?.role === 'customer' ? 'Khách hàng' : user?.role}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="calendar" size={20} color="#64748B" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Tham gia lúc</Text>
            <Text style={styles.infoValue}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionSection}>
        <Pressable 
          style={[styles.button, styles.editButton]}
          onPress={() => { setEditForm({ full_name: user?.full_name || '', phone: user?.phone || '' }); setModalType('edit'); }}
          disabled={loading}>
          <MaterialCommunityIcons name="pencil" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Chỉnh sửa thông tin</Text>
        </Pressable>

        <Pressable 
          style={[styles.button, styles.passwordButton]}
          onPress={() => { setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); setModalType('password'); }}
          disabled={loading}>
          <MaterialCommunityIcons name="lock" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Đổi mật khẩu</Text>
        </Pressable>

        <Pressable 
          style={[styles.button, styles.logoutButton]}
          disabled={loading}
          onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>{loading ? 'Đang đăng xuất...' : 'Đăng xuất'}</Text>
        </Pressable>
      </View>
    </ScrollView>

    {/* Edit Profile Modal */}
    <Modal visible={modalType === 'edit'} transparent animationType="slide" onRequestClose={() => setModalType(null)}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} style={styles.keyboardAvoiding}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>
              <Pressable onPress={() => setModalType(null)}><MaterialCommunityIcons name="close" size={24} color="#0F172A" /></Pressable>
            </View>
            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <Image source={{ uri: localImage || user?.avatar_url }} style={{ width: 84, height: 84, borderRadius: 42, marginBottom: 8 }} contentFit="cover" />
                <Pressable onPress={pickImage} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#06B6D4', borderRadius: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Thay đổi ảnh đại diện</Text>
                </Pressable>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tên</Text>
                <TextInput style={styles.input} placeholder="Nhập tên của bạn" value={editForm.full_name} onChangeText={(t) => setEditForm({ ...editForm, full_name: t })} placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Số điện thoại</Text>
                <TextInput style={styles.input} placeholder="Nhập số điện thoại" value={editForm.phone} onChangeText={(t) => setEditForm({ ...editForm, phone: t })} keyboardType="phone-pad" placeholderTextColor="#9CA3AF" />
              </View>
              <Pressable style={[styles.submitButton, loading && styles.submitButtonDisabled]} disabled={loading} onPress={handleEditProfile}><Text style={styles.submitButtonText}>{loading ? 'Đang lưu...' : 'Lưu thay đổi'}</Text></Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>

    {/* Change Password Modal */}
    <Modal visible={modalType === 'password'} transparent animationType="slide" onRequestClose={() => setModalType(null)}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} style={styles.keyboardAvoiding}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
              <Pressable onPress={() => setModalType(null)}><MaterialCommunityIcons name="close" size={24} color="#0F172A" /></Pressable>
            </View>
            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.label}>Mật khẩu hiện tại</Text>
                <TextInput style={styles.input} placeholder="Mật khẩu hiện tại" value={passwordForm.oldPassword} onChangeText={(t) => setPasswordForm({ ...passwordForm, oldPassword: t })} secureTextEntry placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Mật khẩu mới</Text>
                <TextInput style={styles.input} placeholder="Mật khẩu mới" value={passwordForm.newPassword} onChangeText={(t) => setPasswordForm({ ...passwordForm, newPassword: t })} secureTextEntry placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
                <TextInput style={[styles.input, passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && { borderColor: '#EF4444' }]} placeholder="Xác nhận mật khẩu" value={passwordForm.confirmPassword} onChangeText={(t) => setPasswordForm({ ...passwordForm, confirmPassword: t })} secureTextEntry placeholderTextColor="#9CA3AF" />
                {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (<Text style={styles.errorText}>Mật khẩu không khớp</Text>)}
              </View>
              <Pressable style={[styles.submitButton, loading && styles.submitButtonDisabled]} disabled={loading} onPress={handleChangePassword}><Text style={styles.submitButtonText}>{loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}</Text></Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    marginTop: 50,
  },

  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  avatarContainer: {
    marginBottom: 16,
  },

  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },

  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 2,
    borderColor: '#06B6D4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: '#06B6D4',
  },

  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },

  email: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },

  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },

  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#06B6D4',
  },

  infoSection: {
    marginTop: 16,
    marginHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },

  actionSection: {
    marginTop: 24,
    marginHorizontal: 12,
    gap: 12,
    marginBottom: 32,
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
  },

  editButton: {
    backgroundColor: '#06B6D4',
  },

  logoutButton: {
    backgroundColor: '#EF4444',
  },

  passwordButton: {
    backgroundColor: '#8B5CF6',
  },

  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  keyboardAvoiding: {
    flex: 1,
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 100,
    maxHeight: '90%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },

  modalForm: {
    padding: 16,
  },

  formGroup: {
    gap: 8,
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },

  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },

  submitButton: {
    backgroundColor: '#06B6D4',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },

  submitButtonDisabled: { opacity: 0.5 },

  submitButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  errorText: { fontSize: 12, fontWeight: '500', color: '#EF4444', marginTop: 4 },
});