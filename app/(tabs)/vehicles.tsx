import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, RefreshControl, Alert, Platform, StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import vehicleService, { Vehicle } from '@/services/vehicleService';
import ModalVehical, { EMPTY_VEHICLE_FORM, VehicleFormState } from '@/components/modalVehical';
import { useAuth } from '@/hooks/useAuthService';

const CYAN = '#06B6D4';
const CYAN_LIGHT = 'rgba(6,182,212,0.08)';
const CYAN_BORDER = 'rgba(6,182,212,0.18)';
const DARK = '#0F172A';
const GRAY = '#64748B';
const BG = '#F8FAFC';
const SURFACE = '#FFFFFF';

export default function VehiclesScreen() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<VehicleFormState>({
    make_id: '',
    vehicle_class_id: '',
    model_id: '',
    license_plate: '',
    vehicle_model: '',
    fuel_type: 'Xăng',
    color: ''
  });

  const [classes, setClasses] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [makes, setMakes] = useState<any[]>([]);

  const loadVehicles = useCallback(async (showLoading = true) => {
    if (!user) {
      setVehicles([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [vehicleResponse, fetchedClasses, fetchedModels, fetchedMakes] = await Promise.all([
        vehicleService.getMyVehicles(1, 50),
        vehicleService.getVehicleClasses(),
        vehicleService.getVehicleModels(),
        vehicleService.getMakes(),
      ]);
      setVehicles(vehicleResponse.vehicles);
      setClasses(fetchedClasses || []);
      setModels(fetchedModels || []);
      setMakes(fetchedMakes || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách phương tiện';
      setError(message);
      setVehicles([]);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);

  const handleRefresh = () => { setRefreshing(true); loadVehicles(false); };

  const ensureCustomerId = useCallback(async () => {
    if (customerId) return customerId;
    const profileCustomerId = await vehicleService.getCurrentCustomerId();
    setCustomerId(profileCustomerId);
    return profileCustomerId;
  }, [customerId]);

  const openCreateModal = () => {
    setEditingVehicle(null);
    setForm(EMPTY_VEHICLE_FORM);
    void ensureCustomerId()
      .then(() => setModalVisible(true))
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Không lấy được thông tin khách hàng';
        Alert.alert('Lỗi', message);
      });
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);

    const modelId = typeof vehicle.model_id === 'object' ? vehicle.model_id?._id : vehicle.model_id;
    const modelObj = models.find(m => m._id === modelId);
    const makeId = modelObj ? (typeof modelObj.make_id === 'object' ? modelObj.make_id?._id : modelObj.make_id) : '';

    setForm({
      make_id: makeId || '',
      license_plate: vehicle.license_plate || '',
      vehicle_class_id: typeof vehicle.vehicle_class_id === 'object' ? vehicle.vehicle_class_id?._id : vehicle.vehicle_class_id,
      model_id: modelId || '',
      vehicle_model: vehicle.vehicle_model || '',
      fuel_type: vehicle.fuel_type || '',
      color: vehicle.color || ''
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalVisible(false);
    setEditingVehicle(null);
    setForm({
      make_id: '',
      vehicle_class_id: '',
      model_id: '',
      license_plate: '',
      vehicle_model: '',
      fuel_type: 'Xăng',
      color: ''
    });
  };

  const handleSubmitVehicle = async () => {
    if (!form.license_plate.trim() || !form.vehicle_model.trim() || !form.fuel_type.trim() || !form.color.trim() || !form.vehicle_class_id || !form.model_id || !form.make_id) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin phương tiện');
      return;
    }
    if (!editingVehicle && !customerId) {
      Alert.alert('Lỗi', 'Không lấy được thông tin khách hàng');
      return;
    }
    setSubmitting(true);
    try {
      if (editingVehicle) {
        await vehicleService.updateVehicle(editingVehicle._id, {
          license_plate: form.license_plate.trim().toUpperCase(),
          vehicle_class_id: form.vehicle_class_id,
          model_id: form.model_id,
          vehicle_model: form.vehicle_model.trim(),
          fuel_type: form.fuel_type.trim(),
          color: form.color.trim(),
        });
        Alert.alert('Thành công', 'Cập nhật phương tiện thành công');
      } else {
        await vehicleService.createVehicle({
          customer_id: customerId!,
          license_plate: form.license_plate.trim().toUpperCase(),
          vehicle_class_id: form.vehicle_class_id,
          model_id: form.model_id,
          vehicle_model: form.vehicle_model.trim(),
          fuel_type: form.fuel_type.trim(),
          color: form.color.trim(),
        });
        Alert.alert('Thành công', 'Thêm phương tiện thành công');
      }
      setModalVisible(false);
      setEditingVehicle(null);
      setForm({
        make_id: '',
        vehicle_class_id: '',
        model_id: '',
        license_plate: '',
        vehicle_model: '',
        fuel_type: 'Xăng',
        color: ''
      });
      await loadVehicles(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể lưu phương tiện';
      Alert.alert('Lỗi', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    Alert.alert(
      'Xóa phương tiện',
      `Bạn có muốn xóa xe ${vehicle.license_plate}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa', style: 'destructive',
          onPress: async () => {
            setDeletingId(vehicle._id);
            try {
              await vehicleService.deleteVehicle(vehicle._id);
              await loadVehicles(false);
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Xóa phương tiện thất bại';
              Alert.alert('Lỗi', message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const getVehicleClassObj = (classInfo: any) => {
    if (typeof classInfo === 'object' && classInfo !== null) return classInfo;
    return classes.find(c => c._id === classInfo);
  };

  const getVehicleIcon = (classInfo: any) => {
    const classObj = getVehicleClassObj(classInfo);
    const name = classObj?.class_name || '';
    return name && (name.toLowerCase().includes('mô tô') || name.toLowerCase().includes('xe máy')) ? 'motorbike' : 'car';
  };

  const getVehicleColor = (classInfo: any) => {
    const classObj = getVehicleClassObj(classInfo);
    const name = classObj?.class_name || '';
    return name && (name.toLowerCase().includes('mô tô') || name.toLowerCase().includes('xe máy')) ? '#8B5CF6' : CYAN;
  };

  const formatDate = (value?: string) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('vi-VN');
  };

  // Color Mapping Helper
  const getColorHex = (colorName: string) => {
    const name = colorName?.toLowerCase().trim() || '';
    const colorMap: Record<string, string> = {
      'trắng': '#FFFFFF',
      'white': '#FFFFFF',
      'đen': '#1E293B',
      'black': '#1E293B',
      'đỏ': '#EF4444',
      'red': '#EF4444',
      'xanh': '#3B82F6',
      'blue': '#3B82F6',
      'xanh lá': '#10B981',
      'green': '#10B981',
      'vàng': '#EAB308',
      'yellow': '#EAB308',
      'bạc': '#CBD5E1',
      'silver': '#CBD5E1',
      'xám': '#64748B',
      'gray': '#64748B',
      'grey': '#64748B',
      'cam': '#F97316',
      'orange': '#F97316',
      'hồng': '#EC4899',
      'pink': '#EC4899',
    };
    return colorMap[name] || '#94A3B8';
  };

  // Fuel details helper
  const getFuelInfo = (fuelType: string) => {
    const type = fuelType?.toLowerCase() || '';
    if (type.includes('điện')) {
      return { icon: 'flash', color: '#10B981', label: 'Điện', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)' };
    }
    if (type.includes('dầu')) {
      return { icon: 'oil', color: '#D97706', label: 'Dầu', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.18)' };
    }
    return { icon: 'gas-station', color: '#3B82F6', label: 'Xăng', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.18)' };
  };

  // Garage stats calculator
  const getGarageStats = () => {
    let cars = 0;
    let motorbikes = 0;
    let electric = 0;
    vehicles.forEach(v => {
      const isMotorbike = getVehicleIcon(v.vehicle_class_id) === 'motorbike';
      if (isMotorbike) {
        motorbikes++;
      } else {
        cars++;
      }
      if (v.fuel_type?.toLowerCase().includes('điện')) {
        electric++;
      }
    });
    return { cars, motorbikes, electric, total: vehicles.length };
  };

  // Render stats dashboard header
  const renderDashboardHeader = () => {
    const stats = getGarageStats();
    if (vehicles.length === 0) return null;

    return (
      <View style={styles.dashboard}>
        <View style={styles.dbInfo}>
          <View style={styles.dbTitleRow}>
            <MaterialCommunityIcons name="shield-car" size={18} color={CYAN} />
            <Text style={styles.dbTitle}>Gara của tôi</Text>
          </View>
          <Text style={styles.dbSub}>Hệ thống HybridWash đã sẵn sàng kết nối</Text>
        </View>

        <View style={styles.dbGrid}>
          <View style={styles.dbItem}>
            <View style={[styles.dbIconWrapper, { backgroundColor: CYAN_LIGHT }]}>
              <MaterialCommunityIcons name="garage" size={18} color={CYAN} />
            </View>
            <View>
              <Text style={styles.dbNumber}>{stats.total}</Text>
              <Text style={styles.dbLabel}>Tổng xe</Text>
            </View>
          </View>

          <View style={styles.dbItem}>
            <View style={[styles.dbIconWrapper, { backgroundColor: 'rgba(59,130,246,0.08)' }]}>
              <MaterialCommunityIcons name="car-sports" size={18} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.dbNumber}>{stats.cars}</Text>
              <Text style={styles.dbLabel}>Ô tô</Text>
            </View>
          </View>

          <View style={styles.dbItem}>
            <View style={[styles.dbIconWrapper, { backgroundColor: 'rgba(139,92,246,0.08)' }]}>
              <MaterialCommunityIcons name="motorbike" size={18} color="#8B5CF6" />
            </View>
            <View>
              <Text style={styles.dbNumber}>{stats.motorbikes}</Text>
              <Text style={styles.dbLabel}>Xe máy</Text>
            </View>
          </View>

          {stats.electric > 0 && (
            <View style={styles.dbItem}>
              <View style={[styles.dbIconWrapper, { backgroundColor: 'rgba(16,185,129,0.08)' }]}>
                <MaterialCommunityIcons name="flash" size={18} color="#10B981" />
              </View>
              <View>
                <Text style={styles.dbNumber}>{stats.electric}</Text>
                <Text style={styles.dbLabel}>Xe điện</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderVehicleItem = ({ item }: { item: Vehicle }) => {
    const classObj = getVehicleClassObj(item.vehicle_class_id);
    const color = getVehicleColor(item.vehicle_class_id);
    const isDeleting = deletingId === item._id;

    // Look up model
    const modelId = typeof item.model_id === 'object' ? item.model_id?._id : item.model_id;
    const modelObj = models.find(m => m._id === modelId);
    const modelName = modelObj?.model_name || (typeof item.model_id === 'object' ? item.model_id?.model_name : '');

    // Look up make
    const makeId = modelObj ? (typeof modelObj.make_id === 'object' ? modelObj.make_id?._id : modelObj.make_id) : '';
    const makeObj = makes.find(m => m._id === makeId);
    const makeName = makeObj?.make_name || '';

    const className = classObj?.class_name || 'Loại xe';
    const displayName = makeName ? `${makeName} ${modelName} ${item.vehicle_model}` : `${modelName} ${item.vehicle_model}`;

    const fuel = getFuelInfo(item.fuel_type);
    const colorHex = getColorHex(item.color);

    return (
      <View style={[styles.card, isDeleting && styles.cardDeleting]}>
        <View style={styles.cardInner}>
          {/* Main Top Section */}
          <View style={styles.cardHeader}>
            <View style={[styles.vehicleIconBox, { backgroundColor: color + '12' }]}>
              <MaterialCommunityIcons name={getVehicleIcon(item.vehicle_class_id) as any} size={28} color={color} />
            </View>

            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName} numberOfLines={1}>{displayName}</Text>

              <View style={styles.badgesRow}>
                {/* Class Badge */}
                <View style={[styles.badgeItem, { backgroundColor: color + '08', borderColor: color + '18' }]}>
                  <Text style={[styles.badgeText, { color }]}>{className}</Text>
                </View>

                {/* Color Dot + Label */}
                <View style={styles.colorWrapper}>
                  <View style={[
                    styles.colorDot,
                    { backgroundColor: colorHex },
                    colorHex === '#FFFFFF' && { borderWidth: 1, borderColor: '#E2E8F0' }
                  ]} />
                  <Text style={styles.colorText}>{item.color}</Text>
                </View>
              </View>
            </View>

            {/* Simulated Metallic License Plate Badge */}
            <View style={styles.plateContainer}>
              <View style={styles.plateInnerBorder}>
                <View style={styles.plateRegistrationDot} />
                <Text style={styles.plateText}>{item.license_plate.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* High-tech divider with side indents */}
          <View style={styles.cardDividerContainer}>
            <View style={styles.dividerDot} />
            <View style={styles.cardDividerLine} />
            <View style={styles.dividerDot} />
          </View>

          {/* Info Details Row */}
          <View style={styles.detailsRow}>
            {/* Fuel Type */}
            <View style={[styles.pillBadge, { backgroundColor: fuel.bg, borderColor: fuel.border }]}>
              <MaterialCommunityIcons name={fuel.icon as any} size={13} color={fuel.color} />
              <Text style={[styles.pillText, { color: fuel.color }]}>{fuel.label}</Text>
            </View>

            {/* Created At */}
            <View style={styles.dateMeta}>
              <MaterialCommunityIcons name="calendar-month-outline" size={13} color={GRAY} />
              <Text style={styles.metaLabel}>Ngày tạo:</Text>
              <Text style={styles.metaValue}>{formatDate(item.createdAt || item.created_at)}</Text>
            </View>

            {/* Status (Connected to AutoWash Tech) */}
            <View style={styles.statusIndicator}>

            </View>
          </View>

          {/* Action Row */}
          <View style={styles.cardActions}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.editBtn, pressed && styles.btnPressed]}
              onPress={() => openEditModal(item)}
            >
              <MaterialCommunityIcons name="circle-edit-outline" size={16} color={CYAN} />
              <Text style={styles.editBtnText}>Chỉnh sửa</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.deleteBtn,
                pressed && styles.btnPressed,
                isDeleting && styles.disabledBtn
              ]}
              onPress={() => handleDeleteVehicle(item)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#EF4444" style={{ marginRight: 4 }} />
              ) : (
                <MaterialCommunityIcons name="delete-sweep-outline" size={16} color="#EF4444" />
              )}
              <Text style={styles.deleteBtnText}>{isDeleting ? 'Đang xóa...' : 'Xóa xe'}</Text>
            </Pressable>
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
          <Text style={styles.headerTitle}>Gara Phương Tiện</Text>
          <Text style={styles.headerSub}>Quản lý xe để kết nối trạm HybridWash</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
          onPress={openCreateModal}
        >
          <MaterialCommunityIcons name="plus-circle" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Thêm xe</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <View style={styles.loadingBox}>
            <View style={styles.pulseContainer}>
              <ActivityIndicator size="large" color={CYAN} />
            </View>
            <Text style={styles.loadingText}>Đang dò tìm phương tiện...</Text>
          </View>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <View style={styles.stateCard}>
            <View style={[styles.stateIconBox, { backgroundColor: 'rgba(239,68,68,0.08)' }]}>
              <MaterialCommunityIcons name="wifi-strength-alert-outline" size={38} color="#EF4444" />
            </View>
            <Text style={styles.stateTitle}>Mất kết nối hệ thống</Text>
            <Text style={styles.stateSub}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => loadVehicles()}>
              <MaterialCommunityIcons name="sync" size={16} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Thử kết nối lại</Text>
            </Pressable>
          </View>
        </View>
      ) : vehicles.length === 0 ? (
        <View style={styles.centerState}>
          <View style={styles.stateCard}>
            <View style={[styles.stateIconBox, { backgroundColor: CYAN_LIGHT }]}>
              <MaterialCommunityIcons name="car-connected" size={42} color={CYAN} />
            </View>
            <Text style={styles.stateTitle}>Gara của bạn đang trống</Text>
            <Text style={styles.stateSub}>Thêm phương tiện ngay để trải nghiệm công nghệ rửa xe tự động HybridWash siêu tốc.</Text>
            <Pressable style={styles.emptyAddBtn} onPress={openCreateModal}>
              <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>Đăng ký xe đầu tiên</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          renderItem={renderVehicleItem}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderDashboardHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={CYAN} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ModalVehical
        visible={modalVisible}
        submitting={submitting}
        editingVehicle={editingVehicle}
        form={form}
        onClose={closeModal}
        onSubmit={handleSubmitVehicle}
        onChangeForm={setForm}
        classesList={classes}
        modelsList={models}
        makesList={makes}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: DARK, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 10, elevation: 2,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: DARK, letterSpacing: -0.6 },
  headerSub: { fontSize: 12, color: GRAY, fontWeight: '500', marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: CYAN, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12,
    shadowColor: CYAN, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // Dashboard Overview
  dashboard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  dbInfo: {
    marginBottom: 14,
  },
  dbTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dbTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK,
  },
  dbSub: {
    fontSize: 11,
    color: GRAY,
    marginTop: 2,
  },
  dbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dbItem: {
    flex: 1,
    minWidth: '28%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dbIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dbNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: DARK,
  },
  dbLabel: {
    fontSize: 10,
    color: GRAY,
    fontWeight: '500',
  },

  // List
  listContent: { padding: 16, paddingBottom: 32 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
    overflow: 'hidden',
  },
  cardDeleting: { opacity: 0.5 },
  cardInner: { padding: 16 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleIconBox: {
    width: 54, height: 54, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 16, fontWeight: '800', color: DARK, letterSpacing: -0.3 },

  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  badgeItem: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },

  colorWrapper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  colorText: { fontSize: 11, color: GRAY, fontWeight: '600' },

  // Vietnamese License Plate Badge
  plateContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  plateInnerBorder: {
    borderWidth: 0.5,
    borderColor: '#94A3B8',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    width: '100%',
    alignItems: 'center',
    position: 'relative',
  },
  plateRegistrationDot: {
    position: 'absolute',
    top: -2.5,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#3B82F6',
  },
  plateText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.6,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },

  // Divider
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

  // Details Row
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 11,
    color: GRAY,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 11,
    color: DARK,
    fontWeight: '700',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    fontSize: 10,
    color: '#10B981',
  },
  statusLabel: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Actions
  cardActions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12,
    borderWidth: 1,
  },
  btnPressed: { opacity: 0.7 },
  disabledBtn: { opacity: 0.5 },
  editBtn: {
    backgroundColor: CYAN_LIGHT,
    borderColor: CYAN_BORDER,
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: CYAN },
  deleteBtn: {
    backgroundColor: 'rgba(239,68,68,0.04)',
    borderColor: 'rgba(239,68,68,0.12)',
  },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: '#EF4444' },

  // Center States
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingBox: { alignItems: 'center', gap: 16 },
  pulseContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: CYAN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { fontSize: 14, color: GRAY, fontWeight: '600' },

  stateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: DARK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
  },
  stateIconBox: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  stateTitle: { fontSize: 18, fontWeight: '800', color: DARK, textAlign: 'center' },
  stateSub: { fontSize: 13, color: GRAY, textAlign: 'center', lineHeight: 20, marginTop: 8, paddingHorizontal: 12 },

  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 18, paddingHorizontal: 22, paddingVertical: 12,
    backgroundColor: '#EF4444', borderRadius: 12,
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  retryBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 18, paddingHorizontal: 22, paddingVertical: 12,
    backgroundColor: CYAN, borderRadius: 12,
    shadowColor: CYAN, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  emptyAddBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});