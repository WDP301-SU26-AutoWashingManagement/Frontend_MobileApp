import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuthService';
import bookingService, { Booking } from '../../services/bookingService';

const { width } = Dimensions.get('window');

const CYAN = '#06B6D4';
const PURPLE = '#8B5CF6';
const GREEN = '#10B981';
const AMBER = '#F59E0B';
const ROSE = '#EF4444';
const DARK = '#0F172A';
const GRAY = '#64748B';
const SURFACE = '#FFFFFF';
const BG = '#F1F5F9';

// Status badging styles mapping
const getStatusStyles = (status: Booking['booking_status'] | 'washed') => {
  switch (status) {
    case 'pending':
      return { text: AMBER, bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)' };
    case 'confirmed':
      return { text: '#2563EB', bg: 'rgba(39,130,246,0.08)', border: 'rgba(39,130,246,0.18)' };
    case 'checked_in':
      return { text: PURPLE, bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.18)' };
    case 'in_progress':
      return { text: '#DB2777', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.18)' };
    case 'washed':
      return { text: '#0D9488', bg: 'rgba(13,148,136,0.08)', border: 'rgba(13,148,136,0.18)' };
    case 'completed':
      return { text: GREEN, bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)' };
    case 'cancelled':
      return { text: ROSE, bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.18)' };
    default:
      return { text: '#4B5563', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.18)' };
  }
};

const getStatusLabel = (status: any) => {
  switch (status) {
    case 'pending':
      return 'Chờ xác nhận';
    case 'confirmed':
      return 'Đã xác nhận';
    case 'checked_in':
      return 'Đã check-in';
    case 'in_progress':
      return 'Đang rửa xe';
    case 'washed':
      return 'Rửa xong';
    case 'completed':
      return 'Hoàn thành';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status;
  }
};

type TabType = 'pending' | 'active' | 'completed' | 'cancelled';

