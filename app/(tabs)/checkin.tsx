import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  ScrollView,
  Modal,
  Platform,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuthService';
import bookingService, { Booking } from '../../services/bookingService';
import CreateChecklistModal from '../../components/CreateChecklistModal';
import ViewChecklistModal from '../../components/ViewChecklistModal';

const ImagePicker: any = require('expo-image-picker');

const { width } = Dimensions.get('window');

const CYAN = '#06B6D4';
const PURPLE = '#8B5CF6';
const GREEN = '#10B981';
const ROSE = '#EF4444';
const DARK = '#0F172A';
const GRAY = '#64748B';
const SURFACE = '#FFFFFF';
const BG = '#F1F5F9';

// Status badging styles mapping
const getStatusStyles = (status: Booking['booking_status'] | 'washed') => {
  switch (status) {
    case 'pending': return { text: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)' };
    case 'confirmed': return { text: '#2563EB', bg: 'rgba(39,130,246,0.08)', border: 'rgba(39,130,246,0.18)' };
    case 'arrived': return { text: '#0284C7', bg: 'rgba(2,132,199,0.08)', border: 'rgba(2,132,199,0.18)' };
    case 'checked_in': return { text: PURPLE, bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.18)' };
    case 'in_progress': return { text: '#DB2777', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.18)' };
    case 'washed': return { text: '#0D9488', bg: 'rgba(13,148,136,0.08)', border: 'rgba(13,148,136,0.18)' };
    case 'completed': return { text: GREEN, bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)' };
    case 'cancelled': return { text: ROSE, bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.18)' };
    default: return { text: '#4B5563', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.18)' };
  }
};

const getStatusLabel = (status: any) => {
  switch (status) {
    case 'pending': return 'Chờ xác nhận';
    case 'confirmed': return 'Đã xác nhận';
    case 'arrived': return 'Xe đã tới';
    case 'checked_in': return 'Đã check-in';
    case 'in_progress': return 'Đang rửa xe';
    case 'washed': return 'Rửa xong';
    case 'completed': return 'Hoàn thành';
    case 'cancelled': return 'Đã hủy';
    default: return status;
  }
};

