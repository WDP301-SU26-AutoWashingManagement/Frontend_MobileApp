import React, { useState, useCallback } from 'react';
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
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuthService';
import bookingService, { Booking } from '../../services/bookingService';

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

export default function CheckinScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualPlate, setManualPlate] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const list = await bookingService.list();
      // Only keep 'confirmed' status bookings (waiting for check-in)
      const confirmed = list.filter((b) => b.booking_status === 'confirmed');
      setBookings(confirmed);
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

  const handleManualCheckin = async () => {
    const plate = manualPlate.trim().toLowerCase();
    if (!plate) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập biển số xe.');
      return;
    }

    // Find if there is a confirmed booking with this plate
    const matchingBooking = bookings.find((b) => {
      const bPlate = b.vehicle_id?.license_plate || b.vehicle?.license_plate || '';
      return bPlate.toLowerCase().replace(/[^a-z0-9]/g, '') === plate.replace(/[^a-z0-9]/g, '');
    });

    if (!matchingBooking) {
      Alert.alert('Không tìm thấy', 'Không tìm thấy xe đang chờ nhận với biển số này.');
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

  const handleScanLicensePlate = async (source: 'camera' | 'library') => {
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
        Alert.alert(
          'Check-in Thành Công!',
          `${response.message}\nBiển số: ${response.license_plate?.toUpperCase()}\nMã đơn: #${response.appointment_id?.slice(-6).toUpperCase()}`
        );
        fetchBookings();
      } else {
        if (response.license_plate) {
          setManualPlate(response.license_plate.toUpperCase());
        }
        Alert.alert(
          'Không tìm thấy lịch hẹn',
          `${response.message || 'Nhận diện biển số thành công nhưng không tìm thấy lịch hẹn trùng khớp.'}\n\nBiển số nhận diện được: ${response.license_plate?.toUpperCase() || ''}\n\nBạn có thể chỉnh sửa biển số trên màn hình để check-in thủ công.`
        );
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      
      const responseData = err.response?.data;
      const licensePlate = responseData?.license_plate || responseData?.data?.license_plate || '';
      const message = responseData?.message || err.message || 'Lỗi kết nối máy chủ AI hoặc hệ thống.';

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
    } finally {
      setIsScanning(false);
    }
  };

  const triggerScanOptions = () => {
    Alert.alert(
      'Chọn nguồn ảnh',
      'Chọn phương thức để quét biển số xe',
      [
        { text: 'Chụp ảnh camera', onPress: () => handleScanLicensePlate('camera') },
        { text: 'Chọn từ thư viện ảnh', onPress: () => handleScanLicensePlate('library') },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  const handleActionCheckin = async (bookingId: string, plate: string) => {
    Alert.alert(
      'Xác nhận nhận xe',
      `Bạn có chắc chắn muốn check-in nhận xe ${plate.toUpperCase()}?`,
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Nhận xe',
          onPress: async () => {
            try {
              setIsScanning(true);
              await bookingService.checkin(bookingId);
              Alert.alert('Thành công', 'Nhận xe thành công');
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

  // Filter bookings based on search query
  const filteredBookings = bookings.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const plate = (b.vehicle_id?.license_plate || b.vehicle?.license_plate || '').toLowerCase();
    const shortId = b._id.slice(-6).toLowerCase();
    return plate.includes(q) || shortId.includes(q) || b._id.toLowerCase().includes(q);
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
    const shortId = item._id.slice(-6).toUpperCase();
    const scheduledDate = new Date(item.scheduled_at);
    const timeFormatted = scheduledDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = scheduledDate.toLocaleDateString('vi-VN');
    const serviceName = item.services[0]?.service_package_id?.package_name || item.services[0]?.service_package?.name || item.services[0]?.service_id?.service_name || item.services[0]?.service?.service_name || 'Dịch vụ';

    return (
      <View style={styles.bookingCard}>
        <View style={styles.cardHeader}>
          <View style={styles.plateContainer}>
            <View style={styles.plateInnerBorder}>
              <View style={styles.plateRegistrationDot} />
              <Text style={styles.plateText}>{plate.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.bookingIdText}>Mã: #{shortId}</Text>
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

        <Pressable 
          style={({ pressed }) => [styles.cardBtn, pressed && { opacity: 0.85 }]}
          onPress={() => handleActionCheckin(item._id, plate)}>
          <MaterialCommunityIcons name="check-circle-outline" size={16} color="#FFFFFF" />
          <Text style={styles.cardBtnText}>Xác nhận Nhận xe</Text>
        </Pressable>
      </View>
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
        {/* Camera Quick Action Card */}
        <View style={styles.actionCard}>
          <View style={styles.cardGlow} />
          <View style={styles.actionCardContent}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="robot" size={14} color="#A5F3FC" />
              <Text style={styles.badgeText}>AI nhận diện biển số</Text>
            </View>
            <Text style={styles.actionTitle}>Quét Biển Số Tự Động</Text>
            <Text style={styles.actionDesc}>Chụp ảnh biển số xe để hệ thống tự động tìm lịch hẹn và làm thủ tục check-in.</Text>
            
            {isScanning ? (
              <View style={[styles.scanBtn, styles.scanBtnDisabled]}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.scanBtnText}>Đang phân tích ảnh...</Text>
              </View>
            ) : (
              <Pressable style={({ pressed }) => [styles.scanBtn, pressed && { opacity: 0.9 }]} onPress={triggerScanOptions}>
                <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.scanBtnText}>QUÉT BIỂN SỐ XE</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Manual Checkin Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nhận xe thủ công</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Nhập biển số (ví dụ: 30F-12345)"
              placeholderTextColor="#94A3B8"
              value={manualPlate}
              onChangeText={setManualPlate}
              autoCapitalize="characters"
              editable={!isScanning}
            />
            <Pressable 
              style={({ pressed }) => [styles.inputBtn, pressed && { opacity: 0.85 }, isScanning && styles.inputBtnDisabled]}
              onPress={handleManualCheckin}
              disabled={isScanning}>
              {isScanning ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.inputBtnText}>Check-in</Text>
              )}
            </Pressable>
          </View>
        </View>

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
    backgroundColor: PURPLE,
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
});
