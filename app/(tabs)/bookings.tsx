import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuthService';

// Services
import bookingService, { Booking, CreateBookingPayload } from '../../services/bookingService';
import promotionService, { Promotion } from '../../services/promotionService';
import vehicleService, { Vehicle } from '../../services/vehicleService';
import branchService, { Branch } from '../../services/branchService';
import servicePackageService from '../../services/servicePackageService';

const { width } = Dimensions.get('window');

// Status badging styles mapping
const getStatusStyles = (status: Booking['booking_status']) => {
  switch (status) {
    case 'pending':
      return { text: '#D97706', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)' };
    case 'confirmed':
      return { text: '#2563EB', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.18)' };
    case 'arrived':
      return { text: '#0284C7', bg: 'rgba(2,132,199,0.08)', border: 'rgba(2,132,199,0.18)' };
    case 'checked_in':
      return { text: '#7C3AED', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.18)' };
    case 'in_progress':
      return { text: '#DB2777', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.18)' };
    case 'washed':
      return { text: '#0D9488', bg: 'rgba(13,148,136,0.08)', border: 'rgba(13,148,136,0.18)' };
    case 'completed':
      return { text: '#059669', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)' };
    case 'cancelled':
      return { text: '#DC2626', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.18)' };
    default:
      return { text: '#4B5563', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.18)' };
  }
};

