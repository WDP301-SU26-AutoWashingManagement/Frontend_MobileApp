import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import bookingService, { Booking } from '../services/bookingService';

interface TickServicesModalProps {
  booking: Booking | null;
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onCheckin?: () => void;
}

export default function TickServicesModal({
  booking: initialBooking,
  visible,
  onClose,
  onSuccess,
  onCheckin,
}: TickServicesModalProps) {
  const [booking, setBooking] = useState<Booking | null>(initialBooking);
  const [loadingFull, setLoadingFull] = useState(false);
  const [localStatuses, setLocalStatuses] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && initialBooking) {
      setBooking(initialBooking);
      const bId = initialBooking._id || initialBooking.id;
      if (!bId) return;

      setLoadingFull(true);
      bookingService
        .getById(bId)
        .then((res) => {
          // getById returns { appointment, services } or booking object
          const fetchedBooking = res.appointment ? res.appointment : res;
          const fetchedServices = res.services || fetchedBooking.services || [];
          setBooking({ ...fetchedBooking, services: fetchedServices });

          const initial: Record<string, boolean> = {};
          fetchedServices.forEach((s: any) => {
            const sId = s._id || s.id;
            if (sId) {
              initial[sId] = !!s.is_completed;
            }
          });
          setLocalStatuses(initial);
        })
        .catch((err) => {
          console.error('Lỗi khi tải chi tiết booking trong TickServicesModal:', err);
        })
        .finally(() => {
          setLoadingFull(false);
        });
    } else {
      setBooking(null);
      setLocalStatuses({});
    }
  }, [visible, initialBooking]);

  const handleToggleLocal = (itemId: string) => {
    setLocalStatuses((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  let allManualChecked = true;
  const servicesList = booking?.services || [];
  servicesList.forEach((svc: any) => {
    const itemId = svc._id || svc.id;
    const svcObj = svc.service_id || svc.service;
    const pkgObj = svc.service_package_id || svc.service_package;
    const name = svcObj?.service_name || pkgObj?.package_name || pkgObj?.service_name || pkgObj?.name || 'Dịch vụ';
    const isAutomated =
      svcObj?.is_automated ||
      svcObj?.service_name === 'Dịch vụ rửa xe' ||
      svcObj?.service_name?.toLowerCase() === 'dịch vụ rửa xe' ||
      name === 'Dịch vụ rửa xe';

    if (!isAutomated && itemId && !localStatuses[itemId]) {
      allManualChecked = false;
    }
  });

  const handleSave = async (andCheckin = false) => {
    if (!booking) return;
    const bId = booking._id || booking.id;
    if (!bId) return;

    if (andCheckin && !allManualChecked) {
      Alert.alert(
        'Chưa hoàn thành dịch vụ',
        'Vui lòng đánh dấu hoàn thành tất cả các dịch vụ thủ công trước khi thực hiện Check-in.'
      );
      return;
    }

    setSaving(true);
    try {
      const promises: Promise<any>[] = [];
      const services = booking.services || [];

      services.forEach((svc: any) => {
        const itemId = svc._id || svc.id;
        const isCurrentlyCompleted = !!svc.is_completed;
        const isLocallyCompleted = !!localStatuses[itemId];

        if (itemId && isCurrentlyCompleted !== isLocallyCompleted) {
          promises.push(bookingService.toggleServiceItem(bId, itemId));
        }
      });

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      Alert.alert('Thành công', 'Đã cập nhật trạng thái dịch vụ thủ công');
      if (onSuccess) onSuccess();

      if (andCheckin && onCheckin) {
        onCheckin();
      } else {
        onClose();
      }
    } catch (error: any) {
      console.error('Lỗi khi lưu trạng thái dịch vụ:', error);
      Alert.alert('Lỗi', error.message || 'Không thể lưu trạng thái dịch vụ');
    } finally {
      setSaving(false);
    }
  };

  if (!visible || !booking) return null;

  const services = booking.services || [];

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
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons name="format-list-checks" size={22} color="#0EA5B7" />
              <Text style={styles.headerTitle}>Cập nhật Dịch vụ Thủ công</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color="#64748B" />
            </Pressable>
          </View>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <MaterialCommunityIcons name="information" size={18} color="#0369A1" style={{ marginRight: 6 }} />
            <Text style={styles.infoText}>
              Đánh dấu hoàn thành tất cả các dịch vụ thủ công trước khi chuyển sang bước Check-in.
            </Text>
          </View>

          {/* Body */}
          {loadingFull ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0EA5B7" />
              <Text style={styles.loadingText}>Đang tải chi tiết dịch vụ...</Text>
            </View>
          ) : services.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không tìm thấy danh sách dịch vụ</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
              {services.map((svc: any, idx: number) => {
                const itemId = svc._id || svc.id || String(idx);
                const svcObj = svc.service_id || svc.service;
                const pkgObj = svc.service_package_id || svc.service_package;
                const name = svcObj?.service_name || pkgObj?.package_name || pkgObj?.service_name || pkgObj?.name || 'Dịch vụ';
                const isAutomated =
                  svcObj?.is_automated ||
                  svcObj?.service_name === 'Dịch vụ rửa xe' ||
                  svcObj?.service_name?.toLowerCase() === 'dịch vụ rửa xe' ||
                  name === 'Dịch vụ rửa xe';

                const isChecked = !!localStatuses[itemId];

                return (
                  <Pressable
                    key={itemId}
                    disabled={isAutomated}
                    style={[
                      styles.serviceRow,
                      isAutomated && styles.automatedRow,
                      isChecked && !isAutomated && styles.checkedRow,
                    ]}
                    onPress={() => !isAutomated && handleToggleLocal(itemId)}
                  >
                    <View style={styles.checkboxContainer}>
                      {isAutomated ? (
                        <View style={styles.autoBadge}>
                          <MaterialCommunityIcons name="lightning-bolt" size={14} color="#D97706" />
                        </View>
                      ) : (
                        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                          {isChecked && <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />}
                        </View>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.serviceName, isAutomated && styles.autoServiceName]}>
                        {name}
                      </Text>
                      {pkgObj && (
                        <Text style={styles.comboText}>
                          Combo: {pkgObj.package_name || pkgObj.service_name || pkgObj.name}
                        </Text>
                      )}
                      {isAutomated && (
                        <Text style={styles.autoTagText}>
                          ⚡ Rửa xe tự động (Tự động cập nhật qua hệ thống)
                        </Text>
                      )}
                    </View>

                    {!isAutomated && (
                      <Text style={[styles.statusTag, isChecked ? styles.doneTag : styles.pendingTag]}>
                        {isChecked ? '✓ Đã xong' : 'Chưa xong'}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelBtnText}>Đóng</Text>
            </Pressable>

            <Pressable
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Lưu dịch vụ</Text>
              )}
            </Pressable>

            {onCheckin && (
              <Pressable
                style={[
                  styles.checkinBtn,
                  (saving || !allManualChecked) && { backgroundColor: '#94A3B8', opacity: 0.7 },
                ]}
                onPress={() => handleSave(true)}
                disabled={saving || !allManualChecked}
              >
                <Text style={styles.checkinBtnText}>
                  {allManualChecked ? 'Chuyển Check-in' : 'Chưa chọn đủ DV'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
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
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#0369A1',
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 340,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  automatedRow: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  checkedRow: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  autoBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  autoServiceName: {
    color: '#92400E',
    fontWeight: '700',
  },
  comboText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  autoTagText: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    fontWeight: '500',
  },
  statusTag: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  doneTag: {
    backgroundColor: '#D1FAE5',
    color: '#047857',
  },
  pendingTag: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#0EA5B7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checkinBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
