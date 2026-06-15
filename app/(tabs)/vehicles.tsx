import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, RefreshControl, Alert, Platform, StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import vehicleService, { Vehicle } from '@/services/vehicleService';
import ModalVehical, { EMPTY_VEHICLE_FORM, VehicleFormState } from '@/components/modalVehical';

const CYAN = '#06B6D4';
const CYAN_LIGHT = 'rgba(6,182,212,0.10)';
const DARK = '#0F172A';
const GRAY = '#64748B';
const BG = '#F1F5F9';
const SURFACE = '#FFFFFF';

export default function VehiclesScreen() {
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
  }, []);

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
              setDeletingId(null); }
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

  const renderVehicleItem = ({ item, index }: { item: Vehicle; index: number }) => {
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

    return (
      <View style={[styles.card, isDeleting && styles.cardDeleting]}>
        {/* Color accent bar */}
        <View style={[styles.cardAccent, { backgroundColor: color }]} />

        <View style={styles.cardInner}>
          {/* Top row */}
          <View style={styles.cardTop}>
            <View style={[styles.vehicleIconBox, { backgroundColor: color + '18' }]}>
              <MaterialCommunityIcons name={getVehicleIcon(item.vehicle_class_id) as any} size={26} color={color} />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>{displayName}</Text>
              <View style={styles.plateRow}>
                <MaterialCommunityIcons name="card-account-details-outline" size={12} color={GRAY} />
                <Text style={styles.vehiclePlate}>{item.license_plate}</Text>
              </View>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: color + '15', borderColor: color + '30' }]}>
              <Text style={[styles.typeBadgeText, { color }]}>{className}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Details row */}
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="calendar-outline" size={13} color={GRAY} />
              <Text style={styles.detailLabel}>Ngày tạo</Text>
              <Text style={styles.detailValue}>{formatDate(item.createdAt || item.created_at)}</Text>
            </View>
            <View style={styles.detailSep} />
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="identifier" size={13} color={GRAY} />
              <Text style={styles.detailLabel}>ID</Text>
              <Text style={styles.detailValue}>#{item._id.slice(-6).toUpperCase()}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.cardActions}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.editBtn, pressed && { opacity: 0.75 }]}
              onPress={() => openEditModal(item)}>
              <MaterialCommunityIcons name="pencil-outline" size={15} color={CYAN} />
              <Text style={styles.editBtnText}>Chỉnh sửa</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.deleteBtn, pressed && { opacity: 0.75 }, isDeleting && { opacity: 0.5 }]}
              onPress={() => handleDeleteVehicle(item)}
              disabled={isDeleting}>
              {isDeleting
                ? <ActivityIndicator size="small" color="#EF4444" />
                : <MaterialCommunityIcons name="trash-can-outline" size={15} color="#EF4444" />
              }
              <Text style={styles.deleteBtnText}>{isDeleting ? 'Đang xóa...' : 'Xóa'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Phương tiện</Text>
          <Text style={styles.headerSub}>{vehicles.length > 0 ? `${vehicles.length} phương tiện` : 'Chưa có phương tiện'}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
          onPress={openCreateModal}
        >
          <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Thêm</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={CYAN} />
            <Text style={styles.loadingText}>Đang tải phương tiện...</Text>
          </View>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <View style={styles.emptyBox}>
            <View style={[styles.emptyIconBox, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#F59E0B" />
            </View>
            <Text style={styles.emptyTitle}>Không thể tải dữ liệu</Text>
            <Text style={styles.emptySub}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => loadVehicles()}>
              <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        </View>
      ) : vehicles.length === 0 ? (
        <View style={styles.centerState}>
          <View style={styles.emptyBox}>
            <View style={[styles.emptyIconBox, { backgroundColor: CYAN_LIGHT }]}>
              <MaterialCommunityIcons name="car-off" size={40} color={CYAN} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có phương tiện</Text>
            <Text style={styles.emptySub}>Thêm phương tiện để bắt đầu đặt lịch rửa xe</Text>
            <Pressable style={styles.emptyAddBtn} onPress={openCreateModal}>
              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
              <Text style={styles.emptyAddBtnText}>Thêm phương tiện</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          renderItem={renderVehicleItem}
          keyExtractor={(item) => item._id}
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
    backgroundColor: SURFACE,
    shadowColor: DARK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: DARK, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: GRAY, fontWeight: '500', marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: CYAN, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12,
    shadowColor: CYAN, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // List
  listContent: { padding: 16, gap: 12, paddingBottom: 32 },

  // Card
  card: {
    backgroundColor: SURFACE, borderRadius: 18,
    shadowColor: DARK, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
    overflow: 'hidden',
  },
  cardDeleting: { opacity: 0.6 },
  cardAccent: { height: 4, width: '100%' },
  cardInner: { padding: 16 },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  vehicleIconBox: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 15, fontWeight: '800', color: DARK, letterSpacing: -0.2 },
  plateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  vehiclePlate: { fontSize: 12, color: GRAY, fontWeight: '600' },
  typeBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },

  cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 12 },

  detailsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  detailItem: { flex: 1, alignItems: 'center', gap: 2 },
  detailLabel: { fontSize: 11, color: GRAY, fontWeight: '500', marginTop: 2 },
  detailValue: { fontSize: 12, color: DARK, fontWeight: '700' },
  detailSep: { width: 1, height: 28, backgroundColor: '#E2E8F0' },

  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
  },
  editBtn: { backgroundColor: CYAN_LIGHT, borderWidth: 1, borderColor: 'rgba(6,182,212,0.2)' },
  editBtnText: { fontSize: 13, fontWeight: '700', color: CYAN },
  deleteBtn: { backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: '#EF4444' },

  // States
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingBox: { alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: GRAY, fontWeight: '600' },
  emptyBox: { alignItems: 'center', gap: 8 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: DARK },
  emptySub: { fontSize: 14, color: GRAY, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 11,
    backgroundColor: '#F59E0B', borderRadius: 12,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 11,
    backgroundColor: CYAN, borderRadius: 12,
    shadowColor: CYAN, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  emptyAddBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});