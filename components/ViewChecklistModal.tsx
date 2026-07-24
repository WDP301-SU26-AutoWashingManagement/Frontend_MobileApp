import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import bookingService from '../services/bookingService';

interface ViewChecklistModalProps {
  checklist: any;
  isOpen: boolean;
  onClose: () => void;
}

const CYAN = '#0891B2';
const SURFACE = '#FFFFFF';
const DARK = '#1E293B';
const GRAY = '#64748B';

export default function ViewChecklistModal({ checklist, isOpen, onClose }: ViewChecklistModalProps) {
  if (!isOpen || !checklist) return null;

  const handleDownloadPdf = async () => {
    try {
      const url = bookingService.getChecklistPdfUrl(checklist._id);
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Lỗi', 'Không thể mở liên kết tải PDF');
      }
    } catch (error) {
      console.error('Error opening PDF URL:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi tải PDF');
    }
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Biên bản kiểm tra xe</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={DARK} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="checkmark-circle-outline" size={16} color={CYAN} /> Các mục kiểm tra
              </Text>
              <View style={styles.itemsContainer}>
                {(checklist.checklist_items || checklist.items)?.map((item: any, index: number) => (
                  <View key={index} style={styles.checkItem}>
                    <MaterialCommunityIcons 
                      name={item.checked ? "checkbox-marked" : "close-box-outline"} 
                      size={24} 
                      color={item.checked ? CYAN : '#EF4444'} 
                    />
                    <Text style={[styles.checkLabel, { color: DARK }]}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="document-text-outline" size={16} color="#F59E0B" /> Ghi chú hiện trạng
              </Text>
              <View style={styles.noteBox}>
                <Text style={styles.noteText}>{checklist.note || 'Không có ghi chú'}</Text>
              </View>
            </View>

            {checklist.images && checklist.images.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="image-outline" size={16} color="#10B981" /> Hình ảnh hiện trạng
                </Text>
                <View style={styles.imagesGrid}>
                  {checklist.images.map((imgUrl: string, idx: number) => (
                    <Image key={idx} source={{ uri: imgUrl }} style={styles.imageThumb} />
                  ))}
                </View>
              </View>
            )}

            {/* Chữ ký xác nhận đồng kiểm (Hiển thị cả 2 chữ ký Ban đầu & Sau khi rửa) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="pencil-outline" size={16} color="#6366F1" /> Chữ ký xác nhận đồng kiểm
              </Text>

              {/* 1. Chữ ký lúc nhận xe */}
              <View style={styles.signatureBoxContainer}>
                <Text style={styles.signatureLabelText}>1. Chữ ký lúc nhận xe (Ban đầu)</Text>
                {checklist.customer_signature ? (
                  <View style={styles.signatureContainer}>
                    <Image
                      source={{ uri: checklist.customer_signature }}
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

              {/* 2. Chữ ký bàn giao xe (Sau khi rửa) */}
              <View style={[styles.signatureBoxContainer, { marginTop: 12 }]}>
                <Text style={styles.signatureLabelText}>2. Chữ ký bàn giao xe (Sau khi rửa)</Text>
                {checklist.customer_signature_after ? (
                  <View style={styles.signatureContainer}>
                    <Image
                      source={{ uri: checklist.customer_signature_after }}
                      style={styles.signatureImage}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <View style={styles.signatureEmptyBox}>
                    <Text style={styles.signatureEmptyText}>Chưa ký bàn giao xe</Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.downloadBtn} onPress={handleDownloadPdf}>
              <MaterialCommunityIcons name="download" size={20} color={SURFACE} style={{ marginRight: 8 }} />
              <Text style={styles.downloadBtnText}>Tải xuống PDF</Text>
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
    fontWeight: '500',
    flex: 1,
  },
  noteBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
  },
  noteText: {
    fontSize: 14,
    color: DARK,
    lineHeight: 22,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  signatureBoxContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  signatureLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  signatureContainer: {
    height: 150,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  signatureEmptyBox: {
    height: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  signatureImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: SURFACE,
  },
  downloadBtn: {
    flexDirection: 'row',
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtnText: {
    color: SURFACE,
    fontSize: 16,
    fontWeight: '700',
  },
});
