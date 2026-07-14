import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  ScrollView,
  Linking,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import CreateChecklistModal from '../../components/CreateChecklistModal';
import ViewChecklistModal from '../../components/ViewChecklistModal';
import PaymentModal from '../../components/PaymentModal';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuthService';
import bookingService, { Booking } from '../../services/bookingService';

const ImagePicker: any = require('expo-image-picker');

const { width } = Dimensions.get('window');

const CYAN = '#06B6D4';
const PURPLE = '#8B5CF6';
const GREEN = '#10B981';
const AMBER = '#F59E0B';
const ROSE = '#EF4444';
const DARK = '#0F172A';
const GRAY = '#64748B';
const SURFACE = '#FFFFFF';
const BG = '#F1F5F9';

// Status badging styles mapping
const getStatusStyles = (status: Booking['booking_status'] | 'washed') => {
  switch (status) {
    case 'pending':
      return { text: AMBER, bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)' };
    case 'confirmed':
      return { text: '#2563EB', bg: 'rgba(39,130,246,0.08)', border: 'rgba(39,130,246,0.18)' };
    case 'checked_in':
      return { text: PURPLE, bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.18)' };
    case 'in_progress':
      return { text: '#DB2777', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.18)' };
    case 'washed':
      return { text: '#0D9488', bg: 'rgba(13,148,136,0.08)', border: 'rgba(13,148,136,0.18)' };
    case 'completed':
      return { text: GREEN, bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)' };
    case 'cancelled':
      return { text: ROSE, bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.18)' };
    default:
      return { text: '#4B5563', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.18)' };
  }
};

const getStatusLabel = (status: any) => {
  switch (status) {
    case 'pending':
      return 'Chờ xác nhận';
    case 'confirmed':
      return 'Đã xác nhận';
    case 'checked_in':
      return 'Đã check-in';
    case 'in_progress':
      return 'Đang rửa xe';
    case 'washed':
      return 'Rửa xong';
    case 'completed':
      return 'Hoàn thành';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status;
  }
};

type TabType = 'pending' | 'active' | 'completed' | 'cancelled';

