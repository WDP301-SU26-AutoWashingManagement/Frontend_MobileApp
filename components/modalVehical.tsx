import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  FlatList
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Vehicle } from '@/services/vehicleService';

export type VehicleFormState = {
  make_id: string;
  vehicle_class_id: string;
  model_id: string;
  license_plate: string;
  vehicle_model: string;
  fuel_type: string;
  color: string;
};

export const EMPTY_VEHICLE_FORM: VehicleFormState = {
  make_id: '',
  vehicle_class_id: '',
  model_id: '',
  license_plate: '',
  vehicle_model: '',
  fuel_type: 'Xăng',
  color: ''
};

type ModalVehicalProps = {
  visible: boolean;
  submitting: boolean;
  editingVehicle: Vehicle | null;
  form: VehicleFormState;
  onClose: () => void;
  onSubmit: () => void;
  onChangeForm: React.Dispatch<React.SetStateAction<VehicleFormState>>;
  classesList?: any[];
  modelsList?: any[];
  makesList?: any[];
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

// Custom Dropdown/Picker Component matching the input styles
function SelectField({
  label, value, options, placeholder, onSelect, icon, disabled = false
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  onSelect: (value: string) => void;
  icon: string;
  disabled?: boolean;
}) {
  const [modalVisible, setModalVisible] = useState(false);
  
  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <View style={fieldStyles.group}>
      <Text style={fieldStyles.label}>{label}</Text>
      <Pressable
        style={[fieldStyles.inputRow, disabled && styles.disabledRow]}
        onPress={() => { if (!disabled) setModalVisible(true); }}
      >
        <MaterialCommunityIcons name={icon as any} size={17} color={GRAY} style={fieldStyles.icon} />
        <Text style={[
          fieldStyles.inputText,
          !selectedOption && { color: '#94A3B8' }
        ]}>
          {displayLabel}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={GRAY} />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{label}</Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.pickerCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={18} color={DARK} />
              </Pressable>
            </View>

            {options.length === 0 ? (
              <View style={styles.emptyOptions}>
                <Text style={styles.emptyOptionsText}>Không có lựa chọn nào</Text>
              </View>
            ) : (
              <FlatList
                data={options}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => {
                  const isSelected = item.value === value;
                  return (
                    <Pressable
                      style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                      onPress={() => {
                        onSelect(item.value);
                        setModalVisible(false);
                      }}
                    >
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                        {item.label}
                      </Text>
                      {isSelected && (
                        <MaterialCommunityIcons name="check" size={18} color={CYAN} />
                      )}
                    </Pressable>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.optionSeparator} />}
                contentContainerStyle={{ paddingBottom: 30 }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function ModalVehical({
  visible, submitting, editingVehicle, form, onClose, onSubmit, onChangeForm,
  classesList = [], modelsList = [], makesList = []
}: ModalVehicalProps) {
  const isEdit = !!editingVehicle;
  const accentColor = CYAN;
  
  // Format classes, makes, and models options
  const classesOptions = classesList.map(c => ({
    label: c.class_name,
    value: c._id
  }));

  const makesOptions = makesList.map(m => ({
    label: m.make_name,
    value: m._id
  }));

  // Filter models options by selected make_id
  const filteredModels = modelsList.filter(m => {
    const makeId = typeof m.make_id === 'object' && m.make_id !== null ? m.make_id?._id : m.make_id;
    return makeId === form.make_id;
  });

  const modelsOptions = filteredModels.map(m => ({
    label: m.model_name,
    value: m._id
  }));

  const fuelOptions = [
    { label: 'Xăng', value: 'Xăng' },
    { label: 'Dầu', value: 'Dầu' },
    { label: 'Điện', value: 'Điện' }
  ];

  const handleSelectMake = (makeId: string) => {
    onChangeForm(prev => ({
      ...prev,
      make_id: makeId,
      model_id: '' // reset model when make changes
    }));
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
                    {isEdit ? 'Chỉnh sửa phương tiện' : 'Thêm phương tiện mới'}
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
              
              <FieldInput
                label="Biển số xe *"
                value={form.license_plate}
                onChangeText={(t) => onChangeForm(c => ({ ...c, license_plate: t }))}
                placeholder="VD: 59A1-12345"
                autoCapitalize="characters"
                icon="card-account-details-outline"
              />

              <View style={styles.row}>
                <View style={styles.col}>
                  <SelectField
                    label="Hãng xe *"
                    value={form.make_id}
                    options={makesOptions}
                    placeholder="Chọn hãng"
                    onSelect={handleSelectMake}
                    icon="factory"
                  />
                </View>
                <View style={styles.col}>
                  <SelectField
                    label="Dòng xe (Model) *"
                    value={form.model_id}
                    options={modelsOptions}
                    placeholder={form.make_id ? "Chọn dòng" : "Hãng trước"}
                    onSelect={(val) => onChangeForm(prev => ({ ...prev, model_id: val }))}
                    icon="car-info"
                    disabled={!form.make_id}
                  />
                </View>
              </View>

              <SelectField
                label="Loại xe (Kiểu dáng) *"
                value={form.vehicle_class_id}
                options={classesOptions}
                placeholder="Chọn loại xe"
                onSelect={(val) => onChangeForm(prev => ({ ...prev, vehicle_class_id: val }))}
                icon="car-estate"
              />

              <FieldInput
                label="Tên xe (Phiên bản cụ thể) *"
                value={form.vehicle_model}
                onChangeText={(t) => onChangeForm(c => ({ ...c, vehicle_model: t }))}
                placeholder="VD: SH 150i, Camry 2.5Q..."
                icon="label-outline"
              />

              <View style={styles.row}>
                <View style={styles.col}>
                  <SelectField
                    label="Loại nhiên liệu *"
                    value={form.fuel_type}
                    options={fuelOptions}
                    placeholder="Nhiên liệu"
                    onSelect={(val) => onChangeForm(prev => ({ ...prev, fuel_type: val }))}
                    icon="gas-station"
                  />
                </View>
                <View style={styles.col}>
                  <FieldInput
                    label="Màu xe *"
                    value={form.color}
                    onChangeText={(t) => onChangeForm(c => ({ ...c, color: t }))}
                    placeholder="VD: Trắng, Đen..."
                    icon="palette"
                  />
                </View>
              </View>

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
                      <Text style={styles.submitText}>{isEdit ? 'Cập nhật' : 'Thêm mới'}</Text>
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

const fieldStyles = StyleSheet.create({
  group: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: DARK, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, backgroundColor: '#FAFAFA',
    paddingHorizontal: 12, height: 48,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, height: '100%', fontSize: 14, color: DARK },
  inputText: { flex: 1, fontSize: 14, color: DARK },
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
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
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: {
    flex: 0.38, paddingVertical: 13, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: GRAY },
  submitBtn: {
    flex: 0.62, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 10,
  },
  submitText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Picker Modal Styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingHorizontal: 20,
    paddingTop: 16,
    shadowColor: DARK,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DARK,
  },
  pickerCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  optionItemSelected: {
    backgroundColor: CYAN + '0A',
    borderRadius: 8,
  },
  optionLabel: {
    fontSize: 14,
    color: DARK,
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: CYAN,
    fontWeight: '700',
  },
  optionSeparator: {
    height: 1,
    backgroundColor: '#F8FAFC',
  },
  emptyOptions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyOptionsText: {
    fontSize: 14,
    color: GRAY,
  },
  disabledRow: {
    opacity: 0.55,
    backgroundColor: '#F1F5F9',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
});