const getStatusLabel = (status: Booking['booking_status']) => {
  switch (status) {
    case 'pending':
      return 'Chờ xác nhận';
    case 'confirmed':
      return 'Đã xác nhận';
    case 'arrived':
      return 'Xe đã tới';
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

export default function BookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [makes, setMakes] = useState<any[]>([]);

  const tierDiscountPercentage = useMemo(() => {
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

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const [list, fetchedModels, fetchedMakes] = await Promise.all([
        bookingService.list(),
        vehicleService.getVehicleModels().catch(() => []),
        vehicleService.getMakes().catch(() => []),
      ]);
      // Sort bookings: pending/confirmed/in_progress first, then by date descending
      const sorted = [...list].sort((a, b) => {
        const dateA = new Date(a.scheduled_at).getTime();
        const dateB = new Date(b.scheduled_at).getTime();
        return dateB - dateA;
      });
      setBookings(sorted);
      setModels(fetchedModels);
      setMakes(fetchedMakes);
    } catch (err: any) {
      console.error('Fetch bookings error:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );



  const handleCancelBooking = (bookingId: string) => {
    Alert.alert(
      'Hủy lịch rửa xe',
      'Bạn có chắc chắn muốn hủy lịch rửa xe này không?',
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Hủy lịch',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await bookingService.cancel(bookingId, 'Khách hàng hủy trên ứng dụng di động');
              Alert.alert('Thành công', 'Đã hủy lịch rửa xe thành công');
              fetchBookings();
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể hủy lịch');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderServiceNames = (services: Booking['services']) => {
    if (!services || !Array.isArray(services)) return '';
    const combos: string[] = [];
    const singles: string[] = [];

    services.forEach((s: any) => {
      const pkg = s.service_package_id || s.service_package;
      const svc = s.service_id || s.service;

      if (pkg && typeof pkg === 'object') {
        const pName = `[Combo] ${(pkg as any).package_name || (pkg as any).service_name || (pkg as any).name}`;
        if (!combos.includes(pName)) combos.push(pName);
      } else if (svc && typeof svc === 'object') {
        singles.push((svc as any).service_name);
      }
    });

    return [...combos, ...singles].join(', ');
  };

  const getVehicleDisplayName = (vehicle: any) => {
    if (!vehicle) return 'Xe của tôi';
    
    // Look up model
    const modelId = typeof vehicle.model_id === 'object' ? vehicle.model_id?._id : vehicle.model_id;
    const modelObj = models.find(m => m._id === modelId) || (typeof vehicle.model_id === 'object' ? vehicle.model_id : null);
    const modelName = modelObj?.model_name || '';

    // Look up make
    const makeId = modelObj ? (typeof modelObj.make_id === 'object' ? modelObj.make_id?._id : modelObj.make_id) : '';
    const makeObj = makes.find(m => m._id === makeId) || (modelObj && typeof modelObj.make_id === 'object' ? modelObj.make_id : null);
    const makeName = makeObj?.make_name || '';

    const specName = vehicle.vehicle_model || '';

    const nameParts = [];
    if (makeName) nameParts.push(makeName);
    if (modelName) nameParts.push(modelName);
    if (specName) nameParts.push(specName);

    return nameParts.length > 0 ? nameParts.join(' ') : 'Xe của tôi';
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
    const basePrice = item.services.reduce((sum, s) => sum + s.price_snapshot, 0);
    
    // Get tier discount percentage from populated customer details or fallback to current user's
    const itemCustomer = item.customer_id as any;
    const itemTier = itemCustomer?.tier_id;
    const bookingTierDiscountPercentage = (itemTier && typeof itemTier === 'object' && 'discount_percentage' in itemTier)
      ? (itemTier.discount_percentage || 0)
      : tierDiscountPercentage;

    let totalDiscount = 0;
    if (item.applied_tier_discount !== undefined || item.applied_promotion_discount !== undefined) {
      totalDiscount = (item.applied_tier_discount || 0) + (item.applied_promotion_discount || 0);
    } else if (item.discount_amount !== undefined) {
      totalDiscount = item.discount_amount;
    } else {
      totalDiscount = Math.round(basePrice * (bookingTierDiscountPercentage / 100));
    }

    const finalPrice = Math.max(0, basePrice - totalDiscount);
    
    const scheduledDate = new Date(item.scheduled_at);
    // Date parts for high-tech calendar ticket
    const dayVal = String(scheduledDate.getDate()).padStart(2, '0');
    const monthVal = `T${scheduledDate.getMonth() + 1}`;
    const timeFormatted = scheduledDate.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const canCancel = item.booking_status === 'pending' || item.booking_status === 'confirmed';
    const statusStyles = getStatusStyles(item.booking_status);
    const bookingServices = getBookingServicesList(item.services);
    
    // Resolve populated vehicle_id or vehicle fallback
    const bookingVehicle = item.vehicle_id || item.vehicle;
    const bookingBranch = item.branch_id || item.branch;
    const vehicleName = getVehicleDisplayName(bookingVehicle);

    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          {/* Calendar Block */}
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

          {/* Glowing Status Badge */}
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

        {/* High-tech divider with side indents */}
        <View style={styles.cardDividerContainer}>
          <View style={styles.dividerDot} />
          <View style={styles.cardDividerLine} />
          <View style={styles.dividerDot} />
        </View>

        <View style={styles.bookingDetails}>
          {/* Branch Section */}
          {bookingBranch?.branch_address && (
            <View style={styles.detailItem}>
              <View style={styles.detailIconWrapper}>
                <MaterialCommunityIcons name="map-marker-radius-outline" size={16} color="#06B6D4" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Cơ sở rửa xe</Text>
                <Text style={styles.detailText} numberOfLines={1}>
                  {bookingBranch.branch_address.street}, {bookingBranch.branch_address.district}
                </Text>
              </View>
            </View>
          )}

          {/* Vehicle Section with Plate Badge */}
          <View style={styles.detailItem}>
            <View style={styles.detailIconWrapper}>
              <MaterialCommunityIcons name="car-outline" size={16} color="#8B5CF6" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Phương tiện</Text>
              <View style={styles.vehicleRow}>
                {bookingVehicle?.license_plate && (
                  <View style={styles.plateContainer}>
                    <View style={styles.plateInnerBorder}>
                      <View style={styles.plateRegistrationDot} />
                      <Text style={styles.plateText}>{bookingVehicle.license_plate.toUpperCase()}</Text>
                    </View>
                  </View>
                )}
                <Text style={styles.vehicleModelText} numberOfLines={1}>
                  {vehicleName}
                </Text>
              </View>
            </View>
          </View>

          {/* Services Section with Tags */}
          {bookingServices.length > 0 && (
            <View style={styles.detailItem}>
              <View style={styles.detailIconWrapper}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={16} color="#10B981" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Gói dịch vụ & Dịch vụ lẻ</Text>
                <View style={styles.servicesWrap}>
                  {bookingServices.map((svc, i) => (
                    <View 
                      key={i} 
                      style={[
                        styles.serviceChip, 
                        svc.isCombo ? styles.comboServiceChip : styles.singleServiceChip
                      ]}
                    >
                      <MaterialCommunityIcons 
                        name={svc.isCombo ? "star-face" : "check-circle-outline"} 
                        size={12} 
                        color={svc.isCombo ? "#0891B2" : "#64748B"} 
                        style={{ marginRight: 4 }}
                      />
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
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.bookingFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceMetaLabel}>Tổng thanh toán</Text>
            {finalPrice < basePrice ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.price, { textDecorationLine: 'line-through', fontSize: 13, color: '#94A3B8' }]}>
                  {basePrice.toLocaleString('vi-VN')} đ
                </Text>
                <Text style={styles.price}>
                  {finalPrice.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            ) : (
              <Text style={styles.price}>{finalPrice.toLocaleString('vi-VN')} đ</Text>
            )}
          </View>
          
          <View style={styles.actions}>
            {canCancel && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn, 
                  styles.cancelBtn,
                  pressed && { opacity: 0.7 }
                ]}
                onPress={() => handleCancelBooking(item._id || item.id!)}>
                <MaterialCommunityIcons name="calendar-remove-outline" size={16} color="#EF4444" />
                <Text style={styles.cancelBtnText}>Hủy lịch</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Lịch Rửa Xe</Text>
          <Text style={styles.headerSub}>Theo dõi và đặt lịch hẹn tự động</Text>
        </View>
        {user?.role === 'customer' && (
          <Pressable
            style={({ pressed }) => [styles.bookButton, pressed && { opacity: 0.85 }]}
            onPress={() => setShowModal(true)}>
            <MaterialCommunityIcons name="calendar-plus" size={20} color="#FFFFFF" />
            <Text style={styles.bookButtonText}>Đặt lịch</Text>
          </Pressable>
        )}
      </View>

      {loading && bookings.length === 0 ? (
        <View style={styles.loadingState}>
          <View style={styles.pulseContainer}>
            <ActivityIndicator size="large" color="#06B6D4" />
          </View>
          <Text style={styles.loadingText}>Đang tải lịch đặt...</Text>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={44} color="#06B6D4" />
          </View>
          <Text style={styles.emptyText}>Gara chưa hẹn lịch</Text>
          <Text style={styles.emptySubtext}>Hiện chưa có dịch vụ nào được lên lịch hẹn rửa xe trong tương lai.</Text>
          {user?.role === 'customer' && (
            <Pressable
              style={({ pressed }) => [styles.emptyButton, pressed && { opacity: 0.85 }]}
              onPress={() => setShowModal(true)}>
              <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Đặt lịch rửa xe</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={fetchBookings}
          showsVerticalScrollIndicator={false}
        />
      )}

      <BookingWizardModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false);
          fetchBookings();
        }}
        router={router}
      />


    </View>
  );
}

// ----------------------------------------------------
// MULTI-STEP WIZARD BOOKING MODAL
// ----------------------------------------------------
interface BookingWizardModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  router: any;
}

const MAX_PRICE_DISCOUNT_PERCENTAGE = 50;

function computePromotionDiscount(basePrice: number, promotion: Promotion): number {
  if (basePrice <= 0) return 0;
  const raw =
    promotion.discount_type === 'percentage'
      ? basePrice * (promotion.discount_value / 100)
      : promotion.discount_value;
  const maxDiscount = basePrice * (MAX_PRICE_DISCOUNT_PERCENTAGE / 100);
  return Math.min(Math.max(0, raw), maxDiscount);
}

function estimateBookingPrice(basePrice: number, promotion?: Promotion | null, tierDiscountPct: number = 0) {
  const tierDiscount = Math.round(basePrice * (tierDiscountPct / 100));
  const priceAfterTier = basePrice - tierDiscount;
  const promoDiscount = promotion ? computePromotionDiscount(priceAfterTier, promotion) : 0;
  return {
    basePrice,
    tierDiscount,
    promoDiscount,
    discount: tierDiscount + promoDiscount,
    finalPrice: Math.max(0, basePrice - (tierDiscount + promoDiscount)),
  };
}

function BookingWizardModal({ visible, onClose, onSuccess, router }: BookingWizardModalProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const { user } = useAuth();

  const tierDiscountPercentage = useMemo(() => {
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

  // Form options data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [comboPackages, setComboPackages] = useState<any[]>([]);
  const [individualServices, setIndividualServices] = useState<any[]>([]);

  // Selected values
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Available Slots state
  const [apiSlots, setApiSlots] = useState<{ timeStr: string; available_bays: number }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [lastFetchedDate, setLastFetchedDate] = useState<string>('');

  // AI Recommendation values
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);

  // Step 2 values
  const [activeTab, setActiveTab] = useState<'combo' | 'single'>('combo');
  const [selectedComboId, setSelectedComboId] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Step 3 values
  const [promoCode, setPromoCode] = useState('');
  const [validatedPromo, setValidatedPromo] = useState<Promotion | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Customer Tier Booking Window (in days)
  const bookingWindowDays = useMemo(() => {
    const tier = user?.role_data?.tier_id;
    if (tier && typeof tier === 'object' && 'booking_window_days' in tier && typeof (tier as any).booking_window_days === 'number') {
      return (tier as any).booking_window_days || 7;
    }
    return 7;
  }, [user]);

  // Date list generation (based on tier booking_window_days)
  const datesList = useMemo(() => {
    const list = [];
    const today = new Date();
    const daysCount = Math.max(1, bookingWindowDays);
    for (let i = 0; i <= daysCount; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push(d);
    }
    return list;
  }, [bookingWindowDays]);

  const formatDateLabel = (d: Date) => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayName = d.getDay() === 0 ? 'CN' : days[d.getDay()];
    const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
    const fullDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { dayName, dateStr, fullDateStr };
  };

  // Fetch available slots from backend
  useEffect(() => {
    let active = true;
    if (!selectedBranchId || !selectedDate) {
      setApiSlots([]);
      setLastFetchedDate('');
      return;
    }
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await bookingService.getAvailableSlots(selectedBranchId, selectedDate);
        if (!active) return;

        const mapped = res.map((slot: any) => {
          const d = new Date(slot.scheduled_at);
          const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          return { timeStr, available_bays: slot.available_bays };
        });
        setApiSlots(mapped);
        setLastFetchedDate(selectedDate);
      } catch (err) {
        console.error("Lỗi khi lấy danh sách slot trống trong Mobile:", err);
      } finally {
        if (active) setLoadingSlots(false);
      }
    };
    fetchSlots();
    return () => {
      active = false;
    };
  }, [selectedBranchId, selectedDate]);

  // Adjust selectedTime if it is no longer valid in fetched slots
  useEffect(() => {
    if (selectedDate !== lastFetchedDate) return;

    if (apiSlots.length > 0 && selectedDate) {
      const isValid = apiSlots.some(s => s.timeStr === selectedTime);
      if (!isValid) {
        setSelectedTime(apiSlots[0].timeStr);
      }
    } else if (apiSlots.length === 0 && selectedDate) {
      setSelectedTime('');
    }
  }, [apiSlots, selectedDate, selectedTime, lastFetchedDate]);

  // Derived available slots
  const availableSlots = useMemo(() => {
    return apiSlots.map(s => s.timeStr);
  }, [apiSlots]);

  // Load backend form selections on open
  useEffect(() => {
    if (!visible) return;

    const loadOptions = async () => {
      setLoadingData(true);
      try {
        const [branchList, vehicleRes, packageList, servicesList] = await Promise.all([
          branchService.list(),
          vehicleService.getMyVehicles(1, 100),
          servicePackageService.list({ is_active: true, limit: 100 }),
          servicePackageService.listActiveServices(),
        ]);

        setBranches(branchList);
        setVehicles(vehicleRes.vehicles);
        setIndividualServices(servicesList);

        // Fetch detailed services for combos to compute price & content
        const combosWithServices = await Promise.all(
          packageList.map(async (combo) => {
            const id = combo._id || combo.id || '';
            const services = await servicePackageService.listDetailedServicesByPackage(id);
            const basePrice = services.reduce((sum, s) => sum + (Number(s.service_price) || 0), 0);
            const discountPct = combo.package_discount_percentage || 0;
            const finalPrice = Math.max(0, basePrice * (1 - discountPct / 100));
            return { ...combo, services, finalPrice };
          })
        );
        setComboPackages(combosWithServices);

        // Set default selects
        const firstActiveBranch = branchList.find(b => b.is_active !== false);
        if (firstActiveBranch && firstActiveBranch._id) {
          setSelectedBranchId(firstActiveBranch._id);
        } else if (branchList.length > 0 && branchList[0]._id) {
          setSelectedBranchId(branchList[0]._id);
        }
        if (vehicleRes.vehicles.length > 0 && vehicleRes.vehicles[0]._id) {
          setSelectedVehicleId(vehicleRes.vehicles[0]._id);
        }

        // Set default date as today
        const todayLabel = formatDateLabel(datesList[0]);
        setSelectedDate(todayLabel.fullDateStr);
      } catch (err: any) {
        console.error('Error loading booking options:', err);
        Alert.alert('Lỗi', 'Không thể tải dữ liệu cấu hình đặt lịch');
      } finally {
        setLoadingData(false);
      }
    };

    loadOptions();
  }, [visible, datesList]);

  // Sync default time slot when date or slots change
  useEffect(() => {
    if (availableSlots.length > 0) {
      if (!selectedTime || !availableSlots.includes(selectedTime)) {
        setSelectedTime(availableSlots[0]);
      }
    } else {
      setSelectedTime('');
    }
  }, [availableSlots, selectedTime]);

  // Fetch AI recommendation when vehicle or branch changes
  useEffect(() => {
    if (!visible || !selectedVehicleId) {
      setRecommendation(null);
      return;
    }

    let isMounted = true;
    const fetchReco = async () => {
      setLoadingRecommendation(true);
      try {
        const res = await bookingService.getRecommendation(selectedVehicleId, selectedBranchId || undefined);
        if (isMounted) {
          setRecommendation(res);
        }
      } catch (err) {
        if (isMounted) {
          setRecommendation(null);
        }
      } finally {
        if (isMounted) {
          setLoadingRecommendation(false);
        }
      }
    };

    fetchReco();
    return () => {
      isMounted = false;
    };
  }, [selectedVehicleId, selectedBranchId, visible]);

  const handleApplyRecommendation = async () => {
    if (!recommendation) return;

    // 1. Auto-fill branch
    if (recommendation.branch_id) {
      setSelectedBranchId(recommendation.branch_id);
    }

    // 2. Auto-fill time
    if (recommendation.suggested_scheduled_at) {
      const d = new Date(recommendation.suggested_scheduled_at);
      const yyyy = d.getFullYear();
      const MM = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      
      setSelectedDate(`${yyyy}-${MM}-${dd}`);
      setSelectedTime(`${hh}:${mm}`);
    }

    // 3. Auto-fill combo/services
    let comboId = '';
    const serviceIds: string[] = [];
    if (Array.isArray(recommendation.recommended_items)) {
      recommendation.recommended_items.forEach((item: any) => {
        if (item.service_package_id) {
          comboId = item.service_package_id;
        } else if (item.service_id) {
          serviceIds.push(item.service_id);
        }
      });
    }
    setSelectedComboId(comboId);
    setSelectedServiceIds(serviceIds);

    // 4. Auto-fill promotion
    if (recommendation.applicable_promotion) {
      const promo = recommendation.applicable_promotion;
      setPromoCode(promo.code || promo.promotion_code || '');
      setValidatingPromo(true);
      setPromoError('');
      try {
        const { promotion, message } = await promotionService.validateCode(promo.code || promo.promotion_code);
        setValidatedPromo(promotion);
        setPromoCode(promotion.promotion_code);
      } catch (err: any) {
        setValidatedPromo(null);
        setPromoError(err.message || 'Mã khuyến mãi không hợp lệ');
      } finally {
        setValidatingPromo(false);
      }
    } else {
      setValidatedPromo(null);
      setPromoCode('');
    }

    Alert.alert('Thành công', 'Đã áp dụng cấu hình Gợi ý Thông minh!');
    setStep(2);
  };

  const selectedCombo = useMemo(() => {
    return comboPackages.find(c => (c._id || c.id) === selectedComboId);
  }, [comboPackages, selectedComboId]);

  const includedServiceIdsInCombo = useMemo(() => {
    if (!selectedCombo || !selectedCombo.services) return [];
    return selectedCombo.services.map((s: any) => s._id || s.id);
  }, [selectedCombo]);

  // Identify default washing service from individual services
  const washingService = useMemo(() => {
    return individualServices.find(
      s => s.service_name === 'Dịch vụ rửa xe' || s.service_name?.toLowerCase() === 'dịch vụ rửa xe'
    );
  }, [individualServices]);

  const washingServiceId = useMemo(() => {
    return washingService ? (washingService._id || washingService.id || '') : '';
  }, [washingService]);

  // Calculated Pricing Estimate
  const priceEstimate = useMemo(() => {
    let totalBasePrice = 0;
    if (selectedCombo) {
      totalBasePrice += selectedCombo.finalPrice;
    }

    // Always include default washing service price if available and not already inside selected combo
    if (washingServiceId && !includedServiceIdsInCombo.includes(washingServiceId)) {
      totalBasePrice += Number(washingService?.service_price) || 0;
    }

    selectedServiceIds.forEach(id => {
      // Exclude service if it is already in the selected combo or is the default washing service (already added above)
      if (!includedServiceIdsInCombo.includes(id) && id !== washingServiceId) {
        const svc = individualServices.find(s => (s._id || s.id) === id);
        if (svc) {
          totalBasePrice += Number(svc.service_price) || 0;
        }
      }
    });

    if (totalBasePrice === 0) return null;
    return estimateBookingPrice(totalBasePrice, validatedPromo, tierDiscountPercentage);
  }, [selectedServiceIds, selectedCombo, validatedPromo, individualServices, includedServiceIdsInCombo, tierDiscountPercentage, washingServiceId, washingService]);

  const handleApplyPromotion = async () => {
    if (!promoCode.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập mã khuyến mãi');
      return;
    }

    setValidatingPromo(true);
    setPromoError('');
    try {
      const { promotion, message } = await promotionService.validateCode(promoCode);
      setValidatedPromo(promotion);
      setPromoCode(promotion.promotion_code);
      Alert.alert('Thành công', message || 'Đã áp dụng mã khuyến mãi');
    } catch (err: any) {
      setValidatedPromo(null);
      setPromoError(err.message || 'Mã khuyến mãi không hợp lệ');
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!selectedBranchId || !selectedVehicleId || !selectedDate || !selectedTime) {
        Alert.alert('Thông báo', 'Vui lòng chọn chi nhánh, phương tiện, ngày và giờ');
        return;
      }
    }
    if (step === 2) {
      const hasDefaultWashing = !!washingServiceId;
      if (!selectedComboId && selectedServiceIds.length === 0 && !hasDefaultWashing) {
        Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một Combo hoặc Dịch vụ lẻ');
        return;
      }
    }
    setStep(s => Math.min(s + 1, 3));
  };

  const handlePrev = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const handleCreateSubmit = async () => {
    if (saving) return;

    setSaving(true);
    try {
      const servicesPayload: { service_id: string; service_package_id?: string }[] = [];

      // Always include default washing service if not in combo
      if (washingServiceId && !includedServiceIdsInCombo.includes(washingServiceId)) {
        servicesPayload.push({ service_id: washingServiceId });
      }

      // Selected individual services
      selectedServiceIds.forEach(id => {
        // Only add if not already in the combo and not the washing service
        if (!includedServiceIdsInCombo.includes(id) && id !== washingServiceId) {
          servicesPayload.push({ service_id: id });
        }
      });

      // Selected combo package services
      if (selectedComboId && includedServiceIdsInCombo.length > 0) {
        includedServiceIdsInCombo.forEach((id: string) => {
          servicesPayload.push({
            service_id: id,
            service_package_id: selectedComboId,
          });
        });
      }

      // Construct local date values
      const [year, month, day] = selectedDate.split('-').map(Number);
      const [hour, minute] = selectedTime.split(':').map(Number);
      const scheduledAtLocal = new Date(year, month - 1, day, hour, minute);

      const payload: CreateBookingPayload = {
        branch_id: selectedBranchId,
        vehicle_id: selectedVehicleId,
        scheduled_at: scheduledAtLocal.toISOString(),
        services: servicesPayload,
        booking_source: 'app',
        ...(validatedPromo ? { promotion_id: validatedPromo._id || validatedPromo.id } : {}),
      };

      await bookingService.create(payload);
      Alert.alert('Thành công', 'Đặt lịch rửa xe thành công!');

      // Reset form variables
      setSelectedBranchId('');
      setSelectedVehicleId('');
      setSelectedComboId('');
      setSelectedServiceIds([]);
      setValidatedPromo(null);
      setPromoCode('');
      setStep(1);

      onSuccess();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Đặt lịch rửa xe thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleService = (serviceId: string) => {
    if (includedServiceIdsInCombo.includes(serviceId)) return; // Don't let users toggle combo services
    if (washingServiceId && serviceId === washingServiceId) return; // Don't let users toggle default washing service

    setSelectedServiceIds(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleSelectCombo = (comboId: string, services: any[]) => {
    setSelectedComboId(prev => {
      const nextComboId = prev === comboId ? '' : comboId;
      
      // Auto deselect individual services that are included in this selected combo
      if (nextComboId) {
        const comboServices = services.map(s => s._id || s.id);
        setSelectedServiceIds(prevServices => prevServices.filter(sid => !comboServices.includes(sid)));
      }
      return nextComboId;
    });
  };

  const selectedBranch = branches.find(b => b._id === selectedBranchId);
  const selectedVehicle = vehicles.find(v => v._id === selectedVehicleId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Đặt lịch trực tuyến</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#0F172A" />
            </Pressable>
          </View>

          {/* Progress Tracker Stepper */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
                {step > 1 ? (
                  <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                ) : (
                  <Text style={styles.stepNumText}>1</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, step >= 1 && styles.stepLabelActive]}>Cơ bản</Text>
            </View>

            <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />

            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
                {step > 2 ? (
                  <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                ) : (
                  <Text style={styles.stepNumText}>2</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, step >= 2 && styles.stepLabelActive]}>Dịch vụ</Text>
            </View>

            <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />

            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, step >= 3 && styles.stepCircleActive]}>
                <Text style={styles.stepNumText}>3</Text>
              </View>
              <Text style={[styles.stepLabel, step >= 3 && styles.stepLabelActive]}>Xác nhận</Text>
            </View>
          </View>

          {loadingData ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#06B6D4" />
              <Text style={styles.loadingText}>Đang tải dữ liệu cấu hình...</Text>
            </View>
          ) : (
            <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
              
              {/* STEP 1: BASIC INFO */}
              {step === 1 && (
                <View style={styles.formSection}>
                  {/* Select Branch */}
                  <View style={styles.formGroup}>
                    <Text style={styles.sectionTitle}>
                      <MaterialCommunityIcons name="map-marker" size={16} color="#06B6D4" /> Chọn chi nhánh phục vụ *
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardScroll}>
                      {branches.map((b) => {
                        const isSelected = selectedBranchId === b._id;
                        const isInactive = b.is_active === false;
                        const address = b.branch_address
                          ? `${b.branch_address.street}, ${b.branch_address.district}, ${b.branch_address.city}`
                          : 'Chưa có địa chỉ';
                        return (
                          <Pressable
                            key={b._id}
                            disabled={isInactive}
                            onPress={() => setSelectedBranchId(b._id || '')}
                            style={[
                              styles.branchCard,
                              isSelected && styles.branchCardActive,
                              isInactive && styles.branchCardInactive,
                            ]}>
                            <View style={styles.cardSelectHeader}>
                              <Text style={[styles.branchTitle, isInactive && styles.textInactive]}>
                                Chi nhánh {b.branch_address?.district}
                              </Text>
                              {isSelected && <MaterialCommunityIcons name="check-circle" size={18} color="#06B6D4" />}
                              {isInactive && (
                                <View style={styles.inlineStatusBadgeInactive}>
                                  <Text style={styles.inlineStatusBadgeInactiveText}>Tạm đóng</Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.branchAddress, isInactive && styles.textInactive]} numberOfLines={2}>{address}</Text>
                            <Text style={[styles.branchPhone, isInactive && styles.textInactive]}>📞 {b.branch_phone || 'N/A'}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Select Vehicle */}
                  <View style={styles.formGroup}>
                    <Text style={styles.sectionTitle}>
                      <MaterialCommunityIcons name="car" size={16} color="#06B6D4" /> Chọn xe của bạn *
                    </Text>
                    {vehicles.length === 0 ? (
                      <View style={styles.noVehiclesContainer}>
                        <Text style={styles.noVehiclesText}>Bạn chưa thêm phương tiện nào.</Text>
                        <Pressable
                          style={styles.addVehicleBtn}
                          onPress={() => {
                            onClose();
                            router.push('/(tabs)/vehicles');
                          }}>
                          <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
                          <Text style={styles.addVehicleText}>Thêm xe mới</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardScroll}>
                        {vehicles.map((v) => {
                          const isSelected = selectedVehicleId === v._id;
                          return (
                            <Pressable
                              key={v._id}
                              onPress={() => setSelectedVehicleId(v._id)}
                              style={[styles.vehicleCard, isSelected && styles.vehicleCardActive]}>
                              <View style={styles.cardSelectHeader}>
                                <Text style={styles.vehiclePlate}>{v.license_plate}</Text>
                                {isSelected && <MaterialCommunityIcons name="check-circle" size={18} color="#06B6D4" />}
                              </View>
                              <Text style={styles.vehicleModel}>{v.vehicle_model || 'Xe của tôi'}</Text>
                              <Text style={styles.vehicleColor}>Màu sắc: {v.color || 'N/A'}</Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  {/* Auto-Pilot Booking Gợi ý AI */}
                  {loadingRecommendation && (
                    <View style={styles.aiSkeleton}>
                      <View style={styles.aiSkeletonLine1} />
                      <View style={styles.aiSkeletonLine2} />
                    </View>
                  )}

                  {!loadingRecommendation && recommendation && (
                    <View style={styles.aiCard}>
                      <View style={styles.aiHeader}>
                        <View style={styles.aiIconContainer}>
                          <Ionicons name="sparkles" size={18} color="#4F46E5" />
                        </View>
                        <Text style={styles.aiTitle}>Auto-Pilot Booking</Text>
                      </View>
                      <Text style={styles.aiReason}>"{recommendation.reason}"</Text>
                      
                      <View style={styles.aiDetailsBox}>
                        <View style={styles.aiDetailRow}>
                          <Text style={styles.aiDetailLabel}>Dịch vụ:</Text>
                          <Text style={styles.aiDetailValue} numberOfLines={2}>
                            {Array.isArray(recommendation.recommended_items)
                              ? recommendation.recommended_items.map((i: any) => i.name).join(', ')
                              : 'Chưa có gợi ý'}
                          </Text>
                        </View>
                        {recommendation.suggested_scheduled_at && (
                          <View style={styles.aiDetailRow}>
                            <Text style={styles.aiDetailLabel}>Khung giờ sớm nhất:</Text>
                            <Text style={styles.aiDetailValue}>
                              {(() => {
                                const d = new Date(recommendation.suggested_scheduled_at);
                                const hh = String(d.getHours()).padStart(2, '0');
                                const mm = String(d.getMinutes()).padStart(2, '0');
                                return `${hh}:${mm} (${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()})`;
                              })()}
                            </Text>
                          </View>
                        )}
                        {recommendation.applicable_promotion && (
                          <View style={styles.aiDetailRow}>
                            <Text style={styles.aiDetailLabel}>Khuyến mãi:</Text>
                            <Text style={[styles.aiDetailValue, { color: '#EF4444' }]}>
                              {recommendation.applicable_promotion.code || recommendation.applicable_promotion.promotion_code}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Pressable 
                        style={({ pressed }) => [styles.aiButton, pressed && { opacity: 0.8 }]}
                        onPress={handleApplyRecommendation}
                      >
                        <Text style={styles.aiButtonText}>Áp dụng nhanh & Tiếp tục</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* Select Date and Time */}
                  <View style={styles.formGroup}>
                    <Text style={styles.sectionTitle}>
                      <MaterialCommunityIcons name="calendar" size={16} color="#06B6D4" /> Chọn thời gian mang xe đến *
                    </Text>

                    <Text style={styles.datePickerLabel}>Chọn ngày:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateSelectorContainer}>
                      {datesList.map((d) => {
                        const label = formatDateLabel(d);
                        const isSelected = selectedDate === label.fullDateStr;
                        return (
                          <Pressable
                            key={label.fullDateStr}
                            onPress={() => setSelectedDate(label.fullDateStr)}
                            style={[styles.dateCard, isSelected && styles.dateCardActive]}>
                            <Text style={[styles.dateDayText, isSelected && styles.dateTextActive]}>{label.dayName}</Text>
                            <Text style={[styles.dateNumText, isSelected && styles.dateTextActive]}>{label.dateStr}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    <Text style={styles.datePickerLabel}>Chọn khung giờ:</Text>
                    <View style={styles.timeSlotsGrid}>
                      {loadingSlots ? (
                        <View style={{ flex: 1, paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}>
                          <ActivityIndicator size="small" color="#06B6D4" />
                          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Đang tải khung giờ...</Text>
                        </View>
                      ) : availableSlots.length > 0 ? (
                        availableSlots.map((slot) => {
                          const isSelected = selectedTime === slot;
                          const apiSlot = apiSlots.find(s => s.timeStr === slot);
                          const bays = apiSlot?.available_bays ?? 0;
                          return (
                            <Pressable
                              key={slot}
                              onPress={() => setSelectedTime(slot)}
                              style={[
                                styles.timeSlotChip,
                                isSelected && styles.timeSlotChipActive,
                                { paddingVertical: 6 }
                              ]}>
                              <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextActive]}>{slot}</Text>
                              <Text style={{ fontSize: 9, color: isSelected ? '#0D9488' : '#94A3B8', marginTop: 2 }}>
                                Còn {bays} chỗ
                              </Text>
                            </Pressable>
                          );
                        })
                      ) : (
                        <Text style={styles.noSlotsText}>Không có khung giờ nào khả dụng hôm nay</Text>
                      )}
                    </View>

                    <View style={styles.hintContainer}>
                      <Text style={styles.hintText}>
                        {(() => {
                          let openStr = '07:00';
                          let closeStr = '18:30';
                          
                          if (selectedBranch?.operating_time) {
                            const dayOfWeek = selectedDate ? new Date(selectedDate).getDay() : new Date().getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            
                            const branchOpen = (isWeekend && selectedBranch.operating_time.weekend_open)
                              ? selectedBranch.operating_time.weekend_open
                              : selectedBranch.operating_time.default_open;
                            const branchClose = (isWeekend && selectedBranch.operating_time.weekend_close)
                              ? selectedBranch.operating_time.weekend_close
                              : selectedBranch.operating_time.default_close;
                              
                            if (branchOpen && branchClose) {
                              openStr = branchOpen;
                              const closeParts = branchClose.split(':');
                              if (closeParts.length === 2) {
                                let h = parseInt(closeParts[0], 10);
                                let m = parseInt(closeParts[1], 10);
                                if (m >= 30) {
                                  m -= 30;
                                } else {
                                  h -= 1;
                                  m += 30;
                                }
                                closeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                              } else {
                                closeStr = branchClose;
                              }
                            }
                          }
                          return `💡 Khung giờ hoạt động từ ${openStr} đến ${selectedBranch?.operating_time?.default_close || '19:00'} (Đặt trước ít nhất 60 phút - Khung giờ cuối cùng: ${closeStr})`;
                        })()}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* STEP 2: CHOOSE SERVICES */}
              {step === 2 && (
                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>
                    <MaterialCommunityIcons name="star" size={16} color="#F59E0B" /> Chọn Dịch vụ chăm sóc
                  </Text>

                  {/* Tabs */}
                  <View style={styles.tabContainer}>
                    <Pressable
                      style={[styles.tabButton, activeTab === 'combo' && styles.tabButtonActive]}
                      onPress={() => setActiveTab('combo')}>
                      <Text style={[styles.tabButtonText, activeTab === 'combo' && styles.tabButtonTextActive]}>
                        Combo trọn gói
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.tabButton, activeTab === 'single' && styles.tabButtonActive]}
                      onPress={() => setActiveTab('single')}>
                      <Text style={[styles.tabButtonText, activeTab === 'single' && styles.tabButtonTextActive]}>
                        Dịch vụ lẻ
                      </Text>
                    </Pressable>
                  </View>

                  {/* Tab Contents */}
                  {activeTab === 'combo' ? (
                    <View style={styles.servicesList}>
                      {comboPackages.length === 0 ? (
                        <Text style={styles.emptyServicesText}>Không có combo nào khả dụng</Text>
                      ) : (
                        comboPackages.map((pkg) => {
                          const id = pkg._id || pkg.id || '';
                          const isSelected = selectedComboId === id;
                          const serviceNames = pkg.services?.map((s: any) => s.service_name).join(' - ') || '';

                          return (
                            <Pressable
                              key={id}
                              style={[styles.serviceCard, isSelected && styles.serviceCardActive]}
                              onPress={() => handleSelectCombo(id, pkg.services || [])}>
                              <View style={styles.checkboxContainer}>
                                <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                                  {isSelected && <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />}
                                </View>
                              </View>
                              <View style={styles.serviceInfoContainer}>
                                <View style={styles.serviceRow}>
                                  <Text style={styles.serviceName}>{pkg.package_name}</Text>
                                  <Text style={styles.servicePrice}>{pkg.finalPrice.toLocaleString('vi-VN')} đ</Text>
                                </View>
                                <Text style={styles.serviceSubtext} numberOfLines={2}>
                                  Gồm: {serviceNames}
                                </Text>
                                <View style={styles.discountBadge}>
                                  <Text style={styles.discountText}>
                                    Giảm {pkg.package_discount_percentage}% - {pkg.services?.length || 0} dịch vụ
                                  </Text>
                                </View>
                              </View>
                            </Pressable>
                          );
                        })
                      )}
                    </View>
                  ) : (
                    <View style={styles.servicesList}>
                      {individualServices.length === 0 ? (
                        <Text style={styles.emptyServicesText}>Không tìm thấy dịch vụ lẻ nào</Text>
                      ) : (
                        individualServices.map((svc) => {
                          const id = svc._id || svc.id || '';
                          const isIncluded = includedServiceIdsInCombo.includes(id);
                          const isWashing = id === washingServiceId || svc.service_name === 'Dịch vụ rửa xe';
                          const isSelected = selectedServiceIds.includes(id) || isIncluded || isWashing;
                          const isDisabled = isIncluded || isWashing;

                          return (
                            <Pressable
                              key={id}
                              disabled={isDisabled}
                              style={[
                                styles.serviceCard,
                                isDisabled && styles.serviceCardDisabled,
                                isSelected && !isIncluded && styles.serviceCardActive,
                              ]}
                              onPress={() => handleToggleService(id)}>
                              <View style={styles.checkboxContainer}>
                                <View
                                  style={[
                                    styles.checkbox,
                                    isDisabled && styles.checkboxDisabled,
                                    isSelected && styles.checkboxChecked,
                                  ]}>
                                  {isSelected && <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />}
                                </View>
                              </View>
                              <View style={styles.serviceInfoContainer}>
                                <View style={styles.serviceRow}>
                                  <View style={styles.serviceNameWithTag}>
                                    <Text style={styles.serviceName}>{svc.service_name}</Text>
                                    {isIncluded && (
                                      <View style={styles.comboTag}>
                                        <Text style={styles.comboTagText}>Thuộc Combo</Text>
                                      </View>
                                    )}
                                    {isWashing && !isIncluded && (
                                      <View style={[styles.comboTag, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                                        <Text style={[styles.comboTagText, { color: '#2563EB' }]}>Mặc định</Text>
                                      </View>
                                    )}
                                  </View>
                                  <Text style={[styles.servicePrice, isDisabled && styles.servicePriceDisabled]}>
                                    {svc.service_price.toLocaleString('vi-VN')} đ
                                  </Text>
                                </View>
                                <Text style={styles.serviceSubtext}>⏱ {svc.duration_minutes} phút</Text>
                              </View>
                            </Pressable>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* STEP 3: CONFIRMATION & BILLING */}
              {step === 3 && (
                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>
                    <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" /> Xác nhận thông tin đặt lịch
                  </Text>

                  {/* Summary Card */}
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Chi nhánh:</Text>
                      <Text style={styles.summaryValue}>{selectedBranch?.branch_address?.district || 'Đã chọn'}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Phương tiện:</Text>
                      <Text style={styles.summaryValue}>{selectedVehicle?.license_plate}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Thời gian mang xe:</Text>
                      <Text style={styles.summaryValue}>
                        {selectedTime} - {selectedDate ? new Date(selectedDate).toLocaleDateString('vi-VN') : ''}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Dịch vụ chọn:</Text>
                      <View style={styles.summaryServices}>
                        {selectedCombo && (
                          <View style={styles.summaryComboBadge}>
                            <Text style={styles.summaryComboText}>[Combo] {selectedCombo.package_name}</Text>
                          </View>
                        )}
                        {washingServiceId && !includedServiceIdsInCombo.includes(washingServiceId) && (
                          <Text style={styles.summaryServiceItem}>
                            • {washingService?.service_name || 'Dịch vụ rửa xe'} (Mặc định)
                          </Text>
                        )}
                        {selectedServiceIds.map((id) => {
                          if (includedServiceIdsInCombo.includes(id) || id === washingServiceId) return null;
                          const svc = individualServices.find((s) => (s._id || s.id) === id);
                          if (!svc) return null;
                          return (
                            <Text key={id} style={styles.summaryServiceItem}>
                              • {svc.service_name}
                            </Text>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                  {/* Promo Section */}
                  <View style={styles.promoContainer}>
                    <Text style={styles.label}>Mã giảm giá (Nếu có):</Text>
                    <View style={styles.promoRow}>
                      <TextInput
                        style={styles.promoInput}
                        placeholder="NHẬP MÃ KHUYẾN MÃI..."
                        value={promoCode}
                        onChangeText={(text) => {
                          setValidatedPromo(null);
                          setPromoCode(text.toUpperCase());
                          setPromoError('');
                        }}
                        autoCapitalize="characters"
                      />
                      <Pressable
                        style={[styles.promoBtn, !promoCode.trim() && styles.promoBtnDisabled]}
                        disabled={validatingPromo || !promoCode.trim()}
                        onPress={handleApplyPromotion}>
                        {validatingPromo ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.promoBtnText}>Áp dụng</Text>
                        )}
                      </Pressable>
                    </View>
                    {validatedPromo && (
                      <View style={styles.promoSuccess}>
                        <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
                        <Text style={styles.promoSuccessText}>
                          Đã áp dụng: {validatedPromo.promotion_code} (-
                          {validatedPromo.discount_type === 'percentage'
                            ? `${validatedPromo.discount_value}%`
                            : `${validatedPromo.discount_value.toLocaleString('vi-VN')}đ`}
                          )
                        </Text>
                      </View>
                    )}
                    {promoError ? <Text style={styles.promoError}>{promoError}</Text> : null}
                  </View>

                  {/* Cost breakdown */}
                  <View style={styles.priceBreakdownCard}>
                    <Text style={styles.priceBreakdownTitle}>Tổng thanh toán dự kiến</Text>
                    {priceEstimate ? (
                      <View style={{ gap: 8 }}>
                        {selectedCombo && (
                          <View style={styles.priceItem}>
                            <Text style={styles.priceLabel}>Gói Combo ({selectedCombo.package_name})</Text>
                            <Text style={styles.priceValue}>{selectedCombo.finalPrice.toLocaleString('vi-VN')} đ</Text>
                          </View>
                        )}
                        {selectedServiceIds.map((id) => {
                          if (includedServiceIdsInCombo.includes(id)) return null;
                          const svc = individualServices.find((s) => (s._id || s.id) === id);
                          if (!svc) return null;
                          return (
                            <View key={id} style={styles.priceItem}>
                              <Text style={styles.priceLabel}>{svc.service_name}</Text>
                              <Text style={styles.priceValue}>{(svc.service_price || 0).toLocaleString('vi-VN')} đ</Text>
                            </View>
                          );
                        })}

                        <View style={styles.divider} />

                        <View style={styles.priceItem}>
                          <Text style={styles.priceLabel}>Tạm tính</Text>
                          <Text style={styles.priceValue}>{priceEstimate.basePrice.toLocaleString('vi-VN')} đ</Text>
                        </View>

                        {priceEstimate.tierDiscount > 0 && (
                          <View style={styles.priceItem}>
                            <Text style={styles.priceLabel}>Ưu đãi hạng ({tierDiscountPercentage}%)</Text>
                            <Text style={styles.priceValueDiscount}>
                              - {priceEstimate.tierDiscount.toLocaleString('vi-VN')} đ
                            </Text>
                          </View>
                        )}

                        {priceEstimate.promoDiscount > 0 && (
                          <View style={styles.priceItem}>
                            <Text style={styles.priceLabel}>Khuyến mãi</Text>
                            <Text style={styles.priceValueDiscount}>
                              - {priceEstimate.promoDiscount.toLocaleString('vi-VN')} đ
                            </Text>
                          </View>
                        )}

                        <View style={styles.divider} />

                        <View style={styles.totalRow}>
                          <Text style={styles.totalLabel}>Thành tiền</Text>
                          <Text style={styles.totalValue}>{priceEstimate.finalPrice.toLocaleString('vi-VN')} đ</Text>
                        </View>

                        <Text style={styles.paymentNotice}>* Thanh toán sau khi hoàn thành dịch vụ.</Text>
                      </View>
                    ) : (
                      <Text style={styles.noPriceText}>Chưa có thông tin dịch vụ</Text>
                    )}
                  </View>
                </View>
              )}

            </ScrollView>
          )}

          {/* Footer Navigation */}
          <View style={styles.modalFooter}>
            {step > 1 ? (
              <Pressable style={styles.footerBtnPrev} onPress={handlePrev}>
                <MaterialCommunityIcons name="chevron-left" size={20} color="#64748B" />
                <Text style={styles.footerBtnPrevText}>Quay lại</Text>
              </Pressable>
            ) : (
              <View />
            )}

            {step < 3 ? (
              <Pressable style={styles.footerBtnNext} onPress={handleNext}>
                <Text style={styles.footerBtnNextText}>Tiếp tục</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#FFFFFF" />
              </Pressable>
            ) : (
              <Pressable
                style={[styles.footerBtnSubmit, saving && { opacity: 0.7 }]}
                disabled={saving}
                onPress={handleCreateSubmit}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.footerBtnSubmitText}>Hoàn tất</Text>
                    <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ----------------------------------------------------
// STYLE DEFINITIONS
// ----------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.6,
  },

  headerSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },

  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#06B6D4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },

  bookButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  listContent: {
    padding: 16,
    paddingBottom: 32,
  },

  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  pulseContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(6,182,212,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },

  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },

  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Calendar block ticket style
  calendarBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },

  calendarLeft: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 42,
  },

  calendarDay: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  calendarMonth: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ECFEFF',
    textTransform: 'uppercase',
    marginTop: -2,
  },

  calendarRight: {
    paddingHorizontal: 10,
    justifyContent: 'center',
  },

  calendarTime: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },

  calendarYear: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  statusDot: {
    fontSize: 8,
    marginRight: 4,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // High tech divider line
  cardDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },

  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },

  cardDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 4,
  },

  bookingDetails: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },

  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  detailIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  detailContent: {
    flex: 1,
    gap: 2,
  },

  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  detailText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },

  // Vehicle info inline
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },

  vehicleModelText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    flex: 1,
  },

  // Vietnamese License Plate Badge
  plateContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#1E293B',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },

  plateInnerBorder: {
    borderWidth: 0.4,
    borderColor: '#94A3B8',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    width: '100%',
    alignItems: 'center',
    position: 'relative',
  },

  plateRegistrationDot: {
    position: 'absolute',
    top: -2,
    width: 2.4,
    height: 2.4,
    borderRadius: 1.2,
    backgroundColor: '#3B82F6',
  },

  plateText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.4,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },

  // Service Tags
  servicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },

  serviceChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '100%',
  },

  serviceChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },

  comboServiceChip: {
    backgroundColor: '#ECFEFF',
    borderColor: '#CFFAFE',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  comboServiceChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0891B2',
  },

  singleServiceChip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  singleServiceChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },

  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  priceContainer: {
    gap: 2,
  },

  priceMetaLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  price: {
    fontSize: 16,
    fontWeight: '900',
    color: '#06B6D4',
  },

  actions: {
    flexDirection: 'row',
    gap: 8,
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },

  cancelBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },

  cancelBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
  },

  payBtn: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },

  payBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },

  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(6,182,212,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
  },

  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },

  emptyButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#06B6D4',
    borderRadius: 8,
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    maxHeight: '92%',
    height: '92%',
    display: 'flex',
    flexDirection: 'column',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  closeBtn: {
    padding: 4,
  },

  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  // Stepper styles
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  stepItem: {
    alignItems: 'center',
    gap: 4,
  },

  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  stepCircleActive: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },

  stepNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },

  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },

  stepLabelActive: {
    color: '#0F172A',
    fontWeight: '800',
  },

  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
    marginTop: -16, // aligned with circles
  },

  stepLineActive: {
    backgroundColor: '#06B6D4',
  },

  stepContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  formSection: {
    gap: 20,
    paddingBottom: 40,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },

  formGroup: {
    gap: 8,
  },

  cardScroll: {
    flexDirection: 'row',
    paddingBottom: 8,
  },

  branchCard: {
    width: 220,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginRight: 12,
    gap: 6,
  },

  branchCardActive: {
    borderColor: '#06B6D4',
    backgroundColor: '#F0FDFA',
  },

  branchCardInactive: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    opacity: 0.65,
  },

  inlineStatusBadgeInactive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  inlineStatusBadgeInactiveText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },

  textInactive: {
    color: '#94A3B8',
  },

  cardSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  branchTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },

  branchAddress: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },

  branchPhone: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },

  vehicleCard: {
    width: 180,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginRight: 12,
    gap: 4,
  },

  vehicleCardActive: {
    borderColor: '#06B6D4',
    backgroundColor: '#F0FDFA',
  },

  vehiclePlate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },

  vehicleModel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },

  vehicleColor: {
    fontSize: 11,
    color: '#64748B',
  },

  noVehiclesContainer: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },

  noVehiclesText: {
    fontSize: 13,
    color: '#64748B',
  },

  addVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#06B6D4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  addVehicleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  datePickerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
  },

  dateSelectorContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },

  dateCard: {
    width: 60,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },

  dateCardActive: {
    borderColor: '#06B6D4',
    backgroundColor: '#F0FDFA',
  },

  dateDayText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  dateNumText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  dateTextActive: {
    color: '#06B6D4',
  },

  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },

  timeSlotChip: {
    width: (width - 64) / 4,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },

  timeSlotChipActive: {
    borderColor: '#06B6D4',
    backgroundColor: '#F0FDFA',
  },

  timeSlotText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },

  timeSlotTextActive: {
    color: '#06B6D4',
  },

  noSlotsText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 8,
  },

  hintContainer: {
    padding: 10,
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },

  hintText: {
    fontSize: 11,
    color: '#0D9488',
    lineHeight: 16,
    fontWeight: '500',
  },

  // Step 2 Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 10,
    marginBottom: 12,
  },

  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },

  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },

  tabButtonTextActive: {
    color: '#06B6D4',
    fontWeight: '800',
  },

  servicesList: {
    gap: 10,
  },

  emptyServicesText: {
    textAlign: 'center',
    paddingVertical: 30,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  serviceCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    gap: 12,
  },

  serviceCardActive: {
    borderColor: '#ea580c',
    backgroundColor: '#FFF7ED',
  },

  serviceCardDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.75,
  },

  checkboxContainer: {
    justifyContent: 'center',
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  checkboxChecked: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },

  checkboxDisabled: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
  },

  serviceInfoContainer: {
    flex: 1,
    gap: 4,
  },

  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  serviceNameWithTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },

  serviceName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    flexShrink: 1,
  },

  comboTag: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  comboTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },

  servicePrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ea580c',
  },

  servicePriceDisabled: {
    color: '#94A3B8',
  },

  serviceSubtext: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },

  discountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },

  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C2410C',
  },

  // Step 3 Confirmation Styles
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },

  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  summaryValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    textAlign: 'right',
    maxWidth: '70%',
  },

  summaryServices: {
    alignItems: 'flex-end',
    gap: 4,
  },

  summaryComboBadge: {
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#CFFAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  summaryComboText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0891B2',
  },

  summaryServiceItem: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },

  promoContainer: {
    gap: 8,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },

  promoRow: {
    flexDirection: 'row',
    gap: 8,
  },

  promoInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    fontWeight: '700',
  },

  promoBtn: {
    backgroundColor: '#F43F5E',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },

  promoBtnDisabled: {
    backgroundColor: '#FDA4AF',
  },

  promoBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  promoSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 10,
    borderRadius: 8,
  },

  promoSuccessText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },

  promoError: {
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '600',
  },

  vatContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },

  vatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  vatText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },

  vatInput: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },

  priceBreakdownCard: {
    backgroundColor: '#06B6D4',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },

  priceBreakdownTitle: {
    fontSize: 12,
    color: '#ECFEFF',
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  priceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  priceLabel: {
    fontSize: 13,
    color: '#ECFEFF',
    fontWeight: '600',
  },

  priceValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  priceValueDiscount: {
    fontSize: 13,
    color: '#FECDD3',
    fontWeight: '700',
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginVertical: 4,
  },

  totalLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '800',
  },

  totalValue: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '900',
  },

  paymentNotice: {
    fontSize: 11,
    color: '#ECFEFF',
    fontStyle: 'italic',
    marginTop: 4,
  },

  noPriceText: {
    textAlign: 'center',
    color: '#ECFEFF',
    opacity: 0.8,
  },

  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  footerBtnPrev: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  footerBtnPrevText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },

  footerBtnNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  footerBtnNextText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  footerBtnSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#06B6D4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },

  footerBtnSubmitText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // AI Recommendation Card Styles
  aiCard: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#312E81',
  },
  aiReason: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#4338CA',
    lineHeight: 18,
    marginBottom: 12,
  },
  aiDetailsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    gap: 8,
    marginBottom: 12,
  },
  aiDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiDetailLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  aiDetailValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  aiButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  aiSkeleton: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    marginBottom: 16,
    marginHorizontal: 16,
    gap: 10,
  },
  aiSkeletonLine1: {
    height: 16,
    backgroundColor: '#CBD5E1',
    borderRadius: 4,
    width: '40%',
  },
  aiSkeletonLine2: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    width: '80%',
  },
});
