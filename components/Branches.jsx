import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import branchService from '../services/branchService';

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBranches() {
      try {
        const data = await branchService.list();
        setBranches(data);
      } catch (error) {
        console.error('Lỗi khi tải danh sách chi nhánh trong component:', error);
      } finally {
        setLoading(false);
      }
    }
    loadBranches();
  }, []);

  const handleDirections = async (branch) => {
    const lat = branch.geo?.latitude;
    const lng = branch.geo?.longitude;
    if (lat && lng) {
      const label = encodeURIComponent(branch.branch_address?.street || 'AutoWash');
      
      // Platform-specific map URI schemes
      const scheme = Platform.select({
        ios: `maps://app?daddr=${lat},${lng}&q=${label}`,
        android: `geo:0,0?q=${lat},${lng}(${label})`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      });

      const fallbackWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      if (Platform.OS === 'web') {
        window.open(fallbackWebUrl, '_blank');
        return;
      }

      try {
        const supported = await Linking.canOpenURL(scheme);
        if (supported) {
          await Linking.openURL(scheme);
        } else {
          // Fallback to standard HTTP Google Maps link
          await Linking.openURL(fallbackWebUrl);
        }
      } catch (err) {
        console.warn('Không thể mở ứng dụng bản đồ native, thử mở trình duyệt...', err);
        Linking.openURL(fallbackWebUrl).catch((webErr) => {
          console.error('Không thể mở liên kết bản đồ:', webErr);
        });
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5B7" />
        <Text style={styles.loadingText}>Đang tải danh sách chi nhánh...</Text>
      </View>
    );
  }

  if (branches.length === 0) return null;

  return (
    <View style={styles.section} id="locations">
      <View style={styles.header}>
        <Text style={styles.label}>Hệ thống</Text>
        <Text style={styles.title}>Hệ thống chi nhánh AutoWash</Text>
        <Text style={styles.subTitle}>
          Với mạng lưới chi nhánh rộng khắp, AutoWash luôn sẵn sàng phục vụ và chăm sóc xế yêu của bạn một cách nhanh chóng và chuyên nghiệp nhất.
        </Text>
      </View>

      <View style={styles.list}>
        {branches.map((branch) => {
          const id = branch._id || branch.id;
          const address = branch.branch_address;
          const hasGeo = branch.geo?.latitude && branch.geo?.longitude;
          const mapSrc = hasGeo
            ? `https://maps.google.com/maps?q=${branch.geo?.latitude},${branch.geo?.longitude}&hl=vi&z=15&output=embed`
            : '';

          return (
            <View key={id} style={styles.card}>
              {/* Map Container */}
              <View style={styles.mapContainer}>
                {Platform.OS === 'web' && hasGeo ? (
                  <iframe
                    src={mapSrc}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    title={`Bản đồ chi nhánh ${address?.street}`}
                  />
                ) : (
                  <View style={styles.nativeMapPlaceholder}>
                    <View style={styles.radarCircle}>
                      <MaterialCommunityIcons name="map-marker-radius" size={42} color="#0EA5B7" />
                    </View>
                    <Text style={styles.nativeMapText}>
                      {address?.street || 'Xem vị trí chi nhánh'}
                    </Text>
                    <Text style={styles.nativeMapSubtext}>
                      Chạm vào "Chỉ đường tới đây" để mở bản đồ
                    </Text>
                  </View>
                )}
              </View>

              {/* Branch Information */}
              <View style={[styles.cardContent, branch.is_active === false && styles.cardContentInactive]}>
                {branch.is_active === false && (
                  <View style={styles.inactiveBadge}>
                    <MaterialCommunityIcons name="clock-alert-outline" size={14} color="#EF4444" />
                    <Text style={styles.inactiveBadgeText}>Tạm đóng</Text>
                  </View>
                )}

                <View style={styles.addressRow}>
                  <MaterialCommunityIcons name="map-marker" size={20} color="#0EA5B7" style={styles.addressIcon} />
                  <Text style={styles.addressText}>
                    {address?.street}, {address?.ward}, {address?.district}, {address?.city}
                  </Text>
                </View>

                <View style={styles.details}>
                  {branch.branch_phone && (
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="phone" size={16} color="#94A3B8" />
                      <Text style={styles.detailText}>{branch.branch_phone}</Text>
                    </View>
                  )}

                  <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color="#94A3B8" style={{ marginTop: 2 }} />
                    <View style={styles.timeWrap}>
                      <Text style={styles.detailText}>
                        T2 - T6: {branch.operating_time?.default_open} - {branch.operating_time?.default_close}
                      </Text>
                      <Text style={[styles.detailText, styles.weekendText]}>
                        T7 - CN: {branch.operating_time?.weekend_open || '08:00'} - {branch.operating_time?.weekend_close || '18:00'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="car" size={16} color="#94A3B8" />
                    <Text style={styles.detailText}>
                      {branch.bay_counts || 2} làn phục vụ cùng lúc
                    </Text>
                  </View>
                </View>

                {hasGeo && (
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => handleDirections(branch)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.buttonText}>Chỉ đường tới đây</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: '#F8FAFC',
    gap: 16,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: '#0EA5B7',
    textTransform: 'uppercase',
  },
  title: {
    color: '#0F172A',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  subTitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 320,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
  },
  list: {
    gap: 20,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 183, 0.12)',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  mapContainer: {
    height: 180,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    position: 'relative',
  },
  nativeMapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#E2E8F0',
  },
  radarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DDF8FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  nativeMapText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  nativeMapSubtext: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
  },
  cardContent: {
    padding: 20,
    gap: 16,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressIcon: {
    marginTop: 2,
  },
  addressText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    flex: 1,
  },
  details: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeWrap: {
    flex: 1,
  },
  detailText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  weekendText: {
    color: '#64748B',
    marginTop: 2,
  },
  button: {
    backgroundColor: '#ECFEFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 183, 0.1)',
  },
  buttonText: {
    color: '#0EA5B7',
    fontSize: 14,
    fontWeight: '700',
  },
  cardContentInactive: {
    opacity: 0.8,
  },
  inactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  inactiveBadgeText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
});
