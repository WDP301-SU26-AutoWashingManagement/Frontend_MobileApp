import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Vehicle {
  id: string;
  name: string;
  type: 'xe ô tô' | 'xe mô tô';
  licensePlate: string;
  color: string;
  brand: string;
  model: string;
  year: number;
}

const MOCK_VEHICLES: Vehicle[] = [
  {
    id: '1',
    name: 'Toyota Vios',
    type: 'xe ô tô',
    licensePlate: 'SG-0001',
    color: 'Trắng',
    brand: 'Toyota',
    model: 'Vios',
    year: 2023,
  },
  {
    id: '2',
    name: 'Honda Air Blade',
    type: 'xe mô tô',
    licensePlate: 'SG-0002',
    color: 'Đen',
    brand: 'Honda',
    model: 'Air Blade',
    year: 2022,
  },
];

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [loading, setLoading] = useState(false);

  const renderVehicleItem = ({ item }: { item: Vehicle }) => (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleHeader}>
        <MaterialCommunityIcons
          name={item.type === 'xe ô tô' ? 'car' : 'motorbike'}
          size={28}
          color="#06B6D4"
        />
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{item.name}</Text>
          <Text style={styles.vehiclePlate}>{item.licensePlate}</Text>
        </View>
      </View>

      <View style={styles.vehicleDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Màu sắc</Text>
          <Text style={styles.detailValue}>{item.color}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Năm sản xuất</Text>
          <Text style={styles.detailValue}>{item.year}</Text>
        </View>
      </View>

      <View style={styles.vehicleActions}>
        <Pressable style={styles.actionButton}>
          <MaterialCommunityIcons name="pencil" size={18} color="#06B6D4" />
          <Text style={styles.actionText}>Chỉnh sửa</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.deleteButton]}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>Xóa</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Phương tiện của tôi</Text>
        <Pressable style={styles.addButton}>
          <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="car-off" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Chưa có phương tiện</Text>
          <Text style={styles.emptySubtext}>Thêm phương tiện để bắt đầu đặt lịch rửa xe</Text>
          <Pressable style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>Thêm phương tiện</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          renderItem={renderVehicleItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

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

  addButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#06B6D4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  listContent: {
    padding: 12,
    gap: 12,
  },

  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },

  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },

  vehicleInfo: {
    flex: 1,
  },

  vehicleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },

  vehiclePlate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },

  vehicleDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  detailValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },

  vehicleActions: {
    flexDirection: 'row',
    gap: 8,
  },

  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  deleteButton: {
    borderColor: '#FEE2E2',
  },

  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#06B6D4',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
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
});
