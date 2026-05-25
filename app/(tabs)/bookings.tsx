import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Booking {
  id: string;
  date: string;
  time: string;
  vehicle: string;
  service: string;
  price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

const MOCK_BOOKINGS: Booking[] = [
  {
    id: '1',
    date: '2026-05-26',
    time: '14:00',
    vehicle: 'Toyota Vios (SG-0001)',
    service: 'Rửa xe cơ bản',
    price: 150000,
    status: 'confirmed',
  },
  {
    id: '2',
    date: '2026-05-20',
    time: '10:30',
    vehicle: 'Honda Air Blade (SG-0002)',
    service: 'Rửa xe ngoài + Đánh bóng',
    price: 250000,
    status: 'completed',
  },
];

const getStatusColor = (status: Booking['status']) => {
  switch (status) {
    case 'pending':
      return '#F59E0B';
    case 'confirmed':
      return '#3B82F6';
    case 'completed':
      return '#10B981';
    case 'cancelled':
      return '#EF4444';
    default:
      return '#6B7280';
  }
};

const getStatusLabel = (status: Booking['status']) => {
  switch (status) {
    case 'pending':
      return 'Chờ xác nhận';
    case 'confirmed':
      return 'Đã xác nhận';
    case 'completed':
      return 'Hoàn thành';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status;
  }
};

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [showModal, setShowModal] = useState(false);

  const renderBookingItem = ({ item }: { item: Booking }) => (
    <View style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <View style={styles.bookingDateTime}>
          <MaterialCommunityIcons name="calendar" size={20} color="#06B6D4" />
          <View>
            <Text style={styles.date}>{new Date(item.date).toLocaleDateString('vi-VN')}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="car" size={18} color="#64748B" />
          <Text style={styles.detailText}>{item.vehicle}</Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="spray-bottle" size={18} color="#64748B" />
          <Text style={styles.detailText}>{item.service}</Text>
        </View>
      </View>

      <View style={styles.bookingFooter}>
        <Text style={styles.price}>{item.price.toLocaleString('vi-VN')} ₫</Text>
        <View style={styles.actions}>
          {item.status === 'confirmed' && (
            <Pressable style={styles.actionBtn}>
              <MaterialCommunityIcons name="check" size={18} color="#10B981" />
            </Pressable>
          )}
          <Pressable style={styles.actionBtn}>
            <MaterialCommunityIcons name="information" size={18} color="#3B82F6" />
          </Pressable>
        </View>
      </View>
    </View>
  );

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

      {bookings.length === 0 ? (
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
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      <BookingModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={(newBooking) => {
          setBookings([...bookings, newBooking]);
          setShowModal(false);
        }}
      />
    </View>
  );
}

interface BookingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (booking: Booking) => void;
}

function BookingModal({ visible, onClose, onSubmit }: BookingModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleSubmit = () => {
    if (date && time) {
      const newBooking: Booking = {
        id: Date.now().toString(),
        date,
        time,
        vehicle: 'Toyota Vios (SG-0001)',
        service: 'Rửa xe cơ bản',
        price: 150000,
        status: 'pending',
      };
      onSubmit(newBooking);
      setDate('');
      setTime('');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Đặt lịch rửa xe</Text>
            <Pressable onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#0F172A" />
            </Pressable>
          </View>

          <View style={styles.modalForm}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Ngày</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={date}
                onChangeText={setDate}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Giờ</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={time}
                onChangeText={setTime}
              />
            </View>

            <Pressable
              style={[styles.submitButton, !date || !time ? styles.submitButtonDisabled : null]}
              disabled={!date || !time}
              onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Đặt lịch</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
    gap: 12,
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
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },

  modalForm: {
    padding: 16,
    gap: 16,
  },

  formGroup: {
    gap: 8,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },

  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },

  submitButton: {
    backgroundColor: '#06B6D4',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },

  submitButtonDisabled: {
    opacity: 0.5,
  },

  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
