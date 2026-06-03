import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import vehicleService, { Vehicle } from '@/services/vehicleService';

export type VehicleFormState = {
  vehicle_class_id: string;
  model_id: string;
  license_plate: string;
  vehicle_model: string;
  fuel_type: string;
  color: string;
};

export const EMPTY_VEHICLE_FORM: VehicleFormState = {
  vehicle_class_id: '', model_id: '', license_plate: '', vehicle_model: '', fuel_type: '', color: ''
};

type ModalVehicalProps = {
  visible: boolean;
  submitting: boolean;
  editingVehicle: Vehicle | null;
  form: VehicleFormState;
  onClose: () => void;
  onSubmit: () => void;
  onChangeForm: React.Dispatch<React.SetStateAction<VehicleFormState>>;
};

const CYAN = '#06B6D4';
const DARK = '#0F172A';
const GRAY = '#64748B';
const BG = '#F1F5F9';

function FieldInput({
  label, value, onChangeText, placeholder, autoCapitalize, icon,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; autoCapitalize?: any; icon: string;
}) {
  return (
    <View style={fieldStyles.group}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.inputRow}>
        <MaterialCommunityIcons name={icon as any} size={17} color={GRAY} style={fieldStyles.icon} />
        <TextInput
          style={fieldStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          autoCapitalize={autoCapitalize || 'none'}
        />
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  group: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: GRAY, marginBottom: 6, letterSpacing: 0.3 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 12, backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: DARK },
});

export default function ModalVehical({
  visible, submitting, editingVehicle, form, onClose, onSubmit, onChangeForm,
}: ModalVehicalProps) {
  const isEdit = !!editingVehicle;
  const accentColor = CYAN;
  
  const [classes, setClasses] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (visible) {
      loadOptions();
    }
  }, [visible]);

  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      const [fetchedClasses, fetchedModels] = await Promise.all([
        vehicleService.getVehicleClasses(),
        vehicleService.getVehicleModels(),
      ]);
      setClasses(fetchedClasses || []);
      setModels(fetchedModels || []);
    } catch (e) {
      console.log('Error fetching options', e);
    } finally {
      setLoadingOptions(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={styles.sheet}>

            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.headerIcon, { backgroundColor: accentColor + '18' }]}>
                  <MaterialCommunityIcons name="car-outline" size={18} color={accentColor} />
                </View>
                <View>
                  <Text style={styles.headerTitle}>
                    {isEdit ? 'Chỉnh sửa phương tiện' : 'Thêm phương tiện'}
                  </Text>
                  <Text style={styles.headerSub}>
                    Điền thông tin xe của bạn
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={onClose} disabled={submitting}
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}>
                <MaterialCommunityIcons name="close" size={18} color={GRAY} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              
              {loadingOptions ? (
                 <ActivityIndicator size="small" color={CYAN} style={{ marginVertical: 20 }} />
              ) : (
                <>
                  <View style={styles.typeSection}>
                    <Text style={fieldStyles.label}>Loại xe (Class)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
                      {classes.map(c => (
                        <Pressable 
                          key={c._id} 
                          onPress={() => onChangeForm(prev => ({ ...prev, vehicle_class_id: c._id }))}
                          style={[styles.chip, form.vehicle_class_id === c._id && styles.chipSelected]}>
                          <Text style={[styles.chipText, form.vehicle_class_id === c._id && styles.chipTextSelected]}>{c.class_name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.typeSection}>
                    <Text style={fieldStyles.label}>Hãng/Mẫu xe (Model)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
                      {models.map(m => (
                        <Pressable 
                          key={m._id} 
                          onPress={() => onChangeForm(prev => ({ ...prev, model_id: m._id }))}
                          style={[styles.chip, form.model_id === m._id && styles.chipSelected]}>
                          <Text style={[styles.chipText, form.model_id === m._id && styles.chipTextSelected]}>{m.model_name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  <FieldInput
                    label="Biển số xe"
                    value={form.license_plate}
                    onChangeText={(t) => onChangeForm(c => ({ ...c, license_plate: t }))}
                    placeholder="VD: 51G-123.45"
                    autoCapitalize="characters"
                    icon="card-account-details-outline"
                  />
                  
                  <FieldInput
                    label="Phiên bản xe (Ví dụ: Airblade 125, Vios G)"
                    value={form.vehicle_model}
                    onChangeText={(t) => onChangeForm(c => ({ ...c, vehicle_model: t }))}
                    placeholder="VD: Vios G 2022"
                    icon="car-info"
                  />

                  <FieldInput
                    label="Loại nhiên liệu"
                    value={form.fuel_type}
                    onChangeText={(t) => onChangeForm(c => ({ ...c, fuel_type: t }))}
                    placeholder="VD: Xăng, Dầu, Điện"
                    icon="gas-station"
                  />

                  <FieldInput
                    label="Màu sắc"
                    value={form.color}
                    onChangeText={(t) => onChangeForm(c => ({ ...c, color: t }))}
                    placeholder="VD: Đen, Trắng"
                    icon="palette"
                  />
                </>
              )}

              {/* Action buttons */}
              <View style={styles.actions}>
                <Pressable
                  style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                  onPress={onClose} disabled={submitting}>
                  <Text style={styles.cancelText}>Hủy</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.submitBtn, { backgroundColor: accentColor },
                    submitting && { opacity: 0.6 }, pressed && { opacity: 0.85 },
                  ]}
                  onPress={onSubmit} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name={isEdit ? 'check' : 'plus'} size={18} color="#fff" />
                      <Text style={styles.submitText}>{isEdit ? 'Lưu thay đổi' : 'Thêm phương tiện'}</Text>
                    </>
                  )}
                </Pressable>
              </View>

              <View style={{ height: Platform.OS === 'ios' ? 34 : 16 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '92%',
    shadowColor: DARK, shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: DARK },
  headerSub: { fontSize: 12, color: GRAY, marginTop: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: 20 },
  typeSection: { marginBottom: 16 },
  typeRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#FAFAFA',
    borderWidth: 1, borderColor: '#E2E8F0',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: CYAN + '15',
    borderColor: CYAN,
  },
  chipText: {
    fontSize: 13, fontWeight: '600', color: GRAY,
  },
  chipTextSelected: {
    color: CYAN,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 0.38, paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: BG, borderWidth: 1, borderColor: '#E2E8F0',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: GRAY },
  submitBtn: {
    flex: 0.62, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
  },
  submitText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});