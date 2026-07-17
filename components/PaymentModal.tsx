import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ActivityIndicator, Image, Alert, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { invoiceService } from '../services/invoiceService';
import { Booking } from '../services/bookingService';
import { useAuth } from '../hooks/useAuthService';
import promotionService, { Promotion } from '../services/promotionService';
import { parseVietQR } from '../utils/vietqr';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, booking, onSuccess }: PaymentModalProps) {
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'qr' | 'cash' | null>(null);
  const pollingRef = useRef<number | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  const [step, setStep] = useState<1 | 2>(1);
  const [promotions, setPromotions] = useState<(Promotion & { calculatedDiscount: number })[]>([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  const [bankInfo, setBankInfo] = useState<{ accountName: string, accountNumber: string, bankName: string, addInfo?: string } | null>(null);

  useEffect(() => {
    if (paymentMode === 'qr' && invoice?.qr_code) {
      const parsed = parseVietQR(invoice.qr_code);
      if (parsed) {
        fetch('https://api.vietqr.io/v2/banks')
          .then(r => r.json())
          .then(data => {
            const bank = data.data?.find((b: any) => b.bin === parsed.bin);
            setBankInfo({
              accountName: parsed.accountName,
              accountNumber: parsed.accountNumber,
              bankName: bank ? bank.shortName : parsed.bin,
              addInfo: parsed.addInfo
            });
          })
          .catch(() => {
            setBankInfo({
              accountName: parsed.accountName,
              accountNumber: parsed.accountNumber,
              bankName: parsed.bin,
              addInfo: parsed.addInfo
            });
          });
      }
    } else {
      setBankInfo(null);
    }
  }, [paymentMode, invoice?.qr_code]);

  useEffect(() => {
    if (isOpen && booking && !invoice) {
      setLoadingPromotions(true);
      promotionService.list({ is_active: true })
        .then(list => {
          const tierDiscountPct = (booking as any).customer_id?.tier_id?.discount_percentage || (booking as any).customer?.tier_id?.discount_percentage || 0;
          const basePrice = booking.base_price ?? booking.final_price ?? 0;
          const tierDiscountAmount = Math.round(basePrice * (tierDiscountPct / 100));
          const priceAfterTier = Math.max(0, basePrice - tierDiscountAmount);

          const withDiscounts = list.map((p) => {
            let discount = 0;
            if ((p as any).type !== 'bonus_service') {
               if (priceAfterTier >= (p.min_order_amount || 0)) {
                 if (p.discount_type === 'percentage') {
                   const raw = priceAfterTier * (p.discount_value / 100);
                   discount = Math.min(raw, p.max_discount_amount || Infinity);
                 } else {
                   discount = Math.min(priceAfterTier, p.discount_value);
                 }
               }
            }
            return { ...p, calculatedDiscount: Math.round(discount) };
          }).filter(p => p.calculatedDiscount > 0 || (p as any).type === 'bonus_service');

          withDiscounts.sort((a, b) => b.calculatedDiscount - a.calculatedDiscount);
          setPromotions(withDiscounts);

          if (withDiscounts.length > 0) {
             setSelectedPromotionId(withDiscounts[0]._id || withDiscounts[0].id!);
          }
        })
        .catch(err => console.error('Failed to load promotions', err))
        .finally(() => setLoadingPromotions(false));
    }

    if (!isOpen) {
      stopPolling();
      setInvoice(null);
      setPaymentMode(null);
      setIsCreatingInvoice(false);
      setStep(1);
      setPromotions([]);
      setSelectedPromotionId(null);
    }
  }, [isOpen, booking, invoice]);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleNextStep = () => {
    setStep(2);
  };

  const ensureInvoice = async () => {
    if (invoice) return invoice;
    if (!booking) throw new Error('Booking data is missing');
    const inv = await invoiceService.createInvoice(booking._id || booking.id!, {
      promotion_id: selectedPromotionId || undefined
    });
    const invData = inv.data || inv;
    setInvoice(invData);
    return invData;
  };

  const handleConfirmCash = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const currentInvoice = await ensureInvoice();
      await invoiceService.confirmCash(currentInvoice._id || currentInvoice.id, (user as any).id || (user as any)._id);
      Alert.alert('Thành công', 'Thanh toán tiền mặt thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message;
      if (errorMsg?.toLowerCase().includes('tồn tại')) {
         Alert.alert('Lỗi', 'Đơn này đã tạo Hóa đơn trước đó. Vui lòng liên hệ Admin để xử lý.');
      } else {
         Alert.alert('Lỗi', errorMsg || 'Lỗi khi xác nhận tiền mặt');
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQR = async () => {
    setLoading(true);
    try {
      const currentInvoice = await ensureInvoice();
      const inv = await invoiceService.createPaymentLink(currentInvoice._id || currentInvoice.id);
      setInvoice(inv.data || inv);
      setPaymentMode('qr');
      
      pollingRef.current = window.setInterval(async () => {
        try {
          const synced = await invoiceService.syncPaymentStatus(currentInvoice._id || currentInvoice.id);
          if (synced?.data?.invoice_status === 'paid' || synced?.invoice_status === 'paid') {
            stopPolling();
            Alert.alert('Thành công', 'Thanh toán thành công!');
            onSuccess();
            onClose();
          }
        } catch (e) {
          // ignore polling errors
        }
      }, 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message;
      if (errorMsg?.toLowerCase().includes('tồn tại')) {
         Alert.alert('Lỗi', 'Đơn này đã tạo Hóa đơn trước đó. Vui lòng liên hệ Admin để xử lý.');
         onClose();
      } else {
         Alert.alert('Lỗi', errorMsg || 'Lỗi khi tạo mã QR PayOS');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelQR = async () => {
    if (!invoice) return;
    stopPolling();
    setLoading(true);
    try {
      const inv = await invoiceService.cancelPaymentLink(invoice._id || invoice.id, 'Khách đổi ý trên app');
      setInvoice(inv.data || inv);
      setPaymentMode(null);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Lỗi khi huỷ QR');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !booking) return null;

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={24} color="#64748B" />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            {step === 2 && !paymentMode && (
              <Pressable onPress={() => { setStep(1); setInvoice(null); }} style={{ padding: 8, marginRight: 8, marginLeft: -8 }}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#64748B" />
              </Pressable>
            )}
            <Text style={[styles.title, { marginBottom: 0, flex: 1, textAlign: step === 2 && !paymentMode ? 'left' : 'center' }]}>
              Thanh toán dịch vụ
            </Text>
          </View>
          {step === 1 ? (
            <View style={styles.stepContainer}>
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Xe:</Text>
                  <Text style={styles.summaryVal}>{booking.vehicle?.license_plate || booking.vehicle_id?.license_plate || 'N/A'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tổng phí dịch vụ:</Text>
                  <Text style={styles.summaryVal}>{(booking.base_price ?? booking.final_price ?? 0).toLocaleString('vi-VN')} đ</Text>
                </View>

                {(() => {
                   const tierDiscountPct = (booking as any).customer_id?.tier_id?.discount_percentage || (booking as any).customer?.tier_id?.discount_percentage || 0;
                   if (tierDiscountPct > 0) {
                     const tierDiscountAmount = Math.round((booking.base_price ?? booking.final_price ?? 0) * (tierDiscountPct / 100));
                     return (
                       <View style={styles.summaryRow}>
                         <Text style={[styles.summaryLabel, { color: '#10B981' }]}>Ưu đãi hạng ({tierDiscountPct}%):</Text>
                         <Text style={[styles.summaryVal, { color: '#10B981' }]}>-{tierDiscountAmount.toLocaleString('vi-VN')} đ</Text>
                       </View>
                     );
                   }
                   return null;
                })()}

                {promotions.length > 0 && (
                  <View style={{ width: '100%', marginTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8 }}>
                    <Text style={[styles.summaryLabel, { marginBottom: 6, fontWeight: '600', color: '#334155' }]}>Khuyến mãi khả dụng:</Text>
                    {promotions.map(promo => {
                      const isSelected = selectedPromotionId === (promo._id || promo.id);
                      return (
                        <Pressable 
                          key={promo._id || promo.id} 
                          style={[styles.promoItem, isSelected && styles.promoItemSelected]}
                          onPress={() => setSelectedPromotionId(isSelected ? null : (promo._id || promo.id!))}
                        >
                          <MaterialCommunityIcons 
                            name={isSelected ? "check-circle" : "circle-outline"} 
                            size={20} 
                            color={isSelected ? "#06B6D4" : "#CBD5E1"} 
                          />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={[styles.promoName, isSelected && { color: '#06B6D4' }]}>{promo.promotion_code}</Text>
                            {promo.calculatedDiscount > 0 && (
                              <Text style={styles.promoDiscountText}>Giảm {promo.calculatedDiscount.toLocaleString('vi-VN')} đ</Text>
                            )}
                          </View>
                        </Pressable>
                      )
                    })}
                  </View>
                )}

                <View style={[styles.summaryRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12 }]}>
                  <Text style={[styles.summaryLabel, { fontWeight: '700', color: '#0F172A' }]}>Tổng thanh toán:</Text>
                  <Text style={styles.summaryTotal}>
                    {(() => {
                       const basePrice = booking.base_price ?? booking.final_price ?? 0;
                       const tierDiscountPct = (booking as any).customer_id?.tier_id?.discount_percentage || (booking as any).customer?.tier_id?.discount_percentage || 0;
                       const tierDiscountAmount = Math.round(basePrice * (tierDiscountPct / 100));
                       const selectedPromo = promotions.find(p => (p._id || p.id) === selectedPromotionId);
                       const promoDiscount = selectedPromo ? selectedPromo.calculatedDiscount : 0;
                       return Math.max(0, basePrice - tierDiscountAmount - promoDiscount).toLocaleString('vi-VN');
                    })()} đ
                  </Text>
                </View>
              </View>

              <Pressable 
                style={styles.btnPrimary}
                onPress={handleNextStep}
              >
                <Text style={styles.btnPrimaryText}>Tiếp tục thanh toán</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.stepContainer}>
               <View style={styles.summaryBox}>
                 <View style={styles.summaryRow}>
                   <Text style={styles.summaryLabel}>Tổng phí dịch vụ:</Text>
                   <Text style={styles.summaryVal}>{(booking.base_price ?? booking.final_price ?? 0).toLocaleString('vi-VN')} đ</Text>
                 </View>

                 {(() => {
                    const tierDiscountPct = (booking as any).customer_id?.tier_id?.discount_percentage || (booking as any).customer?.tier_id?.discount_percentage || 0;
                    if (tierDiscountPct > 0) {
                      const tierDiscountAmount = Math.round((booking.base_price ?? booking.final_price ?? 0) * (tierDiscountPct / 100));
                      return (
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: '#10B981' }]}>Ưu đãi hạng ({tierDiscountPct}%):</Text>
                          <Text style={[styles.summaryVal, { color: '#10B981' }]}>-{tierDiscountAmount.toLocaleString('vi-VN')} đ</Text>
                        </View>
                      );
                    }
                    return null;
                 })()}

                 {(() => {
                    let pDiscountAmount = 0;
                    if (invoice) {
                      const tierDiscountPct = (booking as any).customer_id?.tier_id?.discount_percentage || (booking as any).customer?.tier_id?.discount_percentage || 0;
                      const tierDiscountAmount = Math.round((booking.base_price ?? booking.final_price ?? 0) * (tierDiscountPct / 100));
                      pDiscountAmount = invoice.discount_amount - tierDiscountAmount;
                    } else if (selectedPromotionId) {
                      const selectedPromo = promotions.find(p => (p._id || p.id) === selectedPromotionId);
                      pDiscountAmount = selectedPromo ? selectedPromo.calculatedDiscount : 0;
                    }
                    
                    if (pDiscountAmount > 0) {
                      return (
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: '#06B6D4' }]}>Khuyến mãi:</Text>
                          <Text style={[styles.summaryVal, { color: '#06B6D4' }]}>-{pDiscountAmount.toLocaleString('vi-VN')} đ</Text>
                        </View>
                      );
                    }
                    return null;
                 })()}

                 <View style={[styles.summaryRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12 }]}>
                   <Text style={[styles.summaryLabel, { fontWeight: '700', color: '#0F172A' }]}>Tổng thanh toán:</Text>
                   <Text style={styles.summaryTotal}>
                     {(() => {
                       if (invoice && invoice.total !== undefined) return invoice.total.toLocaleString('vi-VN');
                       const basePrice = booking.base_price ?? booking.final_price ?? 0;
                       const tierDiscountPct = (booking as any).customer_id?.tier_id?.discount_percentage || (booking as any).customer?.tier_id?.discount_percentage || 0;
                       const tierDiscountAmount = Math.round(basePrice * (tierDiscountPct / 100));
                       const selectedPromo = promotions.find(p => (p._id || p.id) === selectedPromotionId);
                       const promoDiscount = selectedPromo ? selectedPromo.calculatedDiscount : 0;
                       return Math.max(0, basePrice - tierDiscountAmount - promoDiscount).toLocaleString('vi-VN');
                     })()} đ
                   </Text>
                 </View>
               </View>

              {!paymentMode ? (
                <View style={styles.paymentOptions}>
                  <Pressable 
                    style={[styles.btnOption, styles.btnCash]}
                    onPress={handleConfirmCash}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="#10B981" /> : (
                      <>
                        <MaterialCommunityIcons name="cash" size={24} color="#10B981" />
                        <Text style={styles.btnCashText}>Tiền mặt</Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable 
                    style={[styles.btnOption, styles.btnQR]}
                    onPress={handleCreateQR}
                    disabled={loading}
                  >
                     {loading ? <ActivityIndicator color="#06B6D4" /> : (
                       <>
                         <MaterialCommunityIcons name="qrcode-scan" size={24} color="#06B6D4" />
                         <Text style={styles.btnQRText}>Chuyển khoản (QR)</Text>
                       </>
                     )}
                  </Pressable>
                </View>
              ) : paymentMode === 'qr' && invoice && (
                <View style={styles.qrContainerFull}>
                  <View style={styles.qrInstructionHeader}>
                     <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color="#475569" style={{ marginRight: 8 }} />
                     <Text style={styles.qrInstructionText}>
                        Mở App Ngân hàng bất kỳ để <Text style={{ fontWeight: '700', color: '#0F172A' }}>quét mã VietQR</Text> hoặc <Text style={{ fontWeight: '700', color: '#0F172A' }}>chuyển khoản</Text> chính xác số tiền, nội dung bên dưới
                     </Text>
                  </View>
                  <View style={styles.qrDetailsWrapper}>
                     <View style={styles.qrLeftCol}>
                        <View style={styles.qrLogoHeader}>
                           <Text style={{ color: '#E11D48', fontWeight: '900', fontSize: 18 }}>Viet</Text>
                           <Text style={{ color: '#1E40AF', fontWeight: '900', fontSize: 18 }}>QR</Text>
                           <View style={{ backgroundColor: '#FBBF24', borderRadius: 4, paddingHorizontal: 4, marginLeft: 4 }}>
                              <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 10 }}>PRO</Text>
                           </View>
                        </View>
                        <View style={styles.qrImageBorder}>
                           {invoice.qr_code && invoice.qr_code.startsWith('data:image') ? (
                             <Image source={{ uri: invoice.qr_code }} style={styles.qrImage} />
                           ) : invoice.qr_code ? (
                              <Image source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(invoice.qr_code)}` }} style={styles.qrImage} />
                           ) : (
                             <View style={[styles.qrImage, { justifyContent: 'center', alignItems: 'center' }]}>
                               <ActivityIndicator size="large" color="#06B6D4" />
                             </View>
                           )}
                        </View>
                        <View style={styles.qrBankLabel}>
                           <Text style={{ color: '#1E40AF', fontStyle: 'italic', fontSize: 12, fontWeight: '600' }}>napas 247</Text>
                           <View style={{ width: 1, height: 12, backgroundColor: '#CBD5E1', marginHorizontal: 8 }} />
                           <Text style={{ color: '#2563EB', fontSize: 12, fontWeight: '600' }}>{bankInfo?.bankName || 'BANK'}</Text>
                        </View>
                     </View>

                     <View style={styles.qrRightCol}>
                        {bankInfo ? (
                           <>
                              <View style={styles.qrDetailRowTop}>
                                 <View style={styles.qrBankAvatar}>
                                    <Text style={styles.qrBankAvatarText}>{bankInfo.bankName.substring(0, 3)}</Text>
                                 </View>
                                 <View>
                                    <Text style={styles.qrDetailLabel}>Ngân hàng</Text>
                                    <Text style={styles.qrBankNameText}>{bankInfo.bankName}</Text>
                                 </View>
                              </View>

                              <View style={styles.qrDetailRow}>
                                 <Text style={styles.qrDetailLabel}>Chủ tài khoản:</Text>
                                 <Text style={styles.qrDetailValUpper}>{bankInfo.accountName || 'KHUU TRONG QUAN'}</Text>
                              </View>

                              <View style={styles.qrDetailRow}>
                                 <Text style={styles.qrDetailLabel}>Số tài khoản:</Text>
                                 <View style={styles.qrValWithCopy}>
                                    <Text style={styles.qrDetailVal}>{bankInfo.accountNumber}</Text>
                                    <Pressable style={styles.qrCopyBtn} onPress={() => { Clipboard.setStringAsync(bankInfo.accountNumber); Alert.alert('Đã copy', 'Số tài khoản đã được copy') }}>
                                       <Text style={styles.qrCopyBtnText}>Sao chép</Text>
                                    </Pressable>
                                 </View>
                              </View>

                              <View style={styles.qrDetailRow}>
                                 <Text style={styles.qrDetailLabel}>Số tiền:</Text>
                                 <View style={styles.qrValWithCopy}>
                                    <Text style={styles.qrDetailVal}>{(invoice.total || 0).toLocaleString('vi-VN')} vnd</Text>
                                    <Pressable style={styles.qrCopyBtn} onPress={() => { Clipboard.setStringAsync((invoice.total || 0).toString()); Alert.alert('Đã copy', 'Số tiền đã được copy') }}>
                                       <Text style={styles.qrCopyBtnText}>Sao chép</Text>
                                    </Pressable>
                                 </View>
                              </View>

                              <View style={styles.qrDetailRow}>
                                 <Text style={styles.qrDetailLabel}>Nội dung:</Text>
                                 <View style={styles.qrValWithCopy}>
                                    <Text style={styles.qrDetailVal}>{bankInfo.addInfo || invoice.order_code}</Text>
                                    <Pressable style={styles.qrCopyBtn} onPress={() => { Clipboard.setStringAsync((bankInfo.addInfo || invoice.order_code)?.toString() || ''); Alert.alert('Đã copy', 'Nội dung chuyển khoản đã được copy') }}>
                                       <Text style={styles.qrCopyBtnText}>Sao chép</Text>
                                    </Pressable>
                                 </View>
                              </View>
                           </>
                        ) : (
                           <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                              <ActivityIndicator size="small" color="#CBD5E1" />
                              <Text style={{ color: '#64748B', fontSize: 12, marginTop: 8 }}>Đang giải mã thông tin...</Text>
                           </View>
                        )}
                     </View>
                  </View>

                  <View style={styles.qrNoteBox}>
                     <Text style={styles.qrNoteBoxText}>
                        Lưu ý: Nhập chính xác số tiền <Text style={{ fontWeight: '700', color: '#0F172A' }}>{(invoice.total || 0).toLocaleString('vi-VN')}</Text>, nội dung <Text style={{ fontWeight: '700', color: '#0F172A' }}>{bankInfo?.addInfo || invoice.order_code}</Text> khi chuyển khoản
                     </Text>
                  </View>

                  <View style={{ padding: 16 }}>
                     <Pressable style={styles.btnOutline} onPress={handleCancelQR}>
                       {loading ? <ActivityIndicator color="#EF4444" /> : <Text style={styles.btnOutlineText}>Huỷ mã QR này</Text>}
                     </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: 20,
    padding: 24,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
    textAlign: 'center'
  },
  stepContainer: {
    gap: 16
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    alignItems: 'center'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 4
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748B'
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155'
  },
  promoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
    marginBottom: 6
  },
  promoItemSelected: {
    borderColor: '#06B6D4',
    backgroundColor: '#F0FDFA'
  },
  promoName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155'
  },
  promoDiscountText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginTop: 2
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#EF4444'
  },
  btnPrimary: {
    backgroundColor: '#06B6D4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  btnPrimaryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  btnDisabled: {
    opacity: 0.6
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 12
  },
  btnOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    gap: 8
  },
  btnCash: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981'
  },
  btnCashText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700'
  },
  btnQR: {
    backgroundColor: '#ECFEFF',
    borderColor: '#06B6D4'
  },
  btnQRText: {
    color: '#06B6D4',
    fontSize: 14,
    fontWeight: '700'
  },
  qrContainerFull: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  qrInstructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  qrInstructionText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  qrDetailsWrapper: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  qrLeftCol: {
    alignItems: 'center',
    gap: 8,
    width: 140,
  },
  qrLogoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrImageBorder: {
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  qrImage: {
    width: 130,
    height: 130,
    borderRadius: 8,
  },
  qrBankLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrRightCol: {
    flex: 1,
    gap: 6,
  },
  qrDetailRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  qrBankAvatar: {
    width: 32,
    height: 32,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  qrBankAvatarText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 10,
  },
  qrDetailLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  qrBankNameText: {
    fontWeight: '700',
    color: '#1E293B',
    fontSize: 12,
  },
  qrDetailRow: {
    marginBottom: 4,
  },
  qrDetailValUpper: {
    fontWeight: '700',
    color: '#1E293B',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  qrValWithCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qrDetailVal: {
    fontWeight: '700',
    color: '#1E293B',
    fontSize: 13,
    flex: 1,
  },
  qrCopyBtn: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 4,
  },
  qrCopyBtnText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '600',
  },
  qrNoteBox: {
    backgroundColor: '#FFF7ED',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  qrNoteBoxText: {
    fontSize: 11,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 16,
  },
  btnOutline: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  btnOutlineText: {
    color: '#EF4444',
    fontWeight: '600'
  }
});