export default function StaffBookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const list = await bookingService.list();
      // Sort bookings by date descending
      const sorted = [...list].sort((a, b) => {
        const dateA = new Date(a.scheduled_at).getTime();
        const dateB = new Date(b.scheduled_at).getTime();
        return dateB - dateA;
      });
      setBookings(sorted);
    } catch (err: any) {
      console.error('Fetch bookings error:', err);
      Alert.alert('Lỗi', 'Không thể tải danh sách lịch hẹn');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  const handleUpdateStatus = async (bookingId: string, action: 'confirm' | 'checkin' | 'start' | 'washed' | 'complete') => {
    let actionText = '';
    switch (action) {
      case 'confirm': actionText = 'xác nhận lịch hẹn'; break;
      case 'checkin': actionText = 'nhận xe khách'; break;
      case 'start': actionText = 'bắt đầu rửa xe'; break;
      case 'washed': actionText = 'báo rửa xong'; break;
      case 'complete': actionText = 'hoàn thành đơn hàng'; break;
    }

    Alert.alert(
      'Xác nhận thao tác',
      `Bạn có chắc chắn muốn ${actionText} này?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý',
          onPress: async () => {
            try {
              setActionLoading(true);
              if (action === 'confirm') await bookingService.confirm(bookingId);
              else if (action === 'checkin') await bookingService.checkin(bookingId);
              else if (action === 'start') await bookingService.start(bookingId);
              else if (action === 'washed') await bookingService.washed(bookingId);
              else if (action === 'complete') await bookingService.complete(bookingId);

              Alert.alert('Thành công', 'Cập nhật trạng thái thành công');
              setSelectedBooking(null);
              fetchBookings();
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Cập nhật thất bại');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter((b) => {
    const status = b.booking_status;
    if (activeTab === 'pending') {
      return status === 'pending';
    } else if (activeTab === 'active') {
      return status === 'confirmed' || status === 'checked_in' || status === 'in_progress' || (status as string) === 'washed';
    } else if (activeTab === 'completed') {
      return status === 'completed';
    } else if (activeTab === 'cancelled') {
      return status === 'cancelled';
    }
    return false;
  });

  const getVehicleDisplayName = (vehicle: any) => {
    if (!vehicle) return 'Xe khách hàng';
    const brand = vehicle.brand || '';
    const model = vehicle.vehicle_model || '';
    const nameParts = [];
    if (brand) nameParts.push(brand);
    if (model) nameParts.push(model);
    return nameParts.length > 0 ? nameParts.join(' ') : 'Xe khách hàng';
  };

  const getBookingServicesList = (services: Booking['services']) => {
    if (!services || !Array.isArray(services)) return [];
    const list: { name: string; isCombo: boolean }[] = [];
    
    services.forEach((s: any) => {
      const pkg = s.service_package_id || s.service_package;
      const svc = s.service_id || s.service;
      
      if (pkg && typeof pkg === 'object') {
        const pName = (pkg as any).package_name || (pkg as any).service_name || (pkg as any).name;
        if (pName && !list.some(item => item.name === pName && item.isCombo)) {
          list.push({ name: pName, isCombo: true });
        }
      } else if (svc && typeof svc === 'object') {
        const sName = (svc as any).service_name || (svc as any).name;
        if (sName) {
          list.push({ name: sName, isCombo: false });
        }
      }
    });
    
    return list;
  };

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const scheduledDate = new Date(item.scheduled_at);
    const dayVal = String(scheduledDate.getDate()).padStart(2, '0');
    const monthVal = `T${scheduledDate.getMonth() + 1}`;
    const timeFormatted = scheduledDate.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const statusStyles = getStatusStyles(item.booking_status);
    const bookingServices = getBookingServicesList(item.services);
    const bookingVehicle = item.vehicle_id || item.vehicle;
    const bookingBranch = item.branch_id || item.branch;
    const vehicleName = getVehicleDisplayName(bookingVehicle);
    const shortId = item._id.slice(-6).toUpperCase();

    // Render action buttons based on status
    const renderActionBtn = () => {
      const status = item.booking_status;
      if (status === 'pending') {
        return (
          <Pressable
            style={styles.actionBtn}
            onPress={() => handleUpdateStatus(item._id, 'confirm')}>
            <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Xác nhận</Text>
          </Pressable>
        );
      } else if (status === 'confirmed') {
        return (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: PURPLE }]}
            onPress={() => handleUpdateStatus(item._id, 'checkin')}>
            <MaterialCommunityIcons name="car-key" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Nhận xe</Text>
          </Pressable>
        );
      } else if (status === 'checked_in') {
        return (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: CYAN }]}
            onPress={() => handleUpdateStatus(item._id, 'start')}>
            <MaterialCommunityIcons name="play" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Bắt đầu rửa</Text>
          </Pressable>
        );
      } else if (status === 'in_progress') {
        return (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: '#0D9488' }]}
            onPress={() => handleUpdateStatus(item._id, 'washed')}>
            <MaterialCommunityIcons name="water-check-outline" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Báo rửa xong</Text>
          </Pressable>
        );
      } else if ((status as string) === 'washed') {
        return (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: GREEN }]}
            onPress={() => handleUpdateStatus(item._id, 'complete')}>
            <MaterialCommunityIcons name="cash-register" size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Hoàn thành</Text>
          </Pressable>
        );
      }
      return null;
    };

    return (
      <Pressable style={styles.bookingCard} onPress={() => setSelectedBooking(item)}>
        <View style={styles.bookingHeader}>
          {/* Calendar Ticket */}
          <View style={styles.calendarBlock}>
            <View style={styles.calendarLeft}>
              <Text style={styles.calendarDay}>{dayVal}</Text>
              <Text style={styles.calendarMonth}>{monthVal}</Text>
            </View>
            <View style={styles.calendarRight}>
              <Text style={styles.calendarTime}>{timeFormatted}</Text>
              <Text style={styles.calendarYear}>{scheduledDate.getFullYear()}</Text>
            </View>
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              { 
                backgroundColor: statusStyles.bg, 
                borderColor: statusStyles.border,
                borderWidth: 1 
              },
            ]}>
            <Text style={[styles.statusDot, { color: statusStyles.text }]}>●</Text>
            <Text style={[styles.statusText, { color: statusStyles.text }]}>
              {getStatusLabel(item.booking_status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardDividerContainer}>
          <View style={styles.dividerDot} />
          <View style={styles.cardDividerLine} />
          <View style={styles.dividerDot} />
        </View>

        <View style={styles.bookingDetails}>
          {/* ID & License Plate Row */}
          <View style={styles.idPlateRow}>
            <Text style={styles.bookingIdText}>Mã đơn: #{shortId}</Text>
            {bookingVehicle?.license_plate && (
              <View style={styles.plateContainer}>
                <View style={styles.plateInnerBorder}>
                  <View style={styles.plateRegistrationDot} />
                  <Text style={styles.plateText}>{bookingVehicle.license_plate.toUpperCase()}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Branch Section */}
          {bookingBranch?.branch_address && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={15} color={CYAN} style={styles.detailIcon} />
              <Text style={styles.detailText} numberOfLines={1}>
                {bookingBranch.branch_address.street}, {bookingBranch.branch_address.district}
              </Text>
            </View>
          )}

          {/* Vehicle Model */}
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="car-outline" size={15} color={PURPLE} style={styles.detailIcon} />
            <Text style={styles.detailText} numberOfLines={1}>{vehicleName}</Text>
          </View>

          {/* Services Section with Tags */}
          {bookingServices.length > 0 && (
            <View style={styles.servicesWrap}>
              {bookingServices.map((svc, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.serviceChip, 
                    svc.isCombo ? styles.comboServiceChip : styles.singleServiceChip
                  ]}
                >
                  <Text 
                    style={[
                      styles.serviceChipText,
                      svc.isCombo ? styles.comboServiceChipText : styles.singleServiceChipText
                    ]}
                  >
                    {svc.isCombo ? `Combo: ${svc.name}` : svc.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Footer Actions */}
        <View style={styles.bookingFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceMetaLabel}>Tổng thu</Text>
            <Text style={styles.price}>{(item.final_price ?? 0).toLocaleString('vi-VN')} đ</Text>
          </View>
          <View style={styles.actionsBox}>
            {renderActionBtn()}
          </View>
        </View>
      </Pressable>
    );
  };

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'pending', label: 'Chờ duyệt', icon: 'clipboard-alert-outline' },
    { key: 'active', label: 'Đang làm', icon: 'progress-wrench' },
    { key: 'completed', label: 'Đã xong', icon: 'checkbox-marked-circle-outline' },
    { key: 'cancelled', label: 'Đã hủy', icon: 'close-circle-outline' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Quản Lý Lịch Hẹn</Text>
          <Text style={styles.headerSub}>Chào, {user?.full_name || 'Nhân viên'} (Staff)</Text>
        </View>
        <Pressable 
          style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.7 }]}
          onPress={fetchBookings}>
          <Ionicons name="refresh" size={20} color={CYAN} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.key)}>
              <MaterialCommunityIcons 
                name={tab.icon} 
                size={16} 
                color={isActive ? '#FFFFFF' : GRAY} 
                style={{ marginBottom: 2 }}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Booking List */}
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={CYAN} />
          <Text style={styles.loadingText}>Đang tải lịch hẹn...</Text>
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.centerState}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>Không có lịch hẹn nào</Text>
          <Text style={styles.emptySubtext}>Không tìm thấy đơn hàng nào ở trạng thái này.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={fetchBookings}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Booking Detail Modal */}
      <Modal
        visible={!!selectedBooking}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedBooking(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedBooking(null)} />
          
          <View style={styles.modalContent}>
            {selectedBooking && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chi tiết lịch hẹn</Text>
                  <Pressable onPress={() => setSelectedBooking(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={DARK} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Trạng thái đơn</Text>
                    <View style={styles.modalStatusRow}>
                      <View style={[
                        styles.statusBadge,
                        { 
                          backgroundColor: getStatusStyles(selectedBooking.booking_status).bg,
                          borderColor: getStatusStyles(selectedBooking.booking_status).border,
                          borderWidth: 1 
                        }
                      ]}>
                        <Text style={[styles.statusDot, { color: getStatusStyles(selectedBooking.booking_status).text }]}>●</Text>
                        <Text style={[styles.statusText, { color: getStatusStyles(selectedBooking.booking_status).text }]}>
                          {getStatusLabel(selectedBooking.booking_status)}
                        </Text>
                      </View>
                      <Text style={styles.modalIdText}>#{selectedBooking._id.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Khách hàng & Phương tiện</Text>
                    <View style={styles.infoCard}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Khách hàng:</Text>
                        <Text style={styles.infoVal}>{selectedBooking.customer_id?.user_id?.full_name || 'Khách vãng lai'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Số điện thoại:</Text>
                        <Text style={styles.infoVal}>{selectedBooking.customer_id?.user_id?.phone || 'Không có'}</Text>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Biển số xe:</Text>
                        <Text style={[styles.infoVal, { fontWeight: '700' }]}>
                          {selectedBooking.vehicle_id?.license_plate?.toUpperCase() || selectedBooking.vehicle?.license_plate?.toUpperCase() || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Hiệu xe:</Text>
                        <Text style={styles.infoVal}>{getVehicleDisplayName(selectedBooking.vehicle_id || selectedBooking.vehicle)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Thời gian & Địa điểm</Text>
                    <View style={styles.infoCard}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Thời gian hẹn:</Text>
                        <Text style={styles.infoVal}>
                          {new Date(selectedBooking.scheduled_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedBooking.scheduled_at).toLocaleDateString('vi-VN')}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Cơ sở thực hiện:</Text>
                        <Text style={styles.infoVal} numberOfLines={2}>
                          {selectedBooking.branch_id?.branch_address?.street || selectedBooking.branch?.branch_address?.street}, {selectedBooking.branch_id?.branch_address?.district || selectedBooking.branch?.branch_address?.district}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Dịch vụ & Thanh toán</Text>
                    <View style={styles.infoCard}>
                      {(() => {
                        const combos: Record<string, { name: string, price: number, items: string[] }> = {};
                        const individuals: Array<{ name: string, price: number }> = [];
                        
                        selectedBooking.services.forEach(svc => {
                          const pkg = svc.service_package_id || svc.service_package;
                          const service = svc.service_id || svc.service;
                          if (pkg) {
                            const pkgId = pkg._id;
                            if (!combos[pkgId]) {
                              combos[pkgId] = {
                                name: pkg.package_name || pkg.name || pkg.service_name || 'Combo',
                                price: 0,
                                items: []
                              };
                            }
                            combos[pkgId].price += svc.price_snapshot;
                            combos[pkgId].items.push(service?.service_name || 'Dịch vụ');
                          } else {
                            individuals.push({
                              name: service?.service_name || 'Dịch vụ',
                              price: svc.price_snapshot
                            });
                          }
                        });

                        return (
                          <View style={{ width: '100%', gap: 10 }}>
                            <Text style={[styles.infoLabel, { fontSize: 13, marginBottom: 4 }]}>Chi tiết dịch vụ:</Text>
                            
                            {/* Render Combos */}
                            {Object.values(combos).map((combo, idx) => (
                              <View key={`combo-${idx}`} style={{ width: '100%', marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0891B2', flex: 1, paddingRight: 8 }}>
                                    {combo.name}
                                  </Text>
                                  <Text style={{ fontSize: 13, fontWeight: '600', color: DARK }}>
                                    {combo.price.toLocaleString('vi-VN')} đ
                                  </Text>
                                </View>
                                {combo.items.map((subItem, sIdx) => (
                                  <Text key={`sub-${sIdx}`} style={{ fontSize: 12, color: GRAY, marginLeft: 12, marginTop: 2 }}>
                                    • {subItem}
                                  </Text>
                                ))}
                              </View>
                            ))}

                            {/* Render Individuals */}
                            {individuals.map((ind, idx) => (
                              <View key={`ind-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 4 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: DARK, flex: 1, paddingRight: 8 }}>
                                  {ind.name}
                                </Text>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: DARK }}>
                                  {ind.price.toLocaleString('vi-VN')} đ
                                </Text>
                              </View>
                            ))}
                          </View>
                        );
                      })()}

                      <View style={styles.divider} />

                      {/* original base price */}
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Tổng phí dịch vụ:</Text>
                        <Text style={styles.infoVal}>
                          {(selectedBooking.base_price ?? 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </View>

                      {/* Tier membership discount */}
                      {selectedBooking.customer_id?.tier_id?.discount_percentage ? (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>
                            Hạng {selectedBooking.customer_id.tier_id.tier_name || 'thành viên'}:
                          </Text>
                          <Text style={[styles.infoVal, { color: GREEN }]}>
                            -{selectedBooking.customer_id.tier_id.discount_percentage}%
                          </Text>
                        </View>
                      ) : null}

                      {/* Other discounts */}
                      {selectedBooking.discount_amount ? (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Khuyến mãi khác:</Text>
                          <Text style={[styles.infoVal, { color: GREEN }]}>
                            -{selectedBooking.discount_amount.toLocaleString('vi-VN')} đ
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.divider} />

                      {/* Final Price */}
                      <View style={[styles.infoRow, { marginTop: 4 }]}>
                        <Text style={[styles.infoLabel, { fontWeight: '700', color: DARK }]}>Tổng thanh toán:</Text>
                        <Text style={[styles.infoVal, { fontWeight: '800', color: ROSE, fontSize: 16 }]}>
                          {(() => {
                            const base = selectedBooking.base_price ?? 0;
                            const discPct = selectedBooking.customer_id?.tier_id?.discount_percentage || 0;
                            const otherDisc = selectedBooking.discount_amount || 0;
                            
                            // If final_price is set, use it, else calculate it
                            if (selectedBooking.final_price !== undefined) {
                              return selectedBooking.final_price.toLocaleString('vi-VN');
                            }
                            
                            const finalPrice = Math.max(0, base - Math.round(base * (discPct / 100)) - otherDisc);
                            return finalPrice.toLocaleString('vi-VN');
                          })()} đ
                        </Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                {/* Bottom Action inside modal */}
                <View style={styles.modalFooter}>
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={CYAN} style={{ alignSelf: 'center', padding: 12 }} />
                  ) : (
                    <>
                      {selectedBooking.booking_status === 'pending' && (
                        <Pressable style={styles.modalActionBtn} onPress={() => handleUpdateStatus(selectedBooking._id, 'confirm')}>
                          <Text style={styles.modalActionBtnText}>Xác nhận đơn hàng</Text>
                        </Pressable>
                      )}
                      {selectedBooking.booking_status === 'confirmed' && (
                        <Pressable style={[styles.modalActionBtn, { backgroundColor: PURPLE }]} onPress={() => handleUpdateStatus(selectedBooking._id, 'checkin')}>
                          <Text style={styles.modalActionBtnText}>Nhận xe (Check-in)</Text>
                        </Pressable>
                      )}
                      {selectedBooking.booking_status === 'checked_in' && (
                        <Pressable style={[styles.modalActionBtn, { backgroundColor: CYAN }]} onPress={() => handleUpdateStatus(selectedBooking._id, 'start')}>
                          <Text style={styles.modalActionBtnText}>Bắt đầu rửa xe</Text>
                        </Pressable>
                      )}
                      {selectedBooking.booking_status === 'in_progress' && (
                        <Pressable style={[styles.modalActionBtn, { backgroundColor: '#0D9488' }]} onPress={() => handleUpdateStatus(selectedBooking._id, 'washed')}>
                          <Text style={styles.modalActionBtnText}>Báo cáo Rửa xong</Text>
                        </Pressable>
                      )}
                      {(selectedBooking.booking_status as string) === 'washed' && (
                        <Pressable style={[styles.modalActionBtn, { backgroundColor: GREEN }]} onPress={() => handleUpdateStatus(selectedBooking._id, 'complete')}>
                          <Text style={styles.modalActionBtnText}>Hoàn thành & Thu tiền</Text>
                        </Pressable>
                      )}
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACE,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DARK,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: GRAY,
    marginTop: 2,
    fontWeight: '600',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(6,182,212,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: CYAN,
    borderColor: CYAN,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: GRAY,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    color: GRAY,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: GRAY,
    textAlign: 'center',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  bookingCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarLeft: {
    backgroundColor: 'rgba(6,182,212,0.08)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.15)',
  },
  calendarDay: {
    fontSize: 16,
    fontWeight: '800',
    color: CYAN,
  },
  calendarMonth: {
    fontSize: 9,
    fontWeight: '800',
    color: CYAN,
    textTransform: 'uppercase',
  },
  calendarRight: {
    marginLeft: 10,
  },
  calendarTime: {
    fontSize: 15,
    fontWeight: '700',
    color: DARK,
  },
  calendarYear: {
    fontSize: 11,
    color: GRAY,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    fontSize: 8,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BG,
  },
  cardDividerLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 0.5,
    borderColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  bookingDetails: {
    gap: 8,
  },
  idPlateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  bookingIdText: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
  },
  plateContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  plateInnerBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#94A3B8',
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  plateRegistrationDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
    marginRight: 4,
  },
  plateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  servicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  serviceChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  comboServiceChip: {
    backgroundColor: 'rgba(6,182,212,0.06)',
    borderColor: 'rgba(6,182,212,0.18)',
  },
  singleServiceChip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  serviceChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  comboServiceChipText: {
    color: CYAN,
  },
  singleServiceChipText: {
    color: GRAY,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 12,
    paddingTop: 12,
  },
  priceContainer: {
    flex: 1,
  },
  priceMetaLabel: {
    fontSize: 10,
    color: GRAY,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: ROSE,
  },
  actionsBox: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  modalContent: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DARK,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: GRAY,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  modalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalIdText: {
    fontSize: 14,
    fontWeight: '700',
    color: GRAY,
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: GRAY,
    fontWeight: '500',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  modalFooter: {
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    paddingTop: 16,
  },
  modalActionBtn: {
    width: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
