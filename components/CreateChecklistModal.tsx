import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import bookingService from '../services/bookingService';

interface CreateChecklistModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_ITEMS = [
  'Bề mặt sơn (không trầy xước, móp méo)',
  'Kính chắn gió, kính sườn (nguyên vẹn)',
  'Gương chiếu hậu (đủ 2 bên, không vỡ)',
  'Lốp và mâm xe (không rách, biến dạng)',
  'Đồ cá nhân trên xe (đã nhắc khách tự bảo quản)',
  'Thảm lót sàn, nội thất (tình trạng ban đầu)'
];

const CYAN = '#0891B2';
const SURFACE = '#FFFFFF';
const DARK = '#1E293B';
const GRAY = '#64748B';

export default function CreateChecklistModal({ booking, isOpen, onClose, onSuccess }: CreateChecklistModalProps) {
  const [items, setItems] = useState(DEFAULT_ITEMS.map(label => ({ label, checked: false })));
  const [note, setNote] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const ref = useRef<SignatureViewRef>(null);

  const handleToggleItem = (index: number) => {
    const newItems = [...items];
    newItems[index].checked = !newItems[index].checked;
    setItems(newItems);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Cần cấp quyền truy cập thư viện ảnh để thêm ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      const selectedUris = result.assets.map(asset => asset.uri);
      setImages([...images, ...selectedUris]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const handleOK = (signatureData: string) => {
    setSignature(signatureData);
  };

  const handleClear = () => {
    setSignature(null);
  };

  const handleConfirm = () => {
    if (ref.current) {
      ref.current.readSignature();
    } else {
      submitChecklist();
    }
  };

  // Called when signature is read
  React.useEffect(() => {
    if (signature && isSubmitting) {
      submitChecklist();
    }
  }, [signature]);

  const submitChecklist = async () => {
    try {
      if (!isSubmitting) setIsSubmitting(true);
      const appointmentId = booking?._id || booking?.id;
      await bookingService.createChecklist(appointmentId, items, note, images, signature);
      Alert.alert('Thành công', 'Tạo biên bản đồng kiểm xe thành công');
      onSuccess();
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể tạo biên bản kiểm tra xe: ' + (error.message || 'Lỗi không xác định'));
      setIsSubmitting(false);
    }
  };

  const triggerSubmit = () => {
    setIsSubmitting(true);
    if (!signature && ref.current) {
      // Prompt signature canvas to read signature, which will trigger handleOK and the useEffect
      ref.current.readSignature();
    } else {
      submitChecklist();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Tạo Biên bản kiểm tra</Text>
              {booking && (
                <Text style={styles.headerSub}>
                  Biển số: {booking.vehicle?.license_plate || booking.vehicle_id?.license_plate || 'N/A'} - {booking.vehicle?.vehicle_model || booking.vehicle_id?.vehicle_model || ''}
                </Text>
              )}
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={DARK} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} scrollEnabled={scrollEnabled}>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="checkmark-circle-outline" size={16} color={CYAN} /> Các mục kiểm tra
              </Text>
              <View style={styles.itemsContainer}>
                {items.map((item, index) => (
                  <Pressable 
                    key={index} 
                    style={styles.checkItem}
                    onPress={() => handleToggleItem(index)}>
                    <MaterialCommunityIcons 
                      name={item.checked ? "checkbox-marked" : "checkbox-blank-outline"} 
                      size={24} 
                      color={item.checked ? CYAN : GRAY} 
                    />
                    <Text style={[styles.checkLabel, item.checked && { color: DARK }]}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="document-text-outline" size={16} color="#F59E0B" /> Ghi chú hiện trạng
              </Text>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={3}
                placeholder="Ghi chú về các vết xước, móp méo có sẵn..."
                value={note}
                onChangeText={setNote}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="image-outline" size={16} color="#10B981" /> Hình ảnh hiện trạng
              </Text>
              <Pressable style={styles.imagePickBtn} onPress={pickImage}>
                <Ionicons name="camera-outline" size={24} color="#10B981" />
                <Text style={styles.imagePickText}>Chọn ảnh từ thư viện</Text>
              </Pressable>
              {images.length > 0 && (
                <View style={styles.imagesGrid}>
                  {images.map((uri, idx) => (
                    <View key={idx} style={styles.imageContainer}>
                      <Image source={{ uri }} style={styles.imageThumb} />
                      <Pressable style={styles.imageRemove} onPress={() => removeImage(idx)}>
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="pencil-outline" size={16} color="#6366F1" /> Chữ ký khách hàng
              </Text>
              <View style={styles.signatureContainer}>
                <SignatureScreen
                  ref={ref}
                  onOK={handleOK}
                  onClear={handleClear}
                  onBegin={() => setScrollEnabled(false)}
                  onEnd={() => setScrollEnabled(true)}
                  descriptionText="Ký vào đây"
                  clearText="Xóa"
                  confirmText="Xác nhận"
                  webStyle={`
                    .m-signature-pad { box-shadow: none; border: none; margin: 0; padding: 0; }
                    .m-signature-pad--body { border: 1px solid #E2E8F0; border-radius: 8px; }
                    .m-signature-pad--footer { display: none; }
                  `}
                />
                <View style={styles.sigActions}>
                  <Pressable onPress={() => ref.current?.clearSignature()} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>Ký lại</Text>
                  </Pressable>
                </View>
              </View>
            </View>
            
            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable 
              style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} 
              onPress={triggerSubmit}
              disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color={SURFACE} />
              ) : (
                <Text style={styles.submitBtnText}>Xác nhận tạo biên bản</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DARK,
  },
  headerSub: {
    fontSize: 13,
    color: GRAY,
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  body: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
    marginBottom: 12,
  },
  itemsContainer: {
    gap: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkLabel: {
    marginLeft: 10,
    fontSize: 14,
    color: GRAY,
    fontWeight: '500',
    flex: 1,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 14,
    color: DARK,
  },
  imagePickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  imagePickText: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 14,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  imageContainer: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  imageThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  imageRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  signatureContainer: {
    height: 200,
    backgroundColor: '#FFF',
    position: 'relative',
  },
  sigActions: {
    position: 'absolute',
    bottom: -32,
    right: 0,
    flexDirection: 'row',
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  clearBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: SURFACE,
  },
  submitBtn: {
    backgroundColor: CYAN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: SURFACE,
    fontSize: 16,
    fontWeight: '700',
  },
});