export default function StaffBookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [activeSubFilter, setActiveSubFilter] = useState<'all' | 'confirmed' | 'checked_in' | 'in_progress' | 'washed'>('all');
  const [showSubFilterDropdown, setShowSubFilterDropdown] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [createChecklistBooking, setCreateChecklistBooking] = useState<Booking | null>(null);
  const [viewChecklistBooking, setViewChecklistBooking] = useState<Booking | null>(null);
  const [checklist, setChecklist] = useState<any | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean, booking: Booking | null }>({ isOpen: false, booking: null });
  const [missingChecklistIds, setMissingChecklistIds] = useState<Set<string>>(new Set());
  const [loadingChecklists, setLoadingChecklists] = useState<Set<string>>(new Set());
  const [checkinMethodBooking, setCheckinMethodBooking] = useState<Booking | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [checkinFailureModal, setCheckinFailureModal] = useState<{
    visible: boolean;
    message: string;
    detectedPlate: string;
    booking: Booking;
  } | null>(null);
  const [failureManualPlate, setFailureManualPlate] = useState('');

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const list = await bookingService.list();
      // Sort bookings by date descending
      const sorted = [...list].sort((a, b) => {
        const dateA = new Date(a.scheduled_at).getTime();
        const dateB = new Date(b.scheduled_at).getTime();
        return dateB - dateA;
      });
      setBookings(sorted);

      // Check checklist status for 'confirmed' bookings
      const confirmed = sorted.filter((b) => b.booking_status === 'confirmed');
      if (confirmed.length > 0) {
        const confirmedIds = confirmed.map((b) => b._id);
        setLoadingChecklists(new Set(confirmedIds));

        const results = await Promise.all(
          confirmed.map(async (b) => {
            const id = b._id;
            try {
              const data = await bookingService.getChecklist(id);
              return { id, hasChecklist: !!data };
            } catch (err) {
              return { id, hasChecklist: false };
            }
          })
        );

        setMissingChecklistIds((prev) => {
          const newSet = new Set(prev);
          results.forEach((r) => {
            if (!r.hasChecklist) newSet.add(r.id);
            else newSet.delete(r.id);
          });
          return newSet;
        });

        setLoadingChecklists((prev) => {
          const newSet = new Set(prev);
          results.forEach((r) => newSet.delete(r.id));
          return newSet;
        });
      }
    } catch (err: any) {
      console.error('Fetch bookings error:', err);
      Alert.alert('Lỗi', 'Không thể tải danh sách lịch hẹn');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [user])
  );

  useEffect(() => {
    if (selectedBooking) {
      const fetchChecklist = async () => {
        setLoadingChecklist(true);
        try {
          const data = await bookingService.getChecklist(selectedBooking._id);
          setChecklist(data);
        } catch (error) {
          console.error('Error fetching checklist on staff bookings:', error);
          setChecklist(null);
        } finally {
          setLoadingChecklist(false);
        }
      };
      fetchChecklist();
    } else if (!viewChecklistBooking && !createChecklistBooking) {
      setChecklist(null);
    }
  }, [selectedBooking, viewChecklistBooking, createChecklistBooking]);

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

  const handleUpdateStatus = async (bookingId: string, action: 'confirm' | 'checkin' | 'start' | 'washed' | 'complete') => {
    if (action === 'checkin' && missingChecklistIds.has(bookingId)) {
      const matchingBooking = bookings.find(b => b._id === bookingId);
      Alert.alert(
        'Chưa tạo biên bản',
        'Vui lòng tạo biên bản kiểm tra xe trước khi check-in.',
        [
          { text: 'Quay lại', style: 'cancel' },
          {
            text: 'Tạo Biên bản',
            onPress: () => {
              if (matchingBooking) {
                setCreateChecklistBooking(matchingBooking);
              }
            }
          }
        ]
      );
      return;
    }

    let actionText = '';
    switch (action) {
      case 'confirm': actionText = 'xác nhận lịch hẹn'; break;
      case 'checkin': actionText = 'check-in nhận xe khách'; break;
      case 'start': actionText = 'bắt đầu rửa xe'; break;
      case 'washed': actionText = 'báo rửa xong'; break;
      case 'complete': actionText = 'hoàn thành đơn hàng'; break;
    }

    Alert.alert(
      'Xác nhận thao tác',
      `Bạn có chắc chắn muốn ${actionText} này?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý',
          onPress: async () => {
            try {
              setActionLoading(true);
              if (action === 'confirm') await bookingService.confirm(bookingId);
              else if (action === 'checkin') await bookingService.checkin(bookingId);
              else if (action === 'start') await bookingService.start(bookingId);
              else if (action === 'washed') await bookingService.washed(bookingId);

              Alert.alert('Thành công', 'Cập nhật trạng thái thành công');
              setSelectedBooking(null);
              fetchBookings();
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Cập nhật thất bại');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleScanLicensePlate = async (booking: Booking, source: 'camera' | 'library') => {
    try {
      let result;
      if (source === 'camera') {
        const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPerm.granted) {
          Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền sử dụng camera để quét biển số.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.8,
        });
      } else {
        const libraryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!libraryPerm.granted) {
          Alert.alert('Quyền truy cập', 'Vui lòng cho phép truy cập ảnh để chọn ảnh biển số.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: false,
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const imageUri = result.assets[0].uri;
      if (!imageUri) return;

      setIsScanning(true);

      const uriParts = imageUri.split('.');
      const fileExt = uriParts[uriParts.length - 1] || 'jpg';
      const mimeType = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : `image/${fileExt}`;
      const fileName = `checkin_camera.${fileExt}`;

      const response = await bookingService.checkinWithCamera(imageUri, mimeType, fileName);

      if (response.success) {
        // Double check if the checked-in booking is the one we wanted, or another one
        const scannedId = response.appointment_id || '';
        const selectedId = booking._id;
        
        if (scannedId === selectedId) {
          Alert.alert(
            'Check-in Thành Công!',
            `Đã check-in thành công đơn hàng #${selectedId.slice(-6).toUpperCase()} qua camera AI.`
          );
        } else {
          Alert.alert(
            'Check-in Thành Công!',
            `${response.message}\nBiển số: ${response.license_plate?.toUpperCase()}\nMã đơn: #${scannedId.slice(-6).toUpperCase()}`
          );
        }
        setCheckinMethodBooking(null);
        fetchBookings();
      } else {
        setCheckinFailureModal({
          visible: true,
          message: response.message || 'Không tìm thấy lịch hẹn trùng khớp cho biển số này.',
          detectedPlate: response.license_plate || '',
          booking: booking,
        });
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      const responseData = err.response?.data;
      const licensePlate = responseData?.license_plate || responseData?.data?.license_plate || '';
      const message = responseData?.message || err.message || 'Lỗi kết nối máy chủ AI hoặc hệ thống.';

      setCheckinFailureModal({
        visible: true,
        message: message,
        detectedPlate: licensePlate || '',
        booking: booking,
      });
    } finally {
      setIsScanning(false);
    }
  };

  const triggerScanOptions = (booking: Booking) => {
    Alert.alert(
      'Chọn nguồn ảnh',
      'Chọn phương thức để quét biển số xe',
      [
        { text: 'Chụp ảnh camera', onPress: () => handleScanLicensePlate(booking, 'camera') },
        { text: 'Chọn từ thư viện ảnh', onPress: () => handleScanLicensePlate(booking, 'library') },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  const handleFailureManualCheckin = async () => {
    if (!checkinFailureModal) return;
    const { booking } = checkinFailureModal;
    const typedPlate = failureManualPlate.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const bookingPlate = (booking.vehicle_id?.license_plate || booking.vehicle?.license_plate || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!typedPlate) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập biển số xe.');
      return;
    }

    if (typedPlate !== bookingPlate) {
      Alert.alert('Không khớp', 'Biển số xe nhập vào không khớp với lịch hẹn này.');
      return;
    }

    try {
      setActionLoading(true);
      await bookingService.checkin(booking._id);
      Alert.alert('Thành công', 'Check-in thành công');
      setCheckinFailureModal(null);
      setCheckinMethodBooking(null);
      setFailureManualPlate('');
      fetchBookings();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Check-in thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter((b) => {
    const status = b.booking_status;
    if (activeTab === 'pending') {
      return status === 'pending';
    } else if (activeTab === 'active') {
      const isStatusActive = status === 'confirmed' || status === 'checked_in' || status === 'in_progress' || (status as string) === 'washed';
      if (!isStatusActive) return false;
      if (activeSubFilter === 'all') return true;
      return status === activeSubFilter;
    } else if (activeTab === 'completed') {
      return status === 'completed';
    } else if (activeTab === 'cancelled') {
      return status === 'cancelled';
    }
    return false;
  });

  const getVehicleDisplayName = (vehicle: any) => {
    if (!vehicle) return 'Xe khách hàng';
    const brand = vehicle.brand || '';
    const model = vehicle.vehicle_model || '';
    const nameParts = [];
    if (brand) nameParts.push(brand);
    if (model) nameParts.push(model);
    return nameParts.length > 0 ? nameParts.join(' ') : 'Xe khách hàng';
  };

  const getBookingServicesList = (services: Booking['services']) => {
    if (!services || !Array.isArray(services)) return [];
    const list: { name: string; isCombo: boolean }[] = [];

    services.forEach((s: any) => {
      const pkg = s.service_package_id || s.service_package;
      const svc = s.service_id || s.service;

      if (pkg && typeof pkg === 'object') {
        const pName = (pkg as any).package_name || (pkg as any).service_name || (pkg as any).name;
        if (pName && !list.some(item => item.name === pName && item.isCombo)) {
          list.push({ name: pName, isCombo: true });
        }
      } else if (svc && typeof svc === 'object') {
        const sName = (svc as any).service_name || (svc as any).name;
        if (sName) {
          list.push({ name: sName, isCombo: false });
        }
      }
    });

    return list;
  };

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const scheduledDate = new Date(item.scheduled_at);
    const dayVal = String(scheduledDate.getDate()).padStart(2, '0');
    const monthVal = `T${scheduledDate.getMonth() + 1}`;
    const timeFormatted = scheduledDate.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const statusStyles = getStatusStyles(item.booking_status);
    const bookingServices = getBookingServicesList(item.services);
    const bookingVehicle = item.vehicle_id || item.vehicle;
    const bookingBranch = item.branch_id || item.branch;
    const vehicleName = getVehicleDisplayName(bookingVehicle);
    const shortId = item._id.slice(-6).toUpperCase();

    // Render action buttons based on status
    const renderActionBtn = () => {
      const status = item.booking_status;
      if (status === 'pending') {
        return (
          <Pressable
            style={styles.actionBtn}
            onPress={() => handleUpdateStatus(item._id, 'confirm')}>
            <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Xác nhận</Text>
          </Pressable>
        );
      } else if (status === 'confirmed') {
        if (loadingChecklists.has(item._id)) {
          return (
            <View style={[styles.actionBtn, { backgroundColor: '#94A3B8' }]}>
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.actionBtnText}>Đang tải...</Text>
            </View>
          );
        }
        if (missingChecklistIds.has(item._id)) {
          return (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: ROSE }]}
              onPress={() => setCreateChecklistBooking(item)}>
              <MaterialCommunityIcons name="file-document-outline" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Tạo Biên bản</Text>
            </Pressable>
          );
        }
        return (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: CYAN }]}
            onPress={() => setCheckinMethodBooking(item)}>
            <MaterialCommunityIcons name="qrcode-scan" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Check-in</Text>
          </Pressable>
        );
      } else if (status === 'checked_in') {
        return (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: CYAN }]}
            onPress={() => handleUpdateStatus(item._id, 'start')}>
            <MaterialCommunityIcons name="play" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Bắt đầu rửa</Text>
          </Pressable>
        );
      } else if (status === 'in_progress') {
        return (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: '#0D9488' }]}
            onPress={() => handleUpdateStatus(item._id, 'washed')}>
            <MaterialCommunityIcons name="water-check-outline" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Báo rửa xong</Text>
          </Pressable>
        );
      } else if ((status as string) === 'washed') {
        return (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: GREEN }]}
            onPress={() => setPaymentModal({ isOpen: true, booking: item })}>
            <MaterialCommunityIcons name="cash-register" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Thanh toán</Text>
          </Pressable>
        );
      }
      return null;
    };

    return (
      <Pressable style={styles.bookingCard} onPress={() => setSelectedBooking(item)}>
        <View style={styles.bookingHeader}>
          {/* Calendar Ticket */}
          <View style={styles.calendarBlock}>
            <View style={styles.calendarLeft}>
              <Text style={styles.calendarDay}>{dayVal}</Text>
              <Text style={styles.calendarMonth}>{monthVal}</Text>
            </View>
            <View style={styles.calendarRight}>
              <Text style={styles.calendarTime}>{timeFormatted}</Text>
              <Text style={styles.calendarYear}>{scheduledDate.getFullYear()}</Text>
            </View>
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusStyles.bg,
                borderColor: statusStyles.border,
                borderWidth: 1
              },
            ]}>
            <Text style={[styles.statusDot, { color: statusStyles.text }]}>●</Text>
            <Text style={[styles.statusText, { color: statusStyles.text }]}>
              {getStatusLabel(item.booking_status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardDividerContainer}>
          <View style={styles.dividerDot} />
          <View style={styles.cardDividerLine} />
          <View style={styles.dividerDot} />
        </View>

        <View style={styles.bookingDetails}>
          {/* ID & License Plate Row */}
          <View style={styles.idPlateRow}>
            <Text style={styles.bookingIdText}>Mã đơn: #{shortId}</Text>
            {bookingVehicle?.license_plate && (
              <View style={styles.plateContainer}>
                <View style={styles.plateInnerBorder}>
                  <View style={styles.plateRegistrationDot} />
                  <Text style={styles.plateText}>{bookingVehicle.license_plate.toUpperCase()}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Branch Section */}
          {bookingBranch?.branch_address && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={15} color={CYAN} style={styles.detailIcon} />
              <Text style={styles.detailText} numberOfLines={1}>
                {bookingBranch.branch_address.street}, {bookingBranch.branch_address.district}
              </Text>
            </View>
          )}

          {/* Vehicle Model */}
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="car-outline" size={15} color={PURPLE} style={styles.detailIcon} />
            <Text style={styles.detailText} numberOfLines={1}>{vehicleName}</Text>
          </View>

          {/* Services Section with Tags */}
          {bookingServices.length > 0 && (
            <View style={styles.servicesWrap}>
              {bookingServices.map((svc, i) => (
                <View
                  key={i}
                  style={[
                    styles.serviceChip,
                    svc.isCombo ? styles.comboServiceChip : styles.singleServiceChip
                  ]}
                >
                  <Text
                    style={[
                      styles.serviceChipText,
                      svc.isCombo ? styles.comboServiceChipText : styles.singleServiceChipText
                    ]}
                  >
                    {svc.isCombo ? `Combo: ${svc.name}` : svc.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Footer Actions */}
        <View style={styles.bookingFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceMetaLabel}>Tổng thu</Text>
            <Text style={styles.price}>{(item.final_price ?? 0).toLocaleString('vi-VN')} đ</Text>
          </View>
          <View style={styles.actionsBox}>
            {renderActionBtn()}
          </View>
        </View>
      </Pressable>
    );
  };

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'pending', label: 'Chờ duyệt', icon: 'clipboard-alert-outline' },
    { key: 'active', label: 'Đang làm', icon: 'progress-wrench' },
    { key: 'completed', label: 'Đã xong', icon: 'checkbox-marked-circle-outline' },
    { key: 'cancelled', label: 'Đã hủy', icon: 'close-circle-outline' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Quản Lý Lịch Hẹn</Text>
          <Text style={styles.headerSub}>Chào, {user?.full_name || 'Nhân viên'} (Staff)</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
          onPress={fetchBookings}>
          <Ionicons name="refresh" size={20} color={CYAN} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => {
                setActiveTab(tab.key);
                if (tab.key === 'active') setActiveSubFilter('all');
              }}>
              <MaterialCommunityIcons
                name={tab.icon}
                size={16}
                color={isActive ? '#FFFFFF' : GRAY}
                style={{ marginBottom: 2 }}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Sub Filters for Active Tab (Dropdown style) */}
      {activeTab === 'active' && (
        <>
          <Pressable
            style={styles.dropdownButton}
            onPress={() => setShowSubFilterDropdown(true)}
          >
            <Text style={styles.dropdownButtonText}>
              Trạng thái: <Text style={{ color: CYAN, fontWeight: '700' }}>
                {
                  activeSubFilter === 'all' ? 'Tất cả' :
                    activeSubFilter === 'confirmed' ? 'Đã xác nhận' :
                      activeSubFilter === 'checked_in' ? 'Đã nhận xe' :
                        activeSubFilter === 'in_progress' ? 'Đang rửa' :
                          'Rửa xong'
                }
              </Text>
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color={DARK} />
          </Pressable>

          <Modal visible={showSubFilterDropdown} transparent animationType="fade" onRequestClose={() => setShowSubFilterDropdown(false)}>
            <View style={styles.dropdownOverlay}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSubFilterDropdown(false)} />
              <View style={styles.dropdownMenu}>
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'confirmed', label: 'Đã xác nhận' },
                  { key: 'checked_in', label: 'Đã nhận xe' },
                  { key: 'in_progress', label: 'Đang rửa' },
                  { key: 'washed', label: 'Rửa xong' },
                ].map((filter, index) => (
                  <Pressable
                    key={filter.key}
                    style={[styles.dropdownItem, index !== 4 && styles.dropdownItemBorder]}
                    onPress={() => {
                      setActiveSubFilter(filter.key as any);
                      setShowSubFilterDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, activeSubFilter === filter.key && styles.dropdownItemTextActive]}>
                      {filter.label}
                    </Text>
                    {activeSubFilter === filter.key && (
                      <MaterialCommunityIcons name="check" size={18} color={CYAN} />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* Booking List */}
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={CYAN} />
          <Text style={styles.loadingText}>Đang tải lịch hẹn...</Text>
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.centerState}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>Không có lịch hẹn nào</Text>
          <Text style={styles.emptySubtext}>Không tìm thấy đơn hàng nào ở trạng thái này.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={fetchBookings}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Booking Detail Modal */}
      <Modal
        visible={!!selectedBooking}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedBooking(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedBooking(null)} />

          <View style={styles.modalContent}>
            {selectedBooking && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chi tiết lịch hẹn</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {loadingChecklist ? (
                      <ActivityIndicator size="small" color="#0891B2" />
                    ) : checklist ? (
                      <Pressable
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                        onPress={() => {
                          setViewChecklistBooking(selectedBooking);
                          setSelectedBooking(null);
                        }}
                      >
                        <Ionicons name="document-text" size={16} color="#0369A1" style={{ marginRight: 4 }} />
                        <Text style={{ color: '#0369A1', fontSize: 13, fontWeight: '700' }}>Biên bản</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0891B2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                        onPress={() => {
                          setCreateChecklistBooking(selectedBooking);
                          setSelectedBooking(null);
                        }}
                      >
                        <Ionicons name="document-text-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Tạo Biên bản</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => setSelectedBooking(null)} style={styles.closeBtn}>
                      <Ionicons name="close" size={24} color={DARK} />
                    </Pressable>
                  </View>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Trạng thái đơn</Text>
                    <View style={styles.modalStatusRow}>
                      <View style={[
                        styles.statusBadge,
                        {
                          backgroundColor: getStatusStyles(selectedBooking.booking_status).bg,
                          borderColor: getStatusStyles(selectedBooking.booking_status).border,
                          borderWidth: 1
                        }
                      ]}>
                        <Text style={[styles.statusDot, { color: getStatusStyles(selectedBooking.booking_status).text }]}>●</Text>
                        <Text style={[styles.statusText, { color: getStatusStyles(selectedBooking.booking_status).text }]}>
                          {getStatusLabel(selectedBooking.booking_status)}
                        </Text>
                      </View>
                      <Text style={styles.modalIdText}>#{selectedBooking._id.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Khách hàng & Phương tiện</Text>
                    <View style={styles.infoCard}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Khách hàng:</Text>
                        <Text style={styles.infoVal}>{selectedBooking.customer_id?.user_id?.full_name || 'Khách vãng lai'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Số điện thoại:</Text>
                        <Text style={styles.infoVal}>{selectedBooking.customer_id?.user_id?.phone || 'Không có'}</Text>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Biển số xe:</Text>
                        <Text style={[styles.infoVal, { fontWeight: '700' }]}>
                          {selectedBooking.vehicle_id?.license_plate?.toUpperCase() || selectedBooking.vehicle?.license_plate?.toUpperCase() || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Hiệu xe:</Text>
                        <Text style={styles.infoVal}>{getVehicleDisplayName(selectedBooking.vehicle_id || selectedBooking.vehicle)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Thời gian & Địa điểm</Text>
                    <View style={styles.infoCard}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Thời gian hẹn:</Text>
                        <Text style={styles.infoVal}>
                          {new Date(selectedBooking.scheduled_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedBooking.scheduled_at).toLocaleDateString('vi-VN')}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Cơ sở thực hiện:</Text>
                        <Text style={styles.infoVal} numberOfLines={2}>
                          {selectedBooking.branch_id?.branch_address?.street || selectedBooking.branch?.branch_address?.street}, {selectedBooking.branch_id?.branch_address?.district || selectedBooking.branch?.branch_address?.district}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Dịch vụ & Thanh toán</Text>
                    <View style={styles.infoCard}>
                      {(() => {
                        const combos: Record<string, { name: string, price: number, items: string[] }> = {};
                        const individuals: Array<{ name: string, price: number }> = [];

                        selectedBooking.services.forEach(svc => {
                          const pkg = svc.service_package_id || svc.service_package;
                          const service = svc.service_id || svc.service;
                          if (pkg) {
                            const pkgId = pkg._id;
                            if (!combos[pkgId]) {
                              combos[pkgId] = {
                                name: pkg.package_name || pkg.name || pkg.service_name || 'Combo',
                                price: 0,
                                items: []
                              };
                            }
                            combos[pkgId].price += svc.price_snapshot;
                            combos[pkgId].items.push(service?.service_name || 'Dịch vụ');
                          } else {
                            individuals.push({
                              name: service?.service_name || 'Dịch vụ',
                              price: svc.price_snapshot
                            });
                          }
                        });

                        return (
                          <View style={{ width: '100%', gap: 10 }}>
                            <Text style={[styles.infoLabel, { fontSize: 13, marginBottom: 4 }]}>Chi tiết dịch vụ:</Text>

                            {/* Render Combos */}
                            {Object.values(combos).map((combo, idx) => (
                              <View key={`combo-${idx}`} style={{ width: '100%', marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0891B2', flex: 1, paddingRight: 8 }}>
                                    {combo.name}
                                  </Text>
                                  <Text style={{ fontSize: 13, fontWeight: '600', color: DARK }}>
                                    {combo.price.toLocaleString('vi-VN')} đ
                                  </Text>
                                </View>
                                {combo.items.map((subItem, sIdx) => (
                                  <Text key={`sub-${sIdx}`} style={{ fontSize: 12, color: GRAY, marginLeft: 12, marginTop: 2 }}>
                                    • {subItem}
                                  </Text>
                                ))}
                              </View>
                            ))}

                            {/* Render Individuals */}
                            {individuals.map((ind, idx) => (
                              <View key={`ind-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 4 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: DARK, flex: 1, paddingRight: 8 }}>
                                  {ind.name}
                                </Text>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: DARK }}>
                                  {ind.price.toLocaleString('vi-VN')} đ
                                </Text>
                              </View>
                            ))}
                          </View>
                        );
                      })()}

                      <View style={styles.divider} />

                      {/* original base price */}
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Tổng phí dịch vụ:</Text>
                        <Text style={styles.infoVal}>
                          {(selectedBooking.base_price ?? selectedBooking.final_price ?? 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </View>

                      {/* Tier membership discount */}
                      {(() => {
                        const cust = (selectedBooking as any).customer_id || (selectedBooking as any).customer;
                        if (selectedBooking.applied_tier_discount !== undefined) {
                          if (selectedBooking.applied_tier_discount > 0) {
                            return (
                              <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Giảm giá hạng thành viên:</Text>
                                <Text style={[styles.infoVal, { color: GREEN }]}>
                                  -{selectedBooking.applied_tier_discount.toLocaleString('vi-VN')} đ
                                </Text>
                              </View>
                            );
                          }
                        } else if (cust?.tier_id?.discount_percentage) {
                          const base = selectedBooking.base_price ?? selectedBooking.final_price ?? 0;
                          const tierDiscAmount = Math.round(base * (cust.tier_id.discount_percentage / 100));
                          return (
                            <View style={styles.infoRow}>
                              <Text style={styles.infoLabel}>
                                Giảm giá hạng thành viên:
                              </Text>
                              <Text style={[styles.infoVal, { color: GREEN }]}>
                                -{tierDiscAmount.toLocaleString('vi-VN')} đ ({cust.tier_id.discount_percentage}%)
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })()}

                      {/* Other discounts */}
                      {(() => {
                        let purePromotionDiscount = 0;
                        if (selectedBooking.applied_promotion_discount !== undefined) {
                          purePromotionDiscount = selectedBooking.applied_promotion_discount;
                        } else {
                          const base = selectedBooking.base_price ?? selectedBooking.final_price ?? 0;
                          const cust = (selectedBooking as any).customer_id || (selectedBooking as any).customer;
                          const tierDiscPct = cust?.tier_id?.discount_percentage || 0;
                          const tierDiscAmount = Math.round(base * (tierDiscPct / 100));
                          purePromotionDiscount = Math.max(0, (selectedBooking.discount_amount || 0) - tierDiscAmount);
                        }

                        if (purePromotionDiscount > 0) {
                          return (
                            <View style={styles.infoRow}>
                              <Text style={styles.infoLabel}>Khuyến mãi khác:</Text>
                              <Text style={[styles.infoVal, { color: GREEN }]}>
                                -{purePromotionDiscount.toLocaleString('vi-VN')} đ
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })()}

                      <View style={styles.divider} />

                      {/* Final Price */}
                      <View style={[styles.infoRow, { marginTop: 4 }]}>
                        <Text style={[styles.infoLabel, { fontWeight: '700', color: DARK }]}>Tổng thanh toán (Dự kiến):</Text>
                        <Text style={[styles.infoVal, { fontWeight: '800', color: ROSE, fontSize: 16 }]}>
                          {(() => {
                            const base = selectedBooking.base_price ?? selectedBooking.final_price ?? 0;

                            let totalDiscount = 0;
                            if (selectedBooking.applied_tier_discount !== undefined || selectedBooking.applied_promotion_discount !== undefined) {
                              totalDiscount = (selectedBooking.applied_tier_discount || 0) + (selectedBooking.applied_promotion_discount || 0);
                            } else if (selectedBooking.discount_amount !== undefined) {
                              totalDiscount = selectedBooking.discount_amount;
                            } else {
                              const cust = (selectedBooking as any).customer_id || (selectedBooking as any).customer;
                              const discPct = cust?.tier_id?.discount_percentage || 0;
                              totalDiscount = Math.round(base * (discPct / 100));
                            }

                            const finalPrice = Math.max(0, base - totalDiscount);
                            return finalPrice.toLocaleString('vi-VN');
                          })()} đ
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                {/* Bottom Action inside modal */}
                <View style={styles.modalFooter}>
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={CYAN} style={{ alignSelf: 'center', padding: 12 }} />
                  ) : (
                    <>
                      {selectedBooking.booking_status === 'pending' && (
                        <Pressable style={styles.modalActionBtn} onPress={() => handleUpdateStatus(selectedBooking._id, 'confirm')}>
                          <Text style={styles.modalActionBtnText}>Xác nhận đơn hàng</Text>
                        </Pressable>
                      )}
                      {selectedBooking.booking_status === 'confirmed' && (
                        missingChecklistIds.has(selectedBooking._id) ? (
                          <Pressable
                            style={[styles.modalActionBtn, { backgroundColor: ROSE }]}
                            onPress={() => {
                              setCreateChecklistBooking(selectedBooking);
                              setSelectedBooking(null);
                            }}
                          >
                            <Text style={styles.modalActionBtnText}>Tạo Biên bản</Text>
                          </Pressable>
                        ) : (
                          <Pressable style={[styles.modalActionBtn, { backgroundColor: CYAN }]} onPress={() => { setSelectedBooking(null); setCheckinMethodBooking(selectedBooking); }}>
                            <Text style={styles.modalActionBtnText}>Check-in</Text>
                          </Pressable>
                        )
                      )}
                      {selectedBooking.booking_status === 'checked_in' && (
                        <Pressable style={[styles.modalActionBtn, { backgroundColor: CYAN }]} onPress={() => handleUpdateStatus(selectedBooking._id, 'start')}>
                          <Text style={styles.modalActionBtnText}>Bắt đầu rửa xe</Text>
                        </Pressable>
                      )}
                      {selectedBooking.booking_status === 'in_progress' && (
                        <Pressable style={[styles.modalActionBtn, { backgroundColor: '#0D9488' }]} onPress={() => handleUpdateStatus(selectedBooking._id, 'washed')}>
                          <Text style={styles.modalActionBtnText}>Báo cáo Rửa xong</Text>
                        </Pressable>
                      )}
                      {(selectedBooking.booking_status as string) === 'washed' && (
                        <Pressable style={[styles.modalActionBtn, { backgroundColor: GREEN }]} onPress={() => { setSelectedBooking(null); setPaymentModal({ isOpen: true, booking: selectedBooking }); }}>
                          <Text style={styles.modalActionBtnText}>Hoàn thành & Thu tiền</Text>
                        </Pressable>
                      )}
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {createChecklistBooking && (
        <CreateChecklistModal
          booking={createChecklistBooking}
          isOpen={!!createChecklistBooking}
          onClose={() => {
            setCreateChecklistBooking(null);
            setSelectedBooking(createChecklistBooking); // Re-open detail modal on close
          }}
          onSuccess={() => {
            setCreateChecklistBooking(null);
            fetchBookings();
          }}
        />
      )}

      {checklist && viewChecklistBooking && (
        <ViewChecklistModal
          checklist={checklist}
          isOpen={!!viewChecklistBooking}
          onClose={() => {
            setViewChecklistBooking(null);
            setSelectedBooking(viewChecklistBooking);
          }}
        />
      )}

      {/* Payment Modal for Staff */}
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal({ isOpen: false, booking: null })}
        booking={paymentModal.booking}
        onSuccess={() => {
          setPaymentModal({ isOpen: false, booking: null });
          fetchBookings();
        }}
      />

      {/* CHỌN PHƯƠNG THỨC CHECK-IN MODAL */}
      {checkinMethodBooking && (
        <Modal
          visible={!!checkinMethodBooking}
          transparent
          animationType="fade"
          onRequestClose={() => setCheckinMethodBooking(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setCheckinMethodBooking(null)} />
            <View style={styles.checkinMethodModalContent}>
              <Text style={styles.checkinMethodTitle}>Phương thức Check-in</Text>
              <Text style={styles.checkinMethodDesc}>
                Đơn <Text style={{ fontWeight: '700' }}>#{(checkinMethodBooking._id).slice(-6).toUpperCase()}</Text> đã có biên bản kiểm tra. Vui lòng chọn cách check-in:
              </Text>
              <View style={{ gap: 12 }}>
                {isScanning ? (
                  <View style={[styles.checkinMethodBtn, { backgroundColor: CYAN }]}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={[styles.checkinMethodBtnText, { color: '#FFFFFF' }]}>Đang quét...</Text>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.checkinMethodBtn, { backgroundColor: CYAN }]}
                    onPress={() => {
                      setCheckinMethodBooking(null);
                      triggerScanOptions(checkinMethodBooking);
                    }}
                  >
                    <MaterialCommunityIcons name="camera" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={[styles.checkinMethodBtnText, { color: '#FFFFFF' }]}>Quét bằng Camera AI</Text>
                  </Pressable>
                )}

                <Pressable
                  style={[styles.checkinMethodBtn, { backgroundColor: '#F1F5F9' }]}
                  onPress={() => {
                    const booking = checkinMethodBooking;
                    setCheckinMethodBooking(null);
                    handleUpdateStatus(booking._id, 'checkin');
                  }}
                >
                  <MaterialCommunityIcons name="check-circle-outline" size={18} color={DARK} style={{ marginRight: 8 }} />
                  <Text style={[styles.checkinMethodBtnText, { color: DARK }]}>Check-in thủ công</Text>
                </Pressable>

                <Pressable
                  style={styles.checkinMethodCancelBtn}
                  onPress={() => setCheckinMethodBooking(null)}
                >
                  <Text style={styles.checkinMethodCancelText}>Hủy bỏ</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* CHECK-IN FAILURE MANUAL RETRY MODAL */}
      {checkinFailureModal && (
        <Modal
          visible={checkinFailureModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setCheckinFailureModal(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalOverlay}>
              <Pressable style={styles.modalBackdrop} onPress={() => setCheckinFailureModal(null)} />
              <View style={styles.checkinFailureModalContent}>
                <View style={styles.checkinFailureHeader}>
                  <Ionicons name="close-circle" size={48} color={ROSE} style={{ marginBottom: 12 }} />
                  <Text style={styles.checkinFailureTitle}>Thất bại</Text>
                  <Text style={styles.checkinFailureDesc}>{checkinFailureModal.message}</Text>
                </View>

                <TextInput
                  style={styles.checkinFailureInput}
                  placeholder="NHẬP LẠI BIỂN SỐ BẰNG TAY"
                  placeholderTextColor="#94A3B8"
                  value={failureManualPlate}
                  onChangeText={setFailureManualPlate}
                  autoCapitalize="characters"
                />

                <View style={{ gap: 12, marginTop: 8 }}>
                  <Pressable
                    style={[styles.checkinFailureBtn, { backgroundColor: '#1E293B' }]}
                    onPress={handleFailureManualCheckin}
                  >
                    <Text style={[styles.checkinFailureBtnText, { color: '#FFFFFF' }]}>Check-in</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.checkinFailureBtn, { backgroundColor: '#F1F5F9' }]}
                    onPress={() => {
                      setCheckinFailureModal(null);
                      setFailureManualPlate('');
                    }}
                  >
                    <Text style={[styles.checkinFailureBtnText, { color: DARK }]}>Đóng</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(6,182,212,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: CYAN,
    borderColor: CYAN,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: GRAY,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    color: GRAY,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: GRAY,
    textAlign: 'center',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  bookingCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarLeft: {
    backgroundColor: 'rgba(6,182,212,0.08)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.15)',
  },
  calendarDay: {
    fontSize: 16,
    fontWeight: '800',
    color: CYAN,
  },
  calendarMonth: {
    fontSize: 9,
    fontWeight: '800',
    color: CYAN,
    textTransform: 'uppercase',
  },
  calendarRight: {
    marginLeft: 10,
  },
  calendarTime: {
    fontSize: 15,
    fontWeight: '700',
    color: DARK,
  },
  calendarYear: {
    fontSize: 11,
    color: GRAY,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    fontSize: 8,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BG,
  },
  cardDividerLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  bookingDetails: {
    gap: 8,
  },
  idPlateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  bookingIdText: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
  },
  plateContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  plateInnerBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#94A3B8',
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  plateRegistrationDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
    marginRight: 4,
  },
  plateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  servicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  serviceChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  comboServiceChip: {
    backgroundColor: 'rgba(6,182,212,0.06)',
    borderColor: 'rgba(6,182,212,0.18)',
  },
  singleServiceChip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  serviceChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  comboServiceChipText: {
    color: CYAN,
  },
  singleServiceChipText: {
    color: GRAY,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 12,
    paddingTop: 12,
  },
  priceContainer: {
    flex: 1,
  },
  priceMetaLabel: {
    fontSize: 10,
    color: GRAY,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: ROSE,
  },
  actionsBox: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  modalContent: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DARK,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: GRAY,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  modalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalIdText: {
    fontSize: 14,
    fontWeight: '700',
    color: GRAY,
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: GRAY,
    fontWeight: '500',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  modalFooter: {
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    paddingTop: 16,
  },
  modalActionBtn: {
    width: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#475569',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 180,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#475569',
  },
  dropdownItemTextActive: {
    color: CYAN,
    fontWeight: '700',
  },
  checkinMethodModalContent: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  checkinMethodTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DARK,
    marginBottom: 8,
  },
  checkinMethodDesc: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 20,
    lineHeight: 20,
  },
  checkinMethodBtn: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinMethodBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  checkinMethodCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 10,
  },
  checkinMethodCancelText: {
    fontSize: 14,
    color: GRAY,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  checkinFailureModalContent: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  checkinFailureHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  checkinFailureTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DARK,
    marginBottom: 6,
  },
  checkinFailureDesc: {
    fontSize: 14,
    color: GRAY,
    textAlign: 'center',
    lineHeight: 20,
  },
  checkinFailureInput: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
    textAlign: 'center',
    marginBottom: 16,
  },
  checkinFailureBtn: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinFailureBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
