import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import bookingService, { Booking } from '../services/bookingService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://backendautowash-604657288576.asia-southeast1.run.app/api/v1';

interface ConfirmHandoverModalProps {
  booking: Booking | null;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConfirmHandoverModal({
  booking,
  visible,
  onClose,
  onSuccess,
}: ConfirmHandoverModalProps) {
  const [checklist, setChecklist] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const signatureRef = useRef<SignatureViewRef>(null);
  const [signatureAfter, setSignatureAfter] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (visible && booking) {
      const bId = booking._id || booking.id;
      if (!bId) return;

      setLoading(true);
      bookingService
        .getChecklist(bId)
        .then((res) => {
          setChecklist(res);
          if (res?.customer_signature_after) {
            setSignatureAfter(res.customer_signature_after);
          }
        })
        .catch((err) => {
          console.error('Lỗi khi lấy checklist bàn giao xe:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setChecklist(null);
      setSignatureAfter(null);
      setSubmitting(false);
    }
  }, [visible, booking]);

  const getImageUrl = (imgStr: string) => {
    if (!imgStr) return '';
    if (imgStr.startsWith('data:') || imgStr.startsWith('http')) return imgStr;
    const baseHost = API_BASE_URL.replace('/api/v1', '');
    return `${baseHost}${imgStr}`;
  };

  const handleOK = async (signature: string) => {
    if (!checklist || !checklist._id) {
      Alert.alert('Lỗi', 'Không tìm thấy biên bản kiểm tra xe để cập nhật chữ ký.');
      return;
    }

    setSubmitting(true);
    try {
      await bookingService.updateHandoverSignature(checklist._id, signature);
      Alert.alert('Thành công', 'Xác nhận bàn giao xe thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi lưu chữ ký bàn giao xe:', err);
      Alert.alert('Lỗi', err.message || 'Không thể lưu chữ ký bàn giao xe');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSignature = () => {
    if (signatureAfter) {
      handleOK(signatureAfter);
    } else if (signatureRef.current) {
      signatureRef.current.readSignature();
    } else {
      Alert.alert('Chưa có chữ ký', 'Vui lòng yêu cầu khách hàng ký bàn giao xe.');
    }
  };

  if (!visible || !booking) return null;

  const shortId = booking.appointment_code || `#${booking._id.slice(-6).toUpperCase()}`;
  const creationDateFormatted = checklist?.createdAt
    ? new Date(checklist.createdAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const DEFAULT_ITEMS = [
    'Bề mặt sơn (không trầy xước, móp méo)',
    'Kính chắn gió, kính sườn (nguyên vẹn)',
    'Gương chiếu hậu (đủ 2 bên, không vỡ)',
    'Lốp và mâm xe (không rách, biến dạng)',
    'Đồ cá nhân trên xe (đã nhắc khách tự bảo quản)',
    'Thảm lót sàn, nội thất (tình trạng ban đầu)'
  ];

  let rawItems = checklist?.checklist_items;
  if (typeof rawItems === 'string') {
    try {
      rawItems = JSON.parse(rawItems);
    } catch (e) {
      rawItems = [];
    }
  }

  const checklistItems: { label: string; checked: boolean }[] =
    (Array.isArray(rawItems) && rawItems.length > 0)
      ? rawItems.map((it: any) =>
          typeof it === 'string'
            ? { label: it, checked: true }
            : { label: it.label || it.name || 'Mục kiểm tra', checked: it.checked !== false }
        )
      : DEFAULT_ITEMS.map((label) => ({ label, checked: true }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Chi tiết Biên bản xe & Ký bàn giao</Text>
              <Text style={styles.headerSubTitle}>
                Mã đơn: <Text style={{ fontWeight: '700', color: '#334155' }}>{shortId}</Text>
                {creationDateFormatted ? ` • Ngày lập: ${creationDateFormatted}` : ''}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color="#64748B" />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4F46E5" />
              <Text style={styles.loadingText}>Đang tải biên bản kiểm tra xe...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
              {/* 1. Các mục đã kiểm tra */}
              {checklistItems.length > 0 && (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <MaterialCommunityIcons name="checkbox-marked-outline" size={18} color="#0891B2" />
                    <Text style={styles.sectionTitle}>Các mục đã kiểm tra ban đầu</Text>
                  </View>

                  <View style={styles.itemsGrid}>
                    {checklistItems.map((item, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.itemCard,
                          item.checked ? styles.itemChecked : styles.itemUnchecked,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={item.checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                          size={18}
                          color={item.checked ? '#0891B2' : '#CBD5E1'}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.itemText,
                            item.checked ? styles.itemTextChecked : styles.itemTextUnchecked,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* 2. Ghi chú hiện trạng */}
              {checklist?.note ? (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <MaterialCommunityIcons name="file-document-outline" size={18} color="#D97706" />
                    <Text style={styles.sectionTitle}>Ghi chú hiện trạng xe</Text>
                  </View>
                  <View style={styles.noteBox}>
                    <Text style={styles.noteText}>{checklist.note}</Text>
                  </View>
                </View>
              ) : null}

              {/* 3. Hình ảnh đính kèm */}
              {checklist?.images && checklist.images.length > 0 && (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <MaterialCommunityIcons name="image-outline" size={18} color="#10B981" />
                    <Text style={styles.sectionTitle}>Hình ảnh đính kèm hiện trạng</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                    {checklist.images.map((img: string, idx: number) => (
                      <Pressable key={idx} onPress={() => setSelectedImage(getImageUrl(img))}>
                        <Image
                          source={{ uri: getImageUrl(img) }}
                          style={styles.thumbnailImage}
                          resizeMode="cover"
                        />
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* 4. Chữ ký xác nhận đồng kiểm (2 ô chữ ký) */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color="#4F46E5" />
                  <Text style={styles.sectionTitle}>Chữ ký xác nhận đồng kiểm</Text>
                </View>

                {/* 4a. Chữ ký ban đầu */}
                <View style={styles.signatureBoxContainer}>
                  <Text style={styles.signatureLabel}>1. Chữ ký lúc nhận xe (Ban đầu)</Text>
                  {checklist?.customer_signature ? (
                    <View style={styles.signaturePreviewBox}>
                      <Image
                        source={{ uri: getImageUrl(checklist.customer_signature) }}
                        style={styles.signatureImage}
                        resizeMode="contain"
                      />
                    </View>
                  ) : (
                    <View style={styles.signatureEmptyBox}>
                      <Text style={styles.signatureEmptyText}>Chưa có chữ ký ban đầu</Text>
                    </View>
                  )}
                </View>

                {/* 4b. Chữ ký bàn giao xe (Sau khi rửa) */}
                <View style={[styles.signatureBoxContainer, styles.handoverBoxContainer]}>
                  <Text style={[styles.signatureLabel, { color: '#3730A3' }]}>
                    2. Chữ ký bàn giao xe (Sau khi rửa) <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>

                  {signatureAfter ? (
                    <View style={styles.signaturePreviewBox}>
                      <Image
                        source={{ uri: getImageUrl(signatureAfter) }}
                        style={styles.signatureImage}
                        resizeMode="contain"
                      />
                      <Pressable
                        style={styles.resignBtn}
                        onPress={() => {
                          setSignatureAfter(null);
                          if (signatureRef.current) {
                            signatureRef.current.clearSignature();
                          }
                        }}
                      >
                        <MaterialCommunityIcons name="refresh" size={14} color="#DC2626" />
                        <Text style={styles.resignBtnText}>Ký lại</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.signatureCanvasContainer}>
                      <SignatureScreen
                        ref={signatureRef}
                        onOK={(sig) => {
                          setSignatureAfter(sig);
                          handleOK(sig);
                        }}
                        onEmpty={() => {
                          Alert.alert('Chưa có chữ ký', 'Vui lòng yêu cầu khách hàng ký tên nhận xe.');
                        }}
                        descriptionText="Khách hàng ký nhận xe vào đây"
                        clearText="Xóa chữ ký"
                        confirmText="Xác nhận"
                        webStyle={`.m-signature-pad { box-shadow: none; border: none; margin: 0; padding: 0; } .m-signature-pad--body { border: 1px solid #C7D2FE; border-radius: 8px; } .m-signature-pad--footer { display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px; }`}
                      />
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          )}

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </Pressable>

            <Pressable
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleConfirmSignature}
              disabled={submitting || loading}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Xác nhận & Tiến hành thanh toán</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Full screen Image Viewer View */}
        {selectedImage && (
          <View style={styles.imageViewerContainer}>
            <Pressable style={styles.imageViewerCloseBtn} onPress={() => setSelectedImage(null)}>
              <MaterialCommunityIcons name="close" size={30} color="#FFFFFF" />
            </Pressable>
            <Image
              source={{ uri: selectedImage }}
              style={styles.imageViewerFull}
              resizeMode="contain"
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  itemChecked: {
    backgroundColor: '#ECFEFF',
    borderColor: '#CFFAFE',
  },
  itemUnchecked: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
  },
  itemText: {
    fontSize: 12,
    flex: 1,
  },
  itemTextChecked: {
    color: '#0F172A',
    fontWeight: '600',
  },
  itemTextUnchecked: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  noteBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  noteText: {
    fontSize: 13,
    color: '#334155',
  },
  imageScroll: {
    flexDirection: 'row',
  },
  thumbnailImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  signatureBoxContainer: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  handoverBoxContainer: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  signatureLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  signaturePreviewBox: {
    height: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  signatureImage: {
    width: '90%',
    height: 130,
  },
  signatureEmptyBox: {
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  resignBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  resignBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  signatureCanvasContainer: {
    height: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    overflow: 'hidden',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  imageViewerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  imageViewerCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    right: 20,
    zIndex: 100000,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
  },
  imageViewerFull: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});
