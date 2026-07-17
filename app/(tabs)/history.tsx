import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuthService';
import bookingService, { Booking } from '../../services/bookingService';

const TAB_CONFIG = [
  { id: 'upcoming', label: 'Đanng xử lí' },
  { id: 'completed', label: 'Hoàn thành' },
  { id: 'cancelled', label: 'Đã hủy' },
] as const;

type BookingTab = typeof TAB_CONFIG[number]['id'];

const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  checked_in: 'Đã nhận xe',
  in_progress: 'Đang rửa',
  washed: 'Rửa xong',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const BOOKING_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  confirmed: { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD' },
  checked_in: { bg: '#E0E7FF', text: '#3730A3', border: '#C7D2FE' },
  in_progress: { bg: '#F3E8FF', text: '#6B21A8', border: '#E9D5FF' },
  washed: { bg: '#CCFBF1', text: '#115E59', border: '#99F6E4' },
  completed: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  cancelled: { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' },
};

function formatScheduledAt(iso: string): string {
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const weekday = days[d.getDay()];

    return `${weekday}, ${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return iso;
  }
}

const formatBranchAddress = (branch: any) => {
  if (!branch) return '';
  const addr = branch.branch_address;
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  const parts = [addr.street, addr.ward, addr.district, addr.city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '';
};

export default function HistoryScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<BookingTab>('upcoming');

  const { user } = useAuth();

  const tierDiscountPercentage = React.useMemo(() => {
    const tier = user?.role_data?.tier_id;
    if (tier && typeof tier === 'object' && 'discount_percentage' in tier) {
      return (tier as any).discount_percentage || 0;
    }
    const points = user?.role_data?.membership_points ?? 0;
    if (points >= 600) return 15;
    if (points >= 300) return 10;
    if (points >= 100) return 5;
    return 0;
  }, [user]);

  // Modals state
  const [detailModal, setDetailModal] = useState<Booking | null>(null);
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; booking: Booking | null }>({
    isOpen: false,
    booking: null,
  });
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Vehicle receipt minutes checklist state
  const [checklist, setChecklist] = useState<any | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  useEffect(() => {
    if (detailModal) {
      const fetchChecklist = async () => {
        setLoadingChecklist(true);
        try {
          const data = await bookingService.getChecklist(detailModal._id);
          setChecklist(data);
        } catch (error) {
          console.error('Error fetching checklist on Mobile detail:', error);
          setChecklist(null);
        } finally {
          setLoadingChecklist(false);
        }
      };
      fetchChecklist();
    } else {
      setChecklist(null);
    }
  }, [detailModal]);

  const handleDownloadPdf = async (checklistId: string) => {
    try {
      const url = bookingService.getChecklistPdfUrl(checklistId);
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

  const loadBookings = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await bookingService.list();
      const sorted = [...data].sort(
        (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
      );
      setBookings(sorted);
    } catch (err) {
      console.error('Failed to load bookings:', err);
      Alert.alert('Lỗi', 'Không thể tải lịch đặt xe. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBookings(false);
  }, [loadBookings]);

  const handleCancelClick = (booking: Booking) => {
    setCancelReason('');
    setCancelModal({ isOpen: true, booking });
  };

  const performCancel = async () => {
    const booking = cancelModal.booking;
    if (!booking) return;

    if (!cancelReason.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do hủy lịch');
      return;
    }

    setIsCancelling(true);
    try {
      await bookingService.cancel(booking._id, cancelReason.trim());
      Alert.alert('Thành công', 'Đã hủy lịch hẹn rửa xe.');
      setCancelModal({ isOpen: false, booking: null });
      setCancelReason('');
      await loadBookings(false);
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      Alert.alert('Lỗi', 'Hủy lịch hẹn thất bại. Vui lòng thử lại.');
    } finally {
      setIsCancelling(false);
    }
  };

  const matchesTab = (booking: Booking, tab: BookingTab) => {
    const status = booking.booking_status;
    if (tab === 'upcoming') {
      return ['pending', 'confirmed', 'checked_in', 'in_progress', 'washed'].includes(status);
    }
    if (tab === 'completed') {
      return status === 'completed';
    }
    if (tab === 'cancelled') {
      return status === 'cancelled';
    }
    return false;
  };

  const filteredBookings = bookings.filter((b) => matchesTab(b, activeTab));

  const renderHistoryItem = ({ item }: { item: Booking }) => {
    const statusColor = BOOKING_STATUS_COLORS[item.booking_status] || BOOKING_STATUS_COLORS.pending;
    const canCancel = ['pending', 'confirmed'].includes(item.booking_status);
    const vehicleObj = item.vehicle_id || item.vehicle;
    const branchObj = item.branch_id || item.branch;

    const serviceName = item.services
      ?.map((s) => {
        const svc = s.service_id || s.service;
        const pkg = s.service_package_id || s.service_package;
        return svc?.service_name || pkg?.package_name || pkg?.service_name || pkg?.name;
      })
      .filter(Boolean)
      .join(', ') || 'Chưa chọn dịch vụ';

    const basePrice = item.base_price ?? item.services?.reduce((sum, s) => sum + s.price_snapshot, 0) ?? 0;
    const itemCustomer = item.customer_id as any;
    const itemTier = itemCustomer?.tier_id;
    const discountPct = (itemTier && typeof itemTier === 'object' && 'discount_percentage' in itemTier)
      ? (itemTier.discount_percentage || 0)
      : tierDiscountPercentage;

    const finalPrice = item.discount_amount !== undefined
      ? (item.final_price ?? basePrice)
      : Math.max(0, basePrice - Math.round(basePrice * (discountPct / 100)));

    return (
      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor.bg, borderColor: statusColor.border },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {BOOKING_STATUS_LABELS[item.booking_status] || item.booking_status}
            </Text>
          </View>
          <Text style={styles.dateText}>{formatScheduledAt(item.scheduled_at)}</Text>
        </View>

        <View style={styles.historyBody}>
          <View style={styles.serviceInfo}>
            <MaterialCommunityIcons name="car" size={18} color="#64748B" />
            <Text style={styles.vehicleText}>
              {vehicleObj?.license_plate || vehicleObj?.plate_number || 'Chưa rõ biển số'}{' '}
              {vehicleObj?.vehicle_model ? `(${vehicleObj.vehicle_model})` : ''}
            </Text>
          </View>
          <View style={styles.serviceInfo}>
            <MaterialCommunityIcons name="spray-bottle" size={18} color="#64748B" />
            <Text style={styles.serviceText} numberOfLines={2}>
              {serviceName}
            </Text>
          </View>
          {branchObj && (
            <View style={styles.serviceInfo}>
              <MaterialCommunityIcons name="map-marker" size={18} color="#EF4444" />
              <Text style={styles.branchText} numberOfLines={1}>
                {formatBranchAddress(branchObj)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.historyFooter}>
          {finalPrice < basePrice ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.priceText, { textDecorationLine: 'line-through', fontSize: 13, color: '#94A3B8' }]}>
                {basePrice.toLocaleString('vi-VN')} đ
              </Text>
              <Text style={styles.priceText}>
                {finalPrice.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          ) : (
            <Text style={styles.priceText}>{finalPrice.toLocaleString('vi-VN')} đ</Text>
          )}
          <View style={styles.actionButtons}>
            <Pressable style={styles.detailButton} onPress={() => setDetailModal(item)}>
              <Text style={styles.detailButtonText}>Chi tiết</Text>
            </Pressable>
            {canCancel && (
              <Pressable style={styles.cancelButton} onPress={() => handleCancelClick(item)}>
                <Text style={styles.cancelButtonText}>Hủy lịch</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lịch sử đặt lịch</Text>
      </View>

      <View style={styles.tabsContainer}>
        {TAB_CONFIG.map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Đang tải lịch hẹn...</Text>
        </View>
      ) : filteredBookings.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <MaterialCommunityIcons name="calendar-blank" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>
            Chưa có lịch hẹn {TAB_CONFIG.find((t) => t.id === activeTab)?.label.toLowerCase()}
          </Text>
          <Text style={styles.emptySubtext}>
            Bạn có thể đặt lịch dịch vụ rửa xe mới từ trang chủ.
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* DETAIL MODAL */}
      <Modal visible={!!detailModal} transparent animationType="fade" onRequestClose={() => setDetailModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết đặt lịch</Text>
              <Pressable onPress={() => setDetailModal(null)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            {detailModal && (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.modalSection}>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Mã đặt lịch:</Text>
                    <Text style={[styles.modalValue, styles.bold, styles.mono]}>
                      {detailModal.appointment_code}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Trạng thái:</Text>
                    {(() => {
                      const col = BOOKING_STATUS_COLORS[detailModal.booking_status] || BOOKING_STATUS_COLORS.pending;
                      return (
                        <View style={[styles.statusBadge, { backgroundColor: col.bg, borderColor: col.border, alignSelf: 'flex-start' }]}>
                          <Text style={[styles.statusText, { color: col.text }]}>
                            {BOOKING_STATUS_LABELS[detailModal.booking_status] || detailModal.booking_status}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Thời gian rửa:</Text>
                    <Text style={styles.modalValue}>{formatScheduledAt(detailModal.scheduled_at)}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Thông tin phương tiện</Text>
                  {(() => {
                    const vehicleObj = detailModal.vehicle_id || detailModal.vehicle;
                    return (
                      <>
                        <View style={styles.modalRow}>
                          <Text style={styles.modalLabel}>Biển số xe:</Text>
                          <Text style={[styles.modalValue, styles.bold]}>
                            {vehicleObj?.license_plate || vehicleObj?.plate_number || '—'}
                          </Text>
                        </View>
                        <View style={styles.modalRow}>
                          <Text style={styles.modalLabel}>Dòng xe:</Text>
                          <Text style={styles.modalValue}>{vehicleObj?.vehicle_model || '—'}</Text>
                        </View>
                        {vehicleObj?.color && (
                          <View style={styles.modalRow}>
                            <Text style={styles.modalLabel}>Màu sắc:</Text>
                            <Text style={styles.modalValue}>{vehicleObj.color}</Text>
                          </View>
                        )}
                      </>
                    );
                  })()}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Chi nhánh</Text>
                  {(() => {
                    const branchObj = detailModal.branch_id || detailModal.branch;
                    return (
                      <>
                        <Text style={[styles.modalValue, { marginBottom: 4, textAlign: 'left' }]}>
                          {formatBranchAddress(branchObj)}
                        </Text>
                        {branchObj?.branch_phone && (
                          <View style={styles.modalRow}>
                            <Text style={styles.modalLabel}>Hotline:</Text>
                            <Text style={styles.modalValue}>{branchObj.branch_phone}</Text>
                          </View>
                        )}
                      </>
                    );
                  })()}
                </View>

                {/* BIÊN BẢN NHẬN XE */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Biên bản nhận xe</Text>
                  {loadingChecklist ? (
                    <ActivityIndicator size="small" color="#0891B2" style={{ alignSelf: 'flex-start', marginVertical: 8 }} />
                  ) : checklist ? (
                    <View style={styles.checklistCard}>
                      <View style={styles.checklistInfo}>
                        <Text style={styles.checklistTitle}>Biên bản đồng kiểm xe</Text>
                        <Text style={styles.checklistTime}>
                          Đã kiểm tra lúc {checklist.createdAt
                            ? new Date(checklist.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                            : '...'}
                        </Text>
                      </View>
                      <Pressable
                        style={styles.downloadPdfButton}
                        onPress={() => handleDownloadPdf(checklist._id)}
                      >
                        <MaterialCommunityIcons name="download" size={16} color="#0891B2" />
                        <Text style={styles.downloadPdfText}>Tải PDF</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Text style={styles.checklistEmptyText}>
                      Chưa có biên bản kiểm tra xe cho lịch hẹn này.
                    </Text>
                  )}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Chi tiết dịch vụ</Text>
                  {detailModal.services?.map((s, index) => {
                    const svc = s.service_id || s.service;
                    const pkg = s.service_package_id || s.service_package;
                    const name = svc?.service_name || pkg?.package_name || pkg?.service_name || pkg?.name || 'Dịch vụ';
                    return (
                      <View key={s._id || index} style={styles.serviceItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.serviceItemName}>{name}</Text>
                          {pkg && (
                            <Text style={styles.packageBadge}>
                              Combo: {pkg.package_name || pkg.service_name || pkg.name}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.serviceItemPrice}>
                          {s.price_snapshot?.toLocaleString('vi-VN')} đ
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <View style={[styles.modalSection, { borderBottomWidth: 0 }]}>
                  <Text style={styles.sectionTitle}>Thanh toán</Text>
                  {(() => {
                    const basePrice = detailModal.base_price ?? detailModal.services?.reduce((sum, s) => sum + s.price_snapshot, 0) ?? 0;
                    const itemCustomer = detailModal.customer_id as any;
                    const itemTier = itemCustomer?.tier_id;
                    const discountPct = (itemTier && typeof itemTier === 'object' && 'discount_percentage' in itemTier)
                      ? (itemTier.discount_percentage || 0)
                      : tierDiscountPercentage;
                    const tierName = (itemTier && typeof itemTier === 'object' && 'tier_name' in itemTier)
                      ? (itemTier.tier_name || '')
                      : (user?.role_data?.tier_id as any)?.tier_name || 'thành viên';

                    const tierDiscountAmount = Math.round(basePrice * (discountPct / 100));

                    const finalPrice = detailModal.discount_amount !== undefined
                      ? (detailModal.final_price ?? basePrice)
                      : Math.max(0, basePrice - tierDiscountAmount);

                    return (
                      <>
                        <View style={styles.modalRow}>
                          <Text style={styles.modalLabel}>Tạm tính:</Text>
                          <Text style={styles.modalValue}>
                            {basePrice.toLocaleString('vi-VN')} đ
                          </Text>
                        </View>
                        {detailModal.discount_amount ? (
                          <View style={styles.modalRow}>
                            <Text style={styles.modalLabel}>Khuyến mãi:</Text>
                            <Text style={[styles.modalValue, { color: '#EF4444' }]}>
                              -{(detailModal.discount_amount || 0).toLocaleString('vi-VN')} đ
                            </Text>
                          </View>
                        ) : discountPct > 0 ? (
                          <View style={styles.modalRow}>
                            <Text style={styles.modalLabel}>Hạng {tierName}:</Text>
                            <Text style={[styles.modalValue, { color: '#10B981', fontWeight: '700' }]}>
                              -{discountPct}%
                            </Text>
                          </View>
                        ) : null}
                        <View style={styles.modalRow}>
                          <Text style={[styles.modalLabel, styles.bold, { fontSize: 16 }]}>Tổng thanh toán:</Text>
                          <Text style={[styles.modalValue, styles.bold, { fontSize: 18, color: '#06B6D4' }]}>
                            {finalPrice.toLocaleString('vi-VN')} đ
                          </Text>
                        </View>
                      </>
                    );
                  })()}
                  {detailModal.booking_status === 'completed' && detailModal.payment_method && (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Hình thức giao dịch:</Text>
                      <Text style={[styles.modalValue, styles.bold]}>
                        {detailModal.payment_method === 'bank' ? 'Chuyển khoản' : 'Tiền mặt'}
                      </Text>
                    </View>
                  )}
                </View>

                {detailModal.booking_status === 'cancelled' && (
                  <View style={styles.cancelledSection}>
                    <Text style={styles.cancelledTitle}>Thông tin hủy lịch</Text>
                    <Text style={styles.cancelledText}>
                      Lý do: {detailModal.cancellation_reason || 'Không có lý do cụ thể'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            <Pressable style={styles.modalCloseButton} onPress={() => setDetailModal(null)}>
              <Text style={styles.modalCloseButtonText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* CANCEL MODAL */}
      <Modal
        visible={cancelModal.isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModal({ isOpen: false, booking: null })}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxHeight: '85%' }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Xác nhận hủy lịch</Text>
                  <Pressable onPress={() => setCancelModal({ isOpen: false, booking: null })}>
                    <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                  </Pressable>
                </View>

                <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
                  <View style={{ paddingVertical: 16 }}>
                    <Text style={styles.cancelWarningText}>
                      Bạn có chắc chắn muốn hủy lịch hẹn lúc{' '}
                      <Text style={styles.bold}>
                        {cancelModal.booking ? formatScheduledAt(cancelModal.booking.scheduled_at) : ''}
                      </Text>{' '}
                      không? Hành động này không thể hoàn tác.
                    </Text>

                    <Text style={styles.cancelInputLabel}>
                      Lý do hủy <Text style={{ color: '#EF4444' }}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.cancelTextInput}
                      placeholder="Vui lòng nhập lý do hủy lịch hẹn..."
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={4}
                      value={cancelReason}
                      onChangeText={setCancelReason}
                      maxLength={200}
                    />
                  </View>
                </ScrollView>

                <View style={styles.cancelActions}>
                  <Pressable
                    style={[styles.cancelBtn, styles.cancelBtnBack]}
                    onPress={() => setCancelModal({ isOpen: false, booking: null })}
                    disabled={isCancelling}
                  >
                    <Text style={styles.cancelBtnTextBack}>Trở lại</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.cancelBtn,
                      styles.cancelBtnConfirm,
                      (!cancelReason.trim() || isCancelling) && styles.cancelBtnDisabled,
                    ]}
                    onPress={performCancel}
                    disabled={!cancelReason.trim() || isCancelling}
                  >
                    {isCancelling ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.cancelBtnTextConfirm}>Xác nhận hủy</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    marginTop: 50,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: '#ECFDF5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#06B6D4',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
  },
  listContent: {
    padding: 12,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  historyBody: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  serviceText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  branchText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#06B6D4',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  detailButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#06B6D4',
    backgroundColor: '#FFFFFF',
  },
  detailButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#06B6D4',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalScroll: {
    marginVertical: 12,
  },
  modalSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modalValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    textAlign: 'right',
  },
  bold: {
    fontWeight: '700',
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  serviceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  serviceItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  packageBadge: {
    fontSize: 11,
    fontWeight: '500',
    color: '#0EA5E9',
    marginTop: 2,
  },
  serviceItemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cancelledSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 12,
    marginVertical: 8,
  },
  cancelledTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  cancelledText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '500',
  },
  modalCloseButton: {
    backgroundColor: '#06B6D4',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checklistCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  checklistInfo: {
    flex: 1,
    marginRight: 12,
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  checklistTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  checklistEmptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#64748B',
    marginTop: 4,
  },
  downloadPdfButton: {
    backgroundColor: '#ECFEFF',
    borderColor: '#CFFAFE',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  downloadPdfText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0891B2',
  },
  // Cancellation specific styles
  cancelWarningText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  cancelInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  cancelTextInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 80,
    backgroundColor: '#F8FAFC',
  },
  cancelActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  cancelBtnBack: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnConfirm: {
    backgroundColor: '#EF4444',
  },
  cancelBtnDisabled: {
    opacity: 0.5,
  },
  cancelBtnTextBack: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  cancelBtnTextConfirm: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