export default function CheckinScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualPlate, setManualPlate] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [createChecklistBooking, setCreateChecklistBooking] = useState<Booking | null>(null);
  const [viewChecklistBooking, setViewChecklistBooking] = useState<Booking | null>(null);
  const [checkinMethodBooking, setCheckinMethodBooking] = useState<Booking | null>(null);

  const [checklist, setChecklist] = useState<any | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [missingChecklistIds, setMissingChecklistIds] = useState<Set<string>>(new Set());
  const [loadingChecklists, setLoadingChecklists] = useState<Set<string>>(new Set());
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
      // Keep 'confirmed' and 'arrived' status bookings (waiting for check-in)
      const confirmed = list.filter((b) => b.booking_status === 'confirmed' || b.booking_status === 'arrived');
      setBookings(confirmed);

      // Check checklist status for 'confirmed' bookings
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
      console.error('Fetch bookings checkin error:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  useEffect(() => {
    if (selectedBooking) {
      const fetchChecklist = async () => {
        setLoadingChecklist(true);
        try {
          const data = await bookingService.getChecklist(selectedBooking._id);
          setChecklist(data);
        } catch (error) {
          console.error('Error fetching checklist on checkin:', error);
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

  const handleManualCheckin = async () => {
    const plate = manualPlate.trim().toLowerCase();
    if (!plate) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập biển số xe.');
      return;
    }

    const matchingBooking = bookings.find((b) => {
      const bPlate = b.vehicle_id?.license_plate || b.vehicle?.license_plate || '';
      return bPlate.toLowerCase().replace(/[^a-z0-9]/g, '') === plate.replace(/[^a-z0-9]/g, '');
    });

    if (!matchingBooking) {
      Alert.alert('Không tìm thấy', 'Không tìm thấy xe đang chờ nhận với biển số này.');
      return;
    }

    if (missingChecklistIds.has(matchingBooking._id)) {
      Alert.alert(
        'Chưa tạo biên bản',
        'Vui lòng tạo biên bản kiểm tra xe trước khi check-in.',
        [
          { text: 'Quay lại', style: 'cancel' },
          {
            text: 'Tạo Biên bản',
            onPress: () => {
              setCreateChecklistBooking(matchingBooking);
            }
          }
        ]
      );
      return;
    }

    try {
      setIsScanning(true);
      await bookingService.checkin(matchingBooking._id);
      Alert.alert('Thành công', `Đã check-in thành công cho xe ${matchingBooking.vehicle_id?.license_plate?.toUpperCase() || ''}`);
      setManualPlate('');
      fetchBookings();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Check-in thất bại');
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanLicensePlate = async (booking?: Booking, source?: 'camera' | 'library') => {
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
        // Double check if the checked-in booking is the one we wanted
        const scannedId = response.appointment_id || '';
        const selectedId = booking?._id;
        
        if (selectedId && scannedId === selectedId) {
          Alert.alert(
            'Check-in Thành Công!',
            `Đã check-in thành công đơn hàng ${booking?.appointment_code || `#${selectedId.slice(-6).toUpperCase()}`} qua camera AI.`
          );
        } else {
          const scannedBooking = bookings.find(b => b._id === scannedId);
          const scannedCode = scannedBooking?.appointment_code || `#${scannedId.slice(-6).toUpperCase()}`;
          Alert.alert(
            'Check-in Thành Công!',
            `${response.message}\nBiển số: ${response.license_plate?.toUpperCase()}\nMã đơn: ${scannedCode}`
          );
        }
        setCheckinMethodBooking(null);
        fetchBookings();
      } else {
        if (booking) {
          setCheckinFailureModal({
            visible: true,
            message: response.message || 'Không tìm thấy lịch hẹn trùng khớp cho biển số này.',
            detectedPlate: response.license_plate || '',
            booking: booking,
          });
        } else {
          if (response.license_plate) {
            setManualPlate(response.license_plate.toUpperCase());
          }
          Alert.alert(
            'Không tìm thấy lịch hẹn',
            `${response.message || 'Nhận diện biển số thành công nhưng không tìm thấy lịch hẹn trùng khớp.'}\n\nBiển số nhận diện được: ${response.license_plate?.toUpperCase() || ''}\n\nBạn có thể chỉnh sửa biển số trên màn hình để check-in thủ công.`
          );
        }
      }
    } catch (err: any) {
      console.error('Scan error:', err);

      const responseData = err.response?.data;
      const licensePlate = responseData?.license_plate || responseData?.data?.license_plate || '';
      const message = responseData?.message || err.message || 'Lỗi kết nối máy chủ AI hoặc hệ thống.';

      if (booking) {
        setCheckinFailureModal({
          visible: true,
          message: message,
          detectedPlate: licensePlate || '',
          booking: booking,
        });
      } else {
        if (licensePlate) {
          setManualPlate(licensePlate.toUpperCase());
          Alert.alert(
            'Không tìm thấy lịch hẹn',
            `${message}\n\nBiển số nhận diện được: ${licensePlate.toUpperCase()}\n\nBạn có thể chỉnh sửa biển số trên màn hình và bấm check-in lại.`
          );
        } else {
          Alert.alert(
            'Lỗi quét biển số',
            `${message}\n\nKhông nhận diện được biển số từ ảnh. Vui lòng nhập biển số bằng tay bên dưới để check-in.`
          );
        }
      }
    } finally {
      setIsScanning(false);
    }
  };

  const triggerScanOptions = (booking?: Booking) => {
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

  const handleActionCheckin = async (bookingId: string, plate: string) => {
    Alert.alert(
      'Xác nhận check-in',
      `Bạn có chắc chắn muốn check-in cho xe ${plate.toUpperCase()}?`,
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Check-in',
          onPress: async () => {
            try {
              setIsScanning(true);
              await bookingService.checkin(bookingId);
              Alert.alert('Thành công', 'Check-in thành công');
              setSelectedBooking(null);
              fetchBookings();
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Check-in thất bại');
            } finally {
              setIsScanning(false);
            }
          },
        },
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
      setIsScanning(true);
      await bookingService.checkin(booking._id);
      Alert.alert('Thành công', 'Check-in thành công');
      setCheckinFailureModal(null);
      setCheckinMethodBooking(null);
      setFailureManualPlate('');
      fetchBookings();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Check-in thất bại');
    } finally {
      setIsScanning(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const plate = (b.vehicle_id?.license_plate || b.vehicle?.license_plate || '').toLowerCase();
    const shortId = b._id.slice(-6).toLowerCase();
    const apptCode = b.appointment_code?.toLowerCase() || '';
    return plate.includes(q) || shortId.includes(q) || b._id.toLowerCase().includes(q) || apptCode.includes(q);
  });

  const getVehicleDisplayName = (vehicle: any) => {
    if (!vehicle) return 'Xe khách';
    const brand = vehicle.brand || '';
    const model = vehicle.vehicle_model || '';
    return brand || model ? `${brand} ${model}`.trim() : 'Xe khách';
  };

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const bookingVehicle = item.vehicle_id || item.vehicle;
    const plate = bookingVehicle?.license_plate || 'N/A';
    const shortId = item.appointment_code || `#${item._id.slice(-6).toUpperCase()}`;
    const scheduledDate = new Date(item.scheduled_at);
    const timeFormatted = scheduledDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = scheduledDate.toLocaleDateString('vi-VN');
    const serviceName = item.services[0]?.service_package_id?.package_name || item.services[0]?.service_package?.name || item.services[0]?.service_id?.service_name || item.services[0]?.service?.service_name || 'Dịch vụ';

    return (
      <Pressable style={styles.bookingCard} onPress={() => setSelectedBooking(item)}>
        <View style={styles.cardHeader}>
          <View style={styles.plateContainer}>
            <View style={styles.plateInnerBorder}>
              <View style={styles.plateRegistrationDot} />
              <Text style={styles.plateText}>{plate.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.bookingIdText}>Mã: {shortId}</Text>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBody}>
          <View style={styles.bodyRow}>
            <MaterialCommunityIcons name="clock-outline" size={15} color={GRAY} style={{ marginRight: 6 }} />
            <Text style={styles.bodyText}>{timeFormatted} - {dateFormatted}</Text>
          </View>
          <View style={styles.bodyRow}>
            <MaterialCommunityIcons name="car-outline" size={15} color={GRAY} style={{ marginRight: 6 }} />
            <Text style={styles.bodyText}>{getVehicleDisplayName(bookingVehicle)}</Text>
          </View>
          <View style={styles.bodyRow}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={15} color={GRAY} style={{ marginRight: 6 }} />
            <Text style={styles.bodyText} numberOfLines={1}>{serviceName}</Text>
          </View>
        </View>

        {loadingChecklists.has(item._id) ? (
          <View style={[styles.cardBtn, { backgroundColor: '#94A3B8' }]}>
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.cardBtnText}>Đang tải...</Text>
          </View>
        ) : missingChecklistIds.has(item._id) ? (
          <Pressable
            style={({ pressed }) => [styles.cardBtn, { backgroundColor: ROSE }, pressed && { opacity: 0.85 }]}
            onPress={() => setCreateChecklistBooking(item)}>
            <MaterialCommunityIcons name="file-document-outline" size={16} color="#FFFFFF" />
            <Text style={styles.cardBtnText}>Tạo Biên bản</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.cardBtn, pressed && { opacity: 0.85 }]}
            onPress={() => setCheckinMethodBooking(item)}>
            <MaterialCommunityIcons name="qrcode-scan" size={16} color="#FFFFFF" />
            <Text style={styles.cardBtnText}>Check-in</Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Check-in Xe</Text>
          <Text style={styles.headerSub}>Điểm danh và nhận xe của khách hàng</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
          onPress={fetchBookings}>
          <Ionicons name="refresh" size={20} color={PURPLE} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* List of Waiting Cars */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listSectionTitle}>Xe đang đợi Check-in ({filteredBookings.length})</Text>
          </View>

          {/* Search Box */}
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={GRAY} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm theo biển số, mã đơn..."
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

          {loading ? (
            <ActivityIndicator size="large" color={PURPLE} style={{ marginVertical: 30 }} />
          ) : filteredBookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="car-connected" size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>Không có xe nào đang chờ</Text>
              <Text style={styles.emptySubtext}>Tất cả các lịch hẹn hôm nay đã được check-in hoặc chưa đến giờ.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredBookings}
              renderItem={renderBookingItem}
              keyExtractor={(item) => item._id}
              scrollEnabled={false} // Since nested inside ScrollView
              contentContainerStyle={{ gap: 16 }}
            />
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

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
                      <Text style={styles.modalIdText}>{selectedBooking.appointment_code || `#${selectedBooking._id.slice(-6).toUpperCase()}`}</Text>
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

                        selectedBooking.services.forEach((svc: any) => {
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

                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Tổng phí dịch vụ:</Text>
                        <Text style={styles.infoVal}>
                          {(selectedBooking.base_price ?? 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </View>

                      {selectedBooking.customer_id?.tier_id?.discount_percentage ? (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>
                            Hạng {selectedBooking.customer_id.tier_id.tier_name || 'thành viên'}:
                          </Text>
                          <Text style={[styles.infoVal, { color: GREEN }]}>
                            -{selectedBooking.customer_id.tier_id.discount_percentage}%
                          </Text>
                        </View>
                      ) : null}

                      {selectedBooking.discount_amount ? (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Khuyến mãi khác:</Text>
                          <Text style={[styles.infoVal, { color: GREEN }]}>
                            -{selectedBooking.discount_amount.toLocaleString('vi-VN')} đ
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.divider} />

                      <View style={[styles.infoRow, { marginTop: 4 }]}>
                        <Text style={[styles.infoLabel, { fontWeight: '700', color: DARK }]}>Tổng thanh toán:</Text>
                        <Text style={[styles.infoVal, { fontWeight: '800', color: ROSE, fontSize: 16 }]}>
                          {(() => {
                            const base = selectedBooking.base_price ?? 0;
                            const discPct = selectedBooking.customer_id?.tier_id?.discount_percentage || 0;
                            const otherDisc = selectedBooking.discount_amount || 0;

                            if (selectedBooking.final_price !== undefined) {
                              return selectedBooking.final_price.toLocaleString('vi-VN');
                            }

                            const finalPrice = Math.max(0, base - Math.round(base * (discPct / 100)) - otherDisc);
                            return finalPrice.toLocaleString('vi-VN');
                          })()} đ
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  {isScanning ? (
                    <ActivityIndicator size="small" color={CYAN} style={{ alignSelf: 'center', padding: 12 }} />
                  ) : missingChecklistIds.has(selectedBooking._id) ? (
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
                    <Pressable
                      style={[styles.modalActionBtn, { backgroundColor: CYAN }]}
                      onPress={() => {
                        setSelectedBooking(null);
                        setCheckinMethodBooking(selectedBooking);
                      }}
                    >
                      <Text style={styles.modalActionBtnText}>Check-in</Text>
                    </Pressable>
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
                Đơn <Text style={{ fontWeight: '700' }}>{checkinMethodBooking.appointment_code || `#${(checkinMethodBooking._id).slice(-6).toUpperCase()}`}</Text> đã có biên bản kiểm tra. Vui lòng chọn cách check-in:
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
                    const plate = booking.vehicle_id?.license_plate || booking.vehicle?.license_plate || '';
                    setCheckinMethodBooking(null);
                    handleActionCheckin(booking._id, plate);
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
    backgroundColor: 'rgba(139,92,246,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  actionCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  cardGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(139,92,246,0.25)',
    filter: 'blur(30px)',
  },
  actionCardContent: {
    gap: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(165,243,252,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    color: '#A5F3FC',
    fontSize: 11,
    fontWeight: '700',
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  actionDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  scanBtn: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  scanBtnDisabled: {
    backgroundColor: '#475569',
    shadowOpacity: 0,
    elevation: 0,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
  },
  inputBtn: {
    backgroundColor: DARK,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBtnDisabled: {
    backgroundColor: '#64748B',
  },
  inputBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  listSection: {
    marginTop: 10,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: GRAY,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: DARK,
    fontWeight: '500',
  },
  emptyContainer: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    color: DARK,
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 12,
    color: GRAY,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  bookingCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  bookingIdText: {
    fontSize: 13,
    fontWeight: '700',
    color: GRAY,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  cardBody: {
    gap: 6,
    marginBottom: 12,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bodyText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  cardBtn: {
    width: '100%',
    backgroundColor: CYAN,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
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
    flexDirection: 'row',
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
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
