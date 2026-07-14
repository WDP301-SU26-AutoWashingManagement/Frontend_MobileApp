import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuthService';
import attendanceService, { Schedule, AttendanceRecord } from '../../services/attendanceService';

// Theme Colors
const TEAL = '#0D9488';
const ROSE = '#F43F5E';
const INDIGO = '#6366F1';
const DARK = '#0F172A';
const GRAY = '#64748B';
const LIGHT_BG = '#F8FAFC';

export default function AttendanceScreen() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [attendances, setAttendances] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Default to today in YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  });

  const fetchAttendanceData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [allSchedules, myAttendance] = await Promise.all([
        attendanceService.getAllSchedules(),
        attendanceService.getMyAttendance(),
      ]);

      setSchedules(allSchedules);

      const attendanceMap: Record<string, AttendanceRecord> = {};
      myAttendance.forEach((a) => {
        const schedIdStr = typeof a.schedule_id === 'object' ? a.schedule_id._id : a.schedule_id;
        attendanceMap[schedIdStr] = a;
      });
      setAttendances(attendanceMap);
    } catch (error) {
      console.error('Error loading attendance dashboard:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu điểm danh');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAttendanceData();
    }, [user])
  );

  const handleCheckIn = async (scheduleId: string) => {
    Alert.alert('Xác nhận Check-in', 'Bạn muốn thực hiện Check-in cho ca làm việc này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Check-in',
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await attendanceService.checkIn(scheduleId);
            Alert.alert('Thành công', res.message || 'Check-in thành công!');
            fetchAttendanceData();
          } catch (error: any) {
            const serverMsg = error.response?.data?.message || error.response?.data?.error || error.message;
            Alert.alert('Thất bại', serverMsg || 'Không thể thực hiện Check-in');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleCheckOut = async (scheduleId: string) => {
    Alert.alert('Xác nhận Check-out', 'Bạn muốn thực hiện Check-out cho ca làm việc này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Check-out',
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await attendanceService.checkOut(scheduleId);
            Alert.alert('Thành công', res.message || 'Check-out thành công!');
            fetchAttendanceData();
          } catch (error: any) {
            const serverMsg = error.response?.data?.message || error.response?.data?.error || error.message;
            Alert.alert('Thất bại', serverMsg || 'Không thể thực hiện Check-out');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const currentUserId = (user as any)?.user_id || user?._id;

  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    const [year, month, day] = selectedDate.split('-').map(Number);
    return schedules
      .filter((s) => {
        const shiftDate = new Date(s.shift_date);
        const isMatchDate =
          shiftDate.getFullYear() === year &&
          shiftDate.getMonth() + 1 === month &&
          shiftDate.getDate() === day;

        const isAssigned = s.assigned_staff.some((st: any) => {
          if (!st) return false;
          const staffId = typeof st === 'object' ? st._id : st;
          const stUserId = typeof st === 'object' ? (st.user_id?._id || st.user_id) : null;
          return staffId === currentUserId || stUserId === currentUserId;
        });
        return isMatchDate && isAssigned;
      })
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [schedules, selectedDate, currentUserId]);

  const changeDay = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${dd}`);
  };

  const formatDateDisplay = (dateStr: string) => {
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const renderScheduleItem = ({ item }: { item: Schedule }) => {
    const attendance = attendances[item._id];
    const status = attendance?.status || 'pending';

    let statusBg = 'rgba(100, 116, 139, 0.08)';
    let statusTextColor = GRAY;
    let statusText = 'Chưa Check-in';
    let showBtn: 'check_in' | 'check_out' | 'done' = 'check_in';

    if (status === 'checked_in') {
      statusBg = 'rgba(13, 148, 136, 0.08)';
      statusTextColor = TEAL;
      statusText = 'Đang làm việc (Đã Check-in)';
      showBtn = 'check_out';
    } else if (status === 'checked_out') {
      statusBg = 'rgba(99, 102, 241, 0.08)';
      statusTextColor = INDIGO;
      statusText = 'Đã Check-out';
      showBtn = 'done';
    } else if (status === 'absent') {
      statusBg = 'rgba(244, 63, 94, 0.08)';
      statusTextColor = ROSE;
      statusText = 'Vắng mặt';
      showBtn = 'done';
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardInfo}>
          <View style={styles.timeRow}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={INDIGO} />
            <Text style={styles.timeText}>
              {item.start_time} - {item.end_time}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusTextColor }]}>
              {statusText}
            </Text>
          </View>
        </View>

        <View style={styles.actionCol}>
          {actionLoading ? (
            <ActivityIndicator size="small" color={TEAL} />
          ) : showBtn === 'check_in' ? (
            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnCheckIn, pressed && styles.btnPressed]}
              onPress={() => handleCheckIn(item._id)}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.btnText}>Check-in</Text>
            </Pressable>
          ) : showBtn === 'check_out' ? (
            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnCheckOut, pressed && styles.btnPressed]}
              onPress={() => handleCheckOut(item._id)}
            >
              <MaterialCommunityIcons name="logout" size={16} color="#FFFFFF" />
              <Text style={styles.btnText}>Check-out</Text>
            </Pressable>
          ) : (
            <View style={[styles.btn, styles.btnDisabled]}>
              <Text style={styles.btnTextDisabled}>Hoàn tất</Text>
            </View>
          )}
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
          <Text style={styles.headerTitle}>Điểm Danh Ca Làm</Text>
          <Text style={styles.headerSub}>
            Chào, {user?.full_name || 'Nhân viên'} (Technical)
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
          onPress={fetchAttendanceData}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={TEAL} />
          ) : (
            <Ionicons name="refresh" size={20} color={TEAL} />
          )}
        </Pressable>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateSelector}>
        <Pressable style={styles.dateArrow} onPress={() => changeDay(-1)}>
          <Ionicons name="chevron-back" size={22} color={DARK} />
        </Pressable>
        <View style={styles.dateInfo}>
          <MaterialCommunityIcons name="calendar-month" size={20} color={TEAL} style={{ marginRight: 6 }} />
          <Text style={styles.dateText}>{formatDateDisplay(selectedDate)}</Text>
        </View>
        <Pressable style={styles.dateArrow} onPress={() => changeDay(1)}>
          <Ionicons name="chevron-forward" size={22} color={DARK} />
        </Pressable>
      </View>

      {/* Shifts List */}
      {loading && filteredSchedules.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={styles.loadingText}>Đang tải ca làm việc...</Text>
        </View>
      ) : filteredSchedules.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={44} color={TEAL} />
          </View>
          <Text style={styles.emptyText}>Không có ca làm việc</Text>
          <Text style={styles.emptySubtext}>
            Bạn không được phân công ca làm việc nào trong ngày {formatDateDisplay(selectedDate)}.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSchedules}
          renderItem={renderScheduleItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={fetchAttendanceData}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardInfo: {
    flex: 1,
    gap: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionCol: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 100,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnCheckIn: {
    backgroundColor: TEAL,
  },
  btnCheckOut: {
    backgroundColor: ROSE,
  },
  btnDisabled: {
    backgroundColor: '#F1F5F9',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnTextDisabled: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 100,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 60,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
