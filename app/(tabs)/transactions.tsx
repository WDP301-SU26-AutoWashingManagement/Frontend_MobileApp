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
  Platform,
  Linking,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuthService';
import bookingService from '../../services/bookingService';
import branchService, { Branch } from '../../services/branchService';
import CreateChecklistModal from '../../components/CreateChecklistModal';

const { width, height } = Dimensions.get('window');

const CYAN = '#06B6D4';
const PURPLE = '#8B5CF6';
const GREEN = '#10B981';
const AMBER = '#F59E0B';
const ROSE = '#EF4444';
const DARK = '#0F172A';
const GRAY = '#64748B';
const SURFACE = '#FFFFFF';
const BG = '#F8FAFC';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: 'Chờ thanh toán', bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
  paid: { label: 'Hoàn thành', bg: '#D1FAE5', text: '#059669', border: '#A7F3D0' },
  cancelled: { label: 'Đã hủy', bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
};

const DATE_FILTERS = [
  { id: 'today', label: 'Hôm nay' },
  { id: '7days', label: '7 ngày qua' },
  { id: '30days', label: '30 ngày qua' },
  { id: 'all', label: 'Tất cả' },
] as const;

type DateFilterId = typeof DATE_FILTERS[number]['id'];

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

const formatBranchAddress = (branch: any) => {
  if (!branch) return 'Chưa xác định';
  const addr = branch.branch_address;
  if (!addr) return 'Chưa xác định';
  if (typeof addr === 'string') return addr;
  const parts = [addr.street, addr.ward, addr.district, addr.city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Chưa xác định';
};

export default function TransactionsScreen() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';
  const isTechnical = user?.role === 'staff' && user?.role_data?.staff_type === 'technical';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Loading single booking details
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  // Modal checklist state
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [checklist, setChecklist] = useState<any | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [createChecklistBooking, setCreateChecklistBooking] = useState<any | null>(null);

  // Date filters state
  const [activeDateFilter, setActiveDateFilter] = useState<DateFilterId>('7days');
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Load branches
  useEffect(() => {
    branchService.list()
      .then(res => setBranches(res))
      .catch(err => console.error('Failed to load branches in Transactions:', err));
  }, []);

  const getBranchAddressById = (branchId: string | any) => {
    if (!branchId) return 'Chưa xác định';
    const id = typeof branchId === 'object' ? (branchId._id || branchId.id) : branchId;
    const found = branches.find(b => (b._id === id || b.id === id));
    if (!found) return 'Chưa xác định';
    return formatBranchAddress(found);
  };

  // Calculate start/end date based on active filter
  const applyDateFilter = (filterId: DateFilterId) => {
    const end = new Date();
    const start = new Date();
    
    switch (filterId) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case '7days':
        start.setDate(end.getDate() - 7);
        break;
      case '30days':
        start.setDate(end.getDate() - 30);
        break;
      case 'all':
        start.setTime(0); // All time
        break;
    }
    
    setStartDate(start);
    setEndDate(end);
    setActiveDateFilter(filterId);
  };

  // Load transactions (Staff only)
  const loadTransactions = useCallback(async (showLoading = true) => {
    if (!isStaff || isTechnical) {
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    try {
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      const res = await bookingService.getPaidBookings(startStr, endStr);
      setData(res || []);
    } catch (err: any) {
      console.error('Failed to load transactions on mobile:', err);
      Alert.alert('Lỗi', 'Không thể tải lịch sử giao dịch. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isStaff, startDate, endDate]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Load checklist dynamically when item details open
  useEffect(() => {
    if (selectedItem) {
      const appointmentId = selectedItem.appointment_id?._id || selectedItem.appointment_id || selectedItem._id;
      setLoadingChecklist(true);
      bookingService.getChecklist(appointmentId)
        .then(res => setChecklist(res))
        .catch(() => setChecklist(null))
        .finally(() => setLoadingChecklist(false));
    } else {
      setChecklist(null);
    }
  }, [selectedItem]);

  const handleOpenDetail = async (item: any) => {
    const appointmentId = item.appointment_id?._id || item.appointment_id || item._id;
    if (!appointmentId) return;

    setLoadingDetailId(item._id);
    try {
      const fullBooking = await bookingService.getById(appointmentId);
      setSelectedItem({
        ...item,
        appointment: fullBooking.appointment,
        services: fullBooking.services || item.services,
        customer: fullBooking.appointment?.customer_id || item.customer,
        vehicle: fullBooking.appointment?.vehicle_id || item.vehicle,
      });
    } catch (error) {
      console.error('Error fetching full booking details on mobile:', error);
      // Fallback to local item if API fails
      setSelectedItem(item);
    } finally {
      setLoadingDetailId(null);
    }
  };

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions(false);
  }, [loadTransactions]);

  // Filter items based on search query
  const filteredItems = data.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    
    const plate = (item.vehicle?.license_plate || item.vehicle?.plate_number || '').toLowerCase();
    const code = (item.invoice_number || '').toLowerCase();
    const customerName = (item.customer?.full_name || '').toLowerCase();
    return plate.includes(query) || code.includes(query) || customerName.includes(query);
  });

  // Calculate revenue stats
  const stats = React.useMemo(() => {
    let total = 0;
    let cash = 0;
    let bank = 0;
    filteredItems.forEach((item) => {
      total += item.total || 0;
      if (item.payment_method === 'cash') cash += item.total || 0;
      else if (item.payment_method === 'bank') bank += item.total || 0;
    });
    return {
      total,
      count: filteredItems.length,
      cash,
      bank,
    };
  }, [filteredItems]);

  if (!isStaff || isTechnical) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chỉ nhân viên quản lý mới có quyền xem trang này.</Text>
        </View>
      </View>
    );
  }

  const renderTransactionItem = ({ item }: { item: any }) => {
    const invoiceCode = item.invoice_number || `INV-${item._id?.slice(-8).toUpperCase()}`;
    const dateToDisplay = item.paid_at;
    const amount = item.total || 0;
    const statusStyle = STATUS_CONFIG.paid;
    
    const plate = item.vehicle?.license_plate || item.vehicle?.plate_number;
    const serviceName = item.service_package?.package_name || item.service_package?.name || 'Rửa xe';

    const paymentMethodLabel = item.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản';
    const paymentMethodIcon = item.payment_method === 'cash' ? 'cash' : 'bank';

    return (
      <Pressable style={styles.card} onPress={() => handleOpenDetail(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardCode}>{invoiceCode}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={GRAY} />
            <Text style={styles.infoText}>{formatDateTime(dateToDisplay)}</Text>
          </View>

          {plate && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="car-outline" size={16} color={GRAY} />
              <View style={styles.plateContainer}>
                <Text style={styles.plateText}>{plate.toUpperCase()}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={16} color={GRAY} />
            <Text style={styles.infoText} numberOfLines={1}>{serviceName}</Text>
          </View>

          {item.payment_method && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name={paymentMethodIcon} size={16} color={GRAY} />
              <Text style={styles.infoText}>{paymentMethodLabel}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.amount}>{amount.toLocaleString('vi-VN')} đ</Text>
          
          <View style={styles.cardActions}>
            <Pressable style={styles.btnDetail} onPress={() => handleOpenDetail(item)}>
              <Text style={styles.btnDetailText}>Chi tiết</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderServicesList = () => {
    if (!selectedItem) return null;
    const servicesList = selectedItem.services || selectedItem.appointment?.services || [];
    if (servicesList.length === 0) {
      const name = selectedItem.service_package?.package_name || 'Rửa xe';
      const price = selectedItem.subtotal || selectedItem.total || 0;
      return (
        <View style={styles.modalServiceRow}>
          <Text style={styles.modalServiceText}>{name}</Text>
          <Text style={styles.modalServicePrice}>{price.toLocaleString('vi-VN')} đ</Text>
        </View>
      );
    }

    const packageGroups: Record<string, { packageInfo: any; items: any[] }> = {};
    const individualServices: any[] = [];

    servicesList.forEach((s: any) => {
      const pkg = s.service_package_id || s.service_package;
      if (pkg) {
        const pkgId = pkg._id || pkg.id || String(pkg);
        if (!packageGroups[pkgId]) {
          packageGroups[pkgId] = {
            packageInfo: pkg,
            items: [],
          };
        }
        packageGroups[pkgId].items.push(s);
      } else {
        individualServices.push(s);
      }
    });

    const elements: React.ReactNode[] = [];

    Object.keys(packageGroups).forEach((pkgId, idx) => {
      const group = packageGroups[pkgId];
      const pkgName = group.packageInfo.package_name || group.packageInfo.name || 'Gói Combo';
      const pkgPrice = group.items.reduce((sum, item) => sum + (item.price_snapshot || item.price || 0), 0);

      elements.push(
        <View key={`pkg-${pkgId}-${idx}`} style={{ marginBottom: 6 }}>
          <View style={styles.modalServiceRow}>
            <Text style={[styles.modalServiceText, { color: '#06B6D4', fontWeight: '800' }]}>
              COMBO {pkgName}
            </Text>
            <Text style={[styles.modalServicePrice, { color: '#1E293B', fontWeight: '800' }]}>
              {pkgPrice.toLocaleString('vi-VN')} đ
            </Text>
          </View>
          {group.items.map((item, itemIdx) => {
            const svcName = item.service_id?.service_name || item.service?.service_name || 'Dịch vụ lẻ';
            return (
              <Text key={`item-${itemIdx}`} style={styles.comboSubItemText}>
                • {svcName}
              </Text>
            );
          })}
        </View>
      );
    });

    individualServices.forEach((s, idx) => {
      const svcName = s.service_id?.service_name || s.service?.service_name || 'Dịch vụ';
      const price = s.price_snapshot || s.price || 0;
      elements.push(
        <View key={`ind-${idx}`} style={styles.modalServiceRow}>
          <Text style={styles.modalServiceText}>• {svcName}</Text>
          <Text style={styles.modalServicePrice}>{price.toLocaleString('vi-VN')} đ</Text>
        </View>
      );
    });

    return elements;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Lịch sử giao dịch</Text>
          <Text style={styles.headerSub}>Quản lý doanh thu và hóa đơn đã thu tại chi nhánh</Text>
        </View>
      </View>

      {/* Staff Stats Dashboard */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.mainStatCard}>
            <Text style={styles.statLabel}>TỔNG DOANH THU</Text>
            <Text style={styles.mainStatVal}>{stats.total.toLocaleString('vi-VN')} đ</Text>
            <View style={styles.statBadgeRow}>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{stats.count} Giao dịch</Text>
              </View>
            </View>
          </View>

          <View style={styles.subStatsRow}>
            <View style={styles.subStatCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="cash" size={18} color={GREEN} />
                <Text style={styles.subStatLabel}>TIỀN MẶT</Text>
              </View>
              <Text style={styles.subStatVal}>{stats.cash.toLocaleString('vi-VN')} đ</Text>
            </View>

            <View style={styles.subStatCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="bank" size={16} color={CYAN} />
                <Text style={styles.subStatLabel}>CHUYỂN KHOẢN</Text>
              </View>
              <Text style={styles.subStatVal}>{stats.bank.toLocaleString('vi-VN')} đ</Text>
            </View>
          </View>
        </View>
      )}

      {/* Date Range Quick Filter Chips */}
      <View style={styles.dateFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateFilterScroll}>
          {DATE_FILTERS.map((filter) => {
            const isActive = activeDateFilter === filter.id;
            return (
              <Pressable
                key={filter.id}
                style={[styles.dateFilterChip, isActive && styles.dateFilterChipActive]}
                onPress={() => applyDateFilter(filter.id)}
              >
                <Text style={[styles.dateFilterChipText, isActive && styles.dateFilterChipTextActive]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Input */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={GRAY} style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm biển số, mã hóa đơn, tên khách..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={GRAY} />
          </Pressable>
        )}
      </View>

      {/* Transactions List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={CYAN} />
          <Text style={styles.loadingText}>Đang tải lịch sử giao dịch...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <MaterialCommunityIcons name="receipt" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>Không tìm thấy giao dịch nào</Text>
          <Text style={styles.emptySubtext}>Không có hóa đơn thanh toán nào khớp với bộ lọc.</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Loading Detail Overlay */}
      {loadingDetailId && (
        <View style={styles.overlayLoading}>
          <ActivityIndicator size="large" color={CYAN} />
          <Text style={styles.overlayLoadingText}>Đang tải chi tiết đơn hàng...</Text>
        </View>
      )}

      {/* Transaction Detail Modal */}
      <Modal
        visible={!!selectedItem}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedItem(null)} />
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                {/* Modal Title Header */}
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.modalTitle}>
                      Chi tiết đơn #{selectedItem.invoice_number?.slice(-6) || selectedItem._id?.slice(-6).toUpperCase()}
                    </Text>
                    <View style={[styles.modalStatusBadge, { backgroundColor: STATUS_CONFIG.paid.bg, borderColor: STATUS_CONFIG.paid.border }]}>
                      <Text style={[styles.modalStatusText, { color: STATUS_CONFIG.paid.text }]}>{STATUS_CONFIG.paid.label}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => setSelectedItem(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color={GRAY} />
                  </Pressable>
                </View>

                {/* contentContainerStyle has paddingBottom to avoid Close button overlay clipping */}
                <ScrollView 
                  style={styles.modalBody} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 24 }}
                >
                  {/* SECTION 1: THỜI GIAN & ĐỊA ĐIỂM */}
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="calendar-outline" size={16} color={CYAN} />
                      <Text style={styles.sectionCardTitle}>THỜI GIAN & ĐỊA ĐIỂM</Text>
                    </View>
                    
                    <View style={styles.sectionDetailRow}>
                      <Text style={styles.detailLabel}>Giờ hẹn:</Text>
                      <Text style={styles.detailValue}>
                        {formatTime(selectedItem.appointment?.scheduled_at)}
                      </Text>
                    </View>

                    <View style={styles.sectionDetailRow}>
                      <Text style={styles.detailLabel}>Ngày hẹn:</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedItem.appointment?.scheduled_at)}
                      </Text>
                    </View>

                    <View style={[styles.sectionDetailRow, { alignItems: 'flex-start' }]}>
                      <Text style={styles.detailLabel}>Chi nhánh:</Text>
                      <Text style={[styles.detailValue, { flex: 1, textAlign: 'right', fontSize: 11, color: '#334155' }]}>
                        {getBranchAddressById(selectedItem.appointment?.branch_id)}
                      </Text>
                    </View>
                  </View>

                  {/* SECTION 2: KHÁCH HÀNG */}
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="person-outline" size={16} color={GREEN} />
                      <Text style={styles.sectionCardTitle}>KHÁCH HÀNG</Text>
                    </View>

                    <View style={styles.sectionDetailRow}>
                      <Text style={styles.detailLabel}>Họ tên:</Text>
                      <Text style={styles.detailValue}>
                        {selectedItem.customer?.user_id?.full_name || 
                         selectedItem.customer?.full_name || 
                         selectedItem.appointment?.customer_id?.user_id?.full_name || 
                         'Khách vãng lai'}
                      </Text>
                    </View>

                    <View style={styles.sectionDetailRow}>
                      <Text style={styles.detailLabel}>SĐT:</Text>
                      <Text style={styles.detailValue}>
                        {selectedItem.customer?.user_id?.phone || 
                         selectedItem.customer?.phone || 
                         selectedItem.appointment?.customer_id?.user_id?.phone || 
                         '—'}
                      </Text>
                    </View>
                  </View>

                  {/* SECTION 3: XE KHÁCH */}
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="car-outline" size={16} color={PURPLE} />
                      <Text style={styles.sectionCardTitle}>XE KHÁCH</Text>
                    </View>

                    <View style={styles.sectionDetailRow}>
                      <Text style={styles.detailLabel}>Biển số:</Text>
                      {(() => {
                        const plate = selectedItem.vehicle?.license_plate || 
                                      selectedItem.vehicle?.plate_number || 
                                      selectedItem.appointment?.vehicle_id?.license_plate || 
                                      selectedItem.appointment?.vehicle_id?.plate_number;
                        return plate ? (
                          <View style={styles.licenseBadge}>
                            <Text style={styles.licenseBadgeText}>{plate.toUpperCase()}</Text>
                          </View>
                        ) : (
                          <Text style={styles.detailValue}>—</Text>
                        );
                      })()}
                    </View>

                    <View style={styles.sectionDetailRow}>
                      <Text style={styles.detailLabel}>Hãng/Dòng xe:</Text>
                      <Text style={styles.detailValue}>
                        {selectedItem.vehicle?.vehicle_model || 
                         selectedItem.appointment?.vehicle_id?.vehicle_model || 
                         '—'}
                      </Text>
                    </View>
                  </View>

                  {/* SECTION 4: BIÊN BẢN NHẬN XE */}
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="clipboard-outline" size={16} color={AMBER} />
                      <Text style={styles.sectionCardTitle}>BIÊN BẢN NHẬN XE</Text>
                    </View>

                    {loadingChecklist ? (
                      <ActivityIndicator size="small" color={CYAN} style={{ marginVertical: 8, alignSelf: 'flex-start' }} />
                    ) : checklist ? (
                      <View style={styles.checklistRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.checklistDateText}>
                            Đã kiểm tra lúc {new Date(checklist.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Pressable 
                          style={styles.btnChecklistPdf} 
                          onPress={() => handleDownloadPdf(checklist._id)}
                        >
                          <MaterialCommunityIcons name="file-pdf-box" size={16} color="#FFFFFF" />
                          <Text style={styles.btnChecklistPdfText}>Xem PDF</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View>
                        <Text style={styles.emptyChecklistText}>Chưa có biên bản kiểm tra xe cho lịch hẹn này.</Text>
                        <Pressable 
                          style={styles.btnCreateChecklist} 
                          onPress={() => {
                            const booking = selectedItem.appointment || selectedItem;
                            setCreateChecklistBooking(booking);
                          }}
                        >
                          <Text style={styles.btnCreateChecklistText}>Tạo biên bản</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {/* SECTION 5: DỊCH VỤ & THANH TOÁN */}
                  <View style={[styles.sectionCard, { marginBottom: 20 }]}>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="receipt-outline" size={16} color={ROSE} />
                      <Text style={styles.sectionCardTitle}>DỊCH VỤ & THANH TOÁN</Text>
                    </View>

                    {/* Services Items List */}
                    <View style={styles.servicesBox}>
                      <Text style={styles.detailTitleLabel}>Chi tiết dịch vụ:</Text>
                      {renderServicesList()}
                    </View>

                    <View style={styles.pricingSummaryDivider} />

                    <View style={styles.sectionDetailRow}>
                      <Text style={styles.detailLabel}>Tổng phí dịch vụ:</Text>
                      <Text style={styles.detailValue}>
                        {(selectedItem.subtotal || selectedItem.total || 0).toLocaleString('vi-VN')} đ
                      </Text>
                    </View>

                    {selectedItem.tier_discount > 0 && (
                      <View style={styles.sectionDetailRow}>
                        <Text style={[styles.detailLabel, { color: GREEN }]}>Giảm giá hạng thành viên:</Text>
                        <Text style={[styles.detailValue, { color: GREEN }]}>
                          -{selectedItem.tier_discount.toLocaleString('vi-VN')} đ
                        </Text>
                      </View>
                    )}

                    {selectedItem.promotion_discount > 0 && (
                      <View style={styles.sectionDetailRow}>
                        <Text style={[styles.detailLabel, { color: GREEN }]}>Khuyến mãi khác:</Text>
                        <Text style={[styles.detailValue, { color: GREEN }]}>
                          -{selectedItem.promotion_discount.toLocaleString('vi-VN')} đ
                        </Text>
                      </View>
                    )}

                    {selectedItem.tax_amount > 0 && (
                      <View style={styles.sectionDetailRow}>
                        <Text style={styles.detailLabel}>Thuế VAT:</Text>
                        <Text style={styles.detailValue}>
                          {selectedItem.tax_amount.toLocaleString('vi-VN')} đ
                        </Text>
                      </View>
                    )}

                    <View style={styles.pricingSummaryDivider} />

                    <View style={[styles.sectionDetailRow, { marginTop: 4 }]}>
                      <Text style={[styles.detailLabel, { fontWeight: '700', color: DARK, fontSize: 13 }]}>Tổng thanh toán:</Text>
                      <Text style={[styles.detailValue, { fontWeight: '800', color: ROSE, fontSize: 16 }]}>
                        {(selectedItem.total || 0).toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Modal Bottom Close Action */}
                <View style={styles.modalFooterActions}>
                  <Pressable style={styles.btnModalClose} onPress={() => setSelectedItem(null)}>
                    <Text style={styles.btnModalCloseText}>Đóng</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Checklist Creation Modal popup */}
      {createChecklistBooking && (
        <CreateChecklistModal
          booking={createChecklistBooking}
          isOpen={!!createChecklistBooking}
          onClose={() => setCreateChecklistBooking(null)}
          onSuccess={() => {
            setCreateChecklistBooking(null);
            // Reload checklist state immediately
            if (selectedItem) {
              const appointmentId = selectedItem.appointment_id?._id || selectedItem.appointment_id || selectedItem._id;
              setLoadingChecklist(true);
              bookingService.getChecklist(appointmentId)
                .then(res => setChecklist(res))
                .catch(() => setChecklist(null))
                .finally(() => setLoadingChecklist(false));
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    backgroundColor: SURFACE,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DARK,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: GRAY,
    marginTop: 2,
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: SURFACE,
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  mainStatCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  mainStatVal: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  statBadgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  countBadge: {
    backgroundColor: 'rgba(6,182,212,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countBadgeText: {
    color: '#A5F3FC',
    fontSize: 11,
    fontWeight: '700',
  },
  subStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  subStatCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: GRAY,
    letterSpacing: 0.5,
  },
  subStatVal: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK,
    marginTop: 4,
  },
  dateFilterContainer: {
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateFilterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  dateFilterChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateFilterChipActive: {
    backgroundColor: 'rgba(6,182,212,0.08)',
    borderColor: CYAN,
  },
  dateFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: GRAY,
  },
  dateFilterChipTextActive: {
    color: CYAN,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    margin: 16,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: DARK,
    fontWeight: '500',
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
    color: GRAY,
  },
  overlayLoading: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  overlayLoadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: GRAY,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardCode: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  cardBody: {
    gap: 6,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  plateContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  plateText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E293B',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    paddingTop: 10,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    color: ROSE,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  btnDetail: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnDetailText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContent: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DARK,
  },
  modalStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  modalStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    marginBottom: 14,
  },
  sectionCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    paddingBottom: 6,
  },
  sectionCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E1B4B',
    letterSpacing: 0.5,
  },
  sectionDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: GRAY,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: DARK,
  },
  licenseBadge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  licenseBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 2,
  },
  checklistDateText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '700',
  },
  btnChecklistPdf: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  btnChecklistPdfText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyChecklistText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    paddingVertical: 2,
    marginBottom: 4,
  },
  btnCreateChecklist: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  btnCreateChecklistText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  servicesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    marginTop: 4,
  },
  detailTitleLabel: {
    fontSize: 11,
    color: GRAY,
    fontWeight: '600',
    marginBottom: 2,
  },
  modalServiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalServiceText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '700',
    flex: 1,
    paddingRight: 8,
  },
  modalServicePrice: {
    fontSize: 12,
    fontWeight: '700',
    color: DARK,
  },
  comboSubItemText: {
    fontSize: 11,
    color: '#64748B',
    paddingLeft: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  pricingSummaryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  modalFooterActions: {
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    paddingTop: 12,
  },
  btnModalClose: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnModalCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
