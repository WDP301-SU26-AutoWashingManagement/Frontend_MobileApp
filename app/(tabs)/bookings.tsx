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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

// Services
import bookingService, { Booking, CreateBookingPayload } from '../../services/bookingService';
import promotionService, { Promotion } from '../../services/promotionService';
import vehicleService, { Vehicle } from '../../services/vehicleService';
import branchService, { Branch } from '../../services/branchService';
import servicePackageService from '../../services/servicePackageService';

const { width } = Dimensions.get('window');

// Status badging styles mapping
const getStatusColor = (status: Booking['booking_status']) => {
  switch (status) {
    case 'pending':
      return '#F59E0B'; // Amber
    case 'confirmed':
      return '#3B82F6'; // Blue
    case 'checked_in':
      return '#8B5CF6'; // Purple
    case 'in_progress':
      return '#EC4899'; // Pink
    case 'completed':
      return '#10B981'; // Green
    case 'cancelled':
      return '#EF4444'; // Red
    default:
      return '#6B7280';
  }
};

const getStatusLabel = (status: Booking['booking_status']) => {
  switch (status) {
    case 'pending':
      return 'Chờ xác nhận';
    case 'confirmed':
      return 'Đã xác nhận';
    case 'checked_in':
      return 'Đã check-in';
    case 'in_progress':
      return 'Đang rửa xe';
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const list = await bookingService.list();
      // Sort bookings: pending/confirmed/in_progress first, then by date descending
      const sorted = [...list].sort((a, b) => {
        const dateA = new Date(a.scheduled_at).getTime();
        const dateB = new Date(b.scheduled_at).getTime();
        return dateB - dateA;
      });
      setBookings(sorted);
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

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const totalPrice = item.services.reduce((sum, s) => sum + s.price_snapshot, 0);
    const scheduledDate = new Date(item.scheduled_at);
    const dateFormatted = scheduledDate.toLocaleDateString('vi-VN');
    const timeFormatted = scheduledDate.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const canCancel = item.booking_status === 'pending' || item.booking_status === 'confirmed';

    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View style={styles.bookingDateTime}>
            <MaterialCommunityIcons name="calendar" size={22} color="#06B6D4" />
            <View>
              <Text style={styles.date}>{dateFormatted}</Text>
              <Text style={styles.time}>{timeFormatted}</Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.booking_status) },
            ]}>
            <Text style={styles.statusText}>{getStatusLabel(item.booking_status)}</Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          {item.branch?.branch_address && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="map-marker" size={18} color="#64748B" />
              <Text style={styles.detailText} numberOfLines={1}>
                Cơ sở: {item.branch.branch_address.street}, {item.branch.branch_address.district}
              </Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="car" size={18} color="#64748B" />
            <Text style={styles.detailText}>
              {item.vehicle?.license_plate} — {item.vehicle?.vehicle_model || 'Xe của tôi'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="spray-bottle" size={18} color="#64748B" />
            <Text style={styles.detailText} numberOfLines={2}>
              {renderServiceNames(item.services)}
            </Text>
          </View>
        </View>

        <View style={styles.bookingFooter}>
          <Text style={styles.price}>{totalPrice.toLocaleString('vi-VN')} ₫</Text>
          <View style={styles.actions}>
            {canCancel && (
              <Pressable
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => handleCancelBooking(item._id)}>
                <MaterialCommunityIcons name="delete" size={18} color="#EF4444" />
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
      <View style={styles.header}>
        <Text style={styles.title}>Đặt lịch rửa xe</Text>
        <Pressable
          style={styles.bookButton}
          onPress={() => setShowModal(true)}>
          <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {loading && bookings.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Đang tải lịch đặt...</Text>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="calendar-blank" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Chưa có lịch đặt</Text>
          <Text style={styles.emptySubtext}>Đặt lịch rửa xe ngay hôm nay</Text>
          <Pressable
            style={styles.emptyButton}
            onPress={() => setShowModal(true)}>
            <Text style={styles.emptyButtonText}>Đặt lịch ngay</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={fetchBookings}
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

function estimateBookingPrice(basePrice: number, promotion?: Promotion | null) {
  const discount = promotion ? computePromotionDiscount(basePrice, promotion) : 0;
  return {
    basePrice,
    discount,
    finalPrice: Math.max(0, basePrice - discount),
  };
}

function BookingWizardModal({ visible, onClose, onSuccess, router }: BookingWizardModalProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

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

  // Step 2 values
  const [activeTab, setActiveTab] = useState<'combo' | 'single'>('combo');
  const [selectedComboId, setSelectedComboId] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Step 3 values
  const [promoCode, setPromoCode] = useState('');
  const [validatedPromo, setValidatedPromo] = useState<Promotion | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [vatRequested, setVatRequested] = useState(false);
  const [taxCode, setTaxCode] = useState('');

  // Date list generation (next 7 days)
  const datesList = useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  const formatDateLabel = (d: Date) => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayName = d.getDay() === 0 ? 'CN' : days[d.getDay()];
    const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
    const fullDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { dayName, dateStr, fullDateStr };
  };

  // Time slots generation
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];
    
    const slots = [];
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // Minimum advance booking is 60 minutes
    const minTime = new Date(now.getTime() + 60 * 60 * 1000);

    const [year, month, day] = selectedDate.split('-').map(Number);

    for (let hour = 7; hour < 19; hour++) {
      const hStr = String(hour).padStart(2, '0');
      
      // :00 slot
      const slot00 = `${hStr}:00`;
      const time00 = new Date(year, month - 1, day, hour, 0, 0, 0);
      if (selectedDate !== todayStr || time00 >= minTime) {
        slots.push(slot00);
      }

      // :30 slot
      if (hour < 18 || (hour === 18)) {
        const slot30 = `${hStr}:30`;
        const time30 = new Date(year, month - 1, day, hour, 30, 0, 0);
        if (selectedDate !== todayStr || time30 >= minTime) {
          slots.push(slot30);
        }
      }
    }
    return slots;
  }, [selectedDate]);

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
        if (branchList.length > 0 && branchList[0]._id) {
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

  const selectedCombo = useMemo(() => {
    return comboPackages.find(c => (c._id || c.id) === selectedComboId);
  }, [comboPackages, selectedComboId]);

  const includedServiceIdsInCombo = useMemo(() => {
    if (!selectedCombo || !selectedCombo.services) return [];
    return selectedCombo.services.map((s: any) => s._id || s.id);
  }, [selectedCombo]);

  // Calculated Pricing Estimate
  const priceEstimate = useMemo(() => {
    let totalBasePrice = 0;
    if (selectedCombo) {
      totalBasePrice += selectedCombo.finalPrice;
    }

    selectedServiceIds.forEach(id => {
      // Exclude service if it is already in the selected combo
      if (!includedServiceIdsInCombo.includes(id)) {
        const svc = individualServices.find(s => (s._id || s.id) === id);
        if (svc) {
          totalBasePrice += svc.service_price || 0;
        }
      }
    });

    if (totalBasePrice === 0) return null;
    return estimateBookingPrice(totalBasePrice, validatedPromo);
  }, [selectedServiceIds, selectedCombo, validatedPromo, individualServices, includedServiceIdsInCombo]);

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
      if (!selectedComboId && selectedServiceIds.length === 0) {
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
    if (vatRequested && !taxCode.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập Mã số thuế để xuất hóa đơn VAT');
      return;
    }

    setSaving(true);
    try {
      const servicesPayload: { service_id: string; service_package_id?: string }[] = [];

      // Selected individual services
      selectedServiceIds.forEach(id => {
        // Only add if not already in the combo to avoid duplicates
        if (!includedServiceIdsInCombo.includes(id)) {
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
        vat_requested: vatRequested,
        tax_code: vatRequested ? taxCode.trim() : undefined,
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
      setVatRequested(false);
      setTaxCode('');
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
                        const address = b.branch_address
                          ? `${b.branch_address.street}, ${b.branch_address.district}, ${b.branch_address.city}`
                          : 'Chưa có địa chỉ';
                        return (
                          <Pressable
                            key={b._id}
                            onPress={() => setSelectedBranchId(b._id || '')}
                            style={[styles.branchCard, isSelected && styles.branchCardActive]}>
                            <View style={styles.cardSelectHeader}>
                              <Text style={styles.branchTitle}>Chi nhánh {b.branch_address?.district}</Text>
                              {isSelected && <MaterialCommunityIcons name="check-circle" size={18} color="#06B6D4" />}
                            </View>
                            <Text style={styles.branchAddress} numberOfLines={2}>{address}</Text>
                            <Text style={styles.branchPhone}>📞 {b.branch_phone || 'N/A'}</Text>
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
                      {availableSlots.length > 0 ? (
                        availableSlots.map((slot) => {
                          const isSelected = selectedTime === slot;
                          return (
                            <Pressable
                              key={slot}
                              onPress={() => setSelectedTime(slot)}
                              style={[styles.timeSlotChip, isSelected && styles.timeSlotChipActive]}>
                              <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextActive]}>{slot}</Text>
                            </Pressable>
                          );
                        })
                      ) : (
                        <Text style={styles.noSlotsText}>Không có khung giờ nào khả dụng hôm nay</Text>
                      )}
                    </View>

                    <View style={styles.hintContainer}>
                      <Text style={styles.hintText}>
                        💡 Giờ hoạt động từ 07:00 đến 19:00. Đặt trước ít nhất 60 phút và trong vòng 7 ngày.
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
                          const isSelected = selectedServiceIds.includes(id) || isIncluded;

                          return (
                            <Pressable
                              key={id}
                              disabled={isIncluded}
                              style={[
                                styles.serviceCard,
                                isIncluded && styles.serviceCardDisabled,
                                isSelected && !isIncluded && styles.serviceCardActive,
                              ]}
                              onPress={() => handleToggleService(id)}>
                              <View style={styles.checkboxContainer}>
                                <View
                                  style={[
                                    styles.checkbox,
                                    isIncluded && styles.checkboxDisabled,
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
                                  </View>
                                  <Text style={[styles.servicePrice, isIncluded && styles.servicePriceDisabled]}>
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
                        {selectedServiceIds.map((id) => {
                          if (includedServiceIdsInCombo.includes(id)) return null;
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

                  {/* VAT Invoice Requests */}
                  <View style={styles.vatContainer}>
                    <Pressable
                      style={styles.vatRow}
                      onPress={() => setVatRequested(!vatRequested)}>
                      <View style={[styles.checkbox, vatRequested && styles.checkboxChecked]}>
                        {vatRequested && <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />}
                      </View>
                      <Text style={styles.vatText}>Tôi muốn xuất hóa đơn đỏ (VAT) cho dịch vụ này</Text>
                    </Pressable>
                    {vatRequested && (
                      <TextInput
                        style={styles.vatInput}
                        placeholder="Nhập Mã số thuế công ty..."
                        value={taxCode}
                        onChangeText={setTaxCode}
                      />
                    )}
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

                        {priceEstimate.discount > 0 && (
                          <View style={styles.priceItem}>
                            <Text style={styles.priceLabel}>Giảm giá</Text>
                            <Text style={styles.priceValueDiscount}>
                              - {priceEstimate.discount.toLocaleString('vi-VN')} đ
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
    backgroundColor: '#F9FAFB',
    marginTop: 50,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },

  bookButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#06B6D4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  listContent: {
    padding: 12,
  },

  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
  },

  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },

  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  bookingDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  date: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },

  time: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  bookingDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },

  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  detailText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    flex: 1,
  },

  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#06B6D4',
  },

  actions: {
    flexDirection: 'row',
    gap: 8,
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },

  cancelBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },

  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 60,
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
});
