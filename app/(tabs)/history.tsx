import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface HistoryItem {
  id: string;
  date: string;
  vehicle: string;
  service: string;
  price: number;
  duration: string;
  rating?: number;
}

const MOCK_HISTORY: HistoryItem[] = [
  {
    id: '1',
    date: '2026-05-20',
    vehicle: 'Honda Air Blade',
    service: 'Rửa xe ngoài + Đánh bóng',
    price: 250000,
    duration: '45 phút',
    rating: 5,
  },
  {
    id: '2',
    date: '2026-05-15',
    vehicle: 'Toyota Vios',
    service: 'Rửa xe cơ bản',
    price: 150000,
    duration: '30 phút',
    rating: 4,
  },
  {
    id: '3',
    date: '2026-05-10',
    vehicle: 'Honda Air Blade',
    service: 'Rửa xe cơ bản',
    price: 100000,
    duration: '20 phút',
    rating: 5,
  },
];

const RatingStars = ({ rating }: { rating?: number }) => {
  if (!rating) return null;

  return (
    <View style={styles.ratingContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialCommunityIcons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={14}
          color={star <= rating ? '#F59E0B' : '#D1D5DB'}
        />
      ))}
    </View>
  );
};

export default function HistoryScreen() {
  const [history, setHistory] = React.useState<HistoryItem[]>(MOCK_HISTORY);
  const [filter, setFilter] = React.useState<'all' | 'week' | 'month' | 'year'>('all');

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.historyDate}>
          <MaterialCommunityIcons name="calendar" size={18} color="#06B6D4" />
          <Text style={styles.dateText}>{new Date(item.date).toLocaleDateString('vi-VN')}</Text>
        </View>
        <View style={styles.historyPrice}>
          <Text style={styles.priceText}>{item.price.toLocaleString('vi-VN')} ₫</Text>
        </View>
      </View>

      <View style={styles.historyBody}>
        <View style={styles.serviceInfo}>
          <MaterialCommunityIcons name="car" size={18} color="#64748B" />
          <Text style={styles.vehicleText}>{item.vehicle}</Text>
        </View>
        <View style={styles.serviceInfo}>
          <MaterialCommunityIcons name="spray-bottle" size={18} color="#64748B" />
          <Text style={styles.serviceText}>{item.service}</Text>
        </View>
        <View style={styles.serviceInfo}>
          <MaterialCommunityIcons name="clock" size={18} color="#64748B" />
          <Text style={styles.durationText}>{item.duration}</Text>
        </View>
      </View>

      <View style={styles.historyFooter}>
        <RatingStars rating={item.rating} />
        <Pressable style={styles.detailButton}>
          <Text style={styles.detailButtonText}>Chi tiết</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lịch sử dịch vụ</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}>
        <View style={styles.filters}>
          {(['all', 'week', 'month', 'year'] as const).map((f) => (
            <Pressable
              key={f}
              style={[
                styles.filterButton,
                filter === f && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(f)}>
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}>
                {f === 'all' ? 'Tất cả' : f === 'week' ? 'Tuần' : f === 'month' ? 'Tháng' : 'Năm'}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="history" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Chưa có lịch sử</Text>
          <Text style={styles.emptySubtext}>Bạn chưa sử dụng dịch vụ nào</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
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

  filterScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  filters: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },

  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  filterButtonActive: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },

  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },

  filterTextActive: {
    color: '#FFFFFF',
  },

  listContent: {
    padding: 12,
    gap: 12,
  },

  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },

  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  historyDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },

  historyPrice: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },

  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },

  historyBody: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },

  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  vehicleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },

  serviceText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },

  durationText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  ratingContainer: {
    flexDirection: 'row',
    gap: 4,
  },

  detailButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  detailButtonText: {
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
});
