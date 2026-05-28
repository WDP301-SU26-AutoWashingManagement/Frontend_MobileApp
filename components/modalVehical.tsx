import React from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Vehicle, VehicleType } from '@/services/vehicleService';

export type VehicleFormState = {
  plate_number: string;
  brand: string;
  vehicle_model: string;
  vehicle_type: VehicleType;
};

export const EMPTY_VEHICLE_FORM: VehicleFormState = {
  plate_number: '', brand: '', vehicle_model: '', vehicle_type: 'car',
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
          autoCapitalize={autoCapitalize || 'words'}
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
  const accentColor = form.vehicle_type === 'car' ? CYAN : '#8B5CF6';

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
                  <MaterialCommunityIcons
                    name={form.vehicle_type === 'car' ? 'car-outline' : 'motorbike'}
                    size={18} color={accentColor} />
                </View>
                <View>
                  <Text style={styles.headerTitle}>
                    {isEdit ? 'Chỉnh sửa phương tiện' : 'Thêm phương tiện'}
                  </Text>
                  <Text style={styles.headerSub}>
                    {isEdit ? `${editingVehicle.brand} ${editingVehicle.vehicle_model}` : 'Điền thông tin xe của bạn'}
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

              {/* Vehicle type selector */}
              <View style={styles.typeSection}>
                <Text style={fieldStyles.label}>Loại xe</Text>
                <View style={styles.typeRow}>
                  <TypeCard
                    icon="car"
                    label="Xe ô tô"
                    sublabel="Sedan, SUV, MPV..."
                    color={CYAN}
                    selected={form.vehicle_type === 'car'}
                    onPress={() => onChangeForm(c => ({ ...c, vehicle_type: 'car' }))}
                  />
                  <TypeCard
                    icon="motorbike"
                    label="Xe mô tô"
                    sublabel="Xe máy, scooter..."
                    color="#8B5CF6"
                    selected={form.vehicle_type === 'motorbike'}
                    onPress={() => onChangeForm(c => ({ ...c, vehicle_type: 'motorbike' }))}
                  />
                </View>
              </View>

              <FieldInput
                label="Biển số xe"
                value={form.plate_number}
                onChangeText={(t) => onChangeForm(c => ({ ...c, plate_number: t }))}
                placeholder="VD: 51G-123.45"
                autoCapitalize="characters"
                icon="card-account-details-outline"
              />
              <FieldInput
                label="Hãng xe"
                value={form.brand}
                onChangeText={(t) => onChangeForm(c => ({ ...c, brand: t }))}
                placeholder="VD: Toyota, Honda..."
                icon="factory"
              />
              <FieldInput
                label="Dòng xe"
                value={form.vehicle_model}
                onChangeText={(t) => onChangeForm(c => ({ ...c, vehicle_model: t }))}
                placeholder="VD: Vios, Civic..."
                icon="car-info"
              />

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

function TypeCard({ icon, label, sublabel, color, selected, onPress }: {
  icon: string; label: string; sublabel: string;
  color: string; selected: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        typeStyles.card,
        selected && [typeStyles.cardSelected, { borderColor: color, backgroundColor: color + '0D' }],
        pressed && { opacity: 0.8 },
      ]}
      onPress={onPress}>
      <View style={[typeStyles.iconBox, { backgroundColor: selected ? color + '20' : '#F1F5F9' }]}>
        <MaterialCommunityIcons name={icon as any} size={24} color={selected ? color : GRAY} />
      </View>
      <Text style={[typeStyles.label, selected && { color }]}>{label}</Text>
      <Text style={typeStyles.sublabel}>{sublabel}</Text>
      {selected && (
        <View style={[typeStyles.checkDot, { backgroundColor: color }]}>
          <MaterialCommunityIcons name="check" size={10} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

const typeStyles = StyleSheet.create({
  card: {
    flex: 1, alignItems: 'center', gap: 4,
    padding: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA', position: 'relative',
  },
  cardSelected: { backgroundColor: '#fff' },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  label: { fontSize: 13, fontWeight: '800', color: DARK },
  sublabel: { fontSize: 11, color: GRAY, textAlign: 'center' },
  checkDot: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
});

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
  typeRow: { flexDirection: 'row', gap: 10 },
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