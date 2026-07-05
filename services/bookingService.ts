import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/app.config';

const API_BASE_URL = API_CONFIG.API_BASE_URL;
const API_TIMEOUT = API_CONFIG.API_TIMEOUT;

const ACCESS_TOKEN_KEY = '@auth_access_token';
const REFRESH_TOKEN_KEY = '@auth_refresh_token';

export interface Booking {
  _id: string;
  id?: string;
  customer_id?: any;
  appointment_code: string;
  booking_status: 'pending' | 'confirmed' | 'checked_in' | 'in_progress' | 'washed' | 'completed' | 'cancelled';
  booking_source: 'app' | 'web' | 'walk_in';
  scheduled_at: string;
  checkedin_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  branch?: {
    _id: string;
    branch_phone?: string;
    branch_address?: {
      street: string;
      ward: string;
      district: string;
      city: string;
    };
  };
  branch_id?: {
    _id: string;
    branch_phone?: string;
    branch_address?: {
      street: string;
      ward: string;
      district: string;
      city: string;
    };
  };
  vehicle?: {
    _id: string;
    license_plate: string;
    vehicle_model: string;
    color?: string;
    plate_number?: string;
  };
  vehicle_id?: {
    _id: string;
    license_plate: string;
    vehicle_model: string;
    color?: string;
    plate_number?: string;
  };
  services: Array<{
    _id: string;
    price_snapshot: number;
    duration_snapshot: number;
    service?: {
      _id: string;
      service_name: string;
      service_price: number;
      duration_minutes: number;
    };
    service_id?: {
      _id: string;
      service_name: string;
      service_price: number;
      duration_minutes: number;
    };
    service_package?: {
      _id: string;
      package_name: string;
      package_discount_percentage: number;
      service_name?: string;
      name?: string;
    } | null;
    service_package_id?: {
      _id: string;
      package_name: string;
      package_discount_percentage: number;
      service_name?: string;
      name?: string;
    } | null;
  }>;
  vat_requested?: boolean;
  tax_code?: string;
  base_price?: number;
  final_price?: number;
  discount_amount?: number;
  applied_tier_discount?: number;
  applied_promotion_discount?: number;
}

export interface CreateBookingPayload {
  branch_id: string;
  vehicle_id: string;
  scheduled_at: string; // ISO String
  services: Array<{
    service_id: string;
    service_package_id?: string;
  }>;
  booking_source?: string;
  promotion_id?: string;
  vat_requested?: boolean;
  tax_code?: string;
}

class BookingService {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (err: unknown) => void;
  }> = [];

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.axiosInstance(originalRequest);
              })
              .catch(() => Promise.reject(error));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await this.getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await this.axiosInstance.post('/auth/refresh', { refreshToken });
            const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;

            await this.saveTokens({ accessToken, refreshToken: newRefreshToken });
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            this.processQueue(null, accessToken);
            return this.axiosInstance(originalRequest);
          } catch (err) {
            this.processQueue(err, null);
            return Promise.reject(err);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  }

  private async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private async saveTokens(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY, tokens.accessToken],
      [REFRESH_TOKEN_KEY, tokens.refreshToken],
    ]);
  }

  private processQueue(error: unknown, token: string | null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token!);
      }
    });
    this.failedQueue = [];
  }

  async list(params: { booking_status?: string; page?: number; limit?: number } = {}): Promise<Booking[]> {
    try {
      const response = await this.axiosInstance.get<{ success: boolean; data: any }>(
        '/bookings',
        { params }
      );
      const data = response.data.data;
      return Array.isArray(data) ? data : data?.docs || [];
    } catch (error) {
      console.error('Error fetching bookings in Mobile:', error);
      throw error;
    }
  }

  async create(payload: CreateBookingPayload): Promise<Booking> {
    try {
      const response = await this.axiosInstance.post<{ success: boolean; data: Booking }>(
        '/bookings',
        payload
      );
      return response.data.data;
    } catch (error) {
      console.error('Error creating booking in Mobile:', error);
      throw error;
    }
  }

  async cancel(bookingId: string, reason: string): Promise<Booking> {
    try {
      const response = await this.axiosInstance.patch<{ success: boolean; data: Booking }>(
        `/bookings/${bookingId}/cancel`,
        { cancellation_reason: reason }
      );
      return response.data.data;
    } catch (error) {
      console.error(`Error cancelling booking ${bookingId} in Mobile:`, error);
      throw error;
    }
  }

  async confirm(bookingId: string): Promise<Booking> {
    try {
      const response = await this.axiosInstance.patch<{ success: boolean; data: Booking }>(
        `/bookings/${bookingId}/confirm`
      );
      return response.data.data;
    } catch (error) {
      console.error(`Error confirming booking ${bookingId} in Mobile:`, error);
      throw error;
    }
  }

  async checkin(bookingId: string): Promise<Booking> {
    try {
      const response = await this.axiosInstance.patch<{ success: boolean; data: Booking }>(
        `/bookings/${bookingId}/checkin`
      );
      return response.data.data;
    } catch (error) {
      console.error(`Error checkin booking ${bookingId} in Mobile:`, error);
      throw error;
    }
  }

  async start(bookingId: string): Promise<Booking> {
    try {
      const response = await this.axiosInstance.patch<{ success: boolean; data: Booking }>(
        `/bookings/${bookingId}/start`
      );
      return response.data.data;
    } catch (error) {
      console.error(`Error starting booking ${bookingId} in Mobile:`, error);
      throw error;
    }
  }

  async washed(bookingId: string): Promise<Booking> {
    try {
      const response = await this.axiosInstance.patch<{ success: boolean; data: Booking }>(
        `/bookings/${bookingId}/washed`
      );
      return response.data.data;
    } catch (error) {
      console.error(`Error washed booking ${bookingId} in Mobile:`, error);
      throw error;
    }
  }

  async complete(bookingId: string): Promise<Booking> {
    try {
      const response = await this.axiosInstance.patch<{ success: boolean; data: Booking }>(
        `/bookings/${bookingId}/complete`
      );
      return response.data.data;
    } catch (error) {
      console.error(`Error completing booking ${bookingId} in Mobile:`, error);
      throw error;
    }
  }

  async checkinWithCamera(fileUri: string, mimeType: string, fileName: string): Promise<{
    success: boolean;
    message: string;
    appointment_id?: string;
    license_plate?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: mimeType || 'image/jpeg',
        name: fileName || 'photo.jpg',
      } as any);

      const response = await this.axiosInstance.post<any>(
        '/checkin/camera',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error checkinWithCamera in Mobile:', error);
      throw error;
    }
  }

  async getRecommendation(vehicleId: string, branchId?: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get<{ success: boolean; data: any }>(
        '/bookings/recommendation',
        {
          params: { vehicle_id: vehicleId, ...(branchId ? { branch_id: branchId } : {}) },
        }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error getting recommendation in Mobile:', error);
      throw error;
    }
  }

  async getChecklist(appointmentId: string): Promise<any | null> {
    try {
      const response = await this.axiosInstance.get<{ success: boolean; data: any }>(
        `/booking-checklists/appointment/${appointmentId}`
      );
      return response.data?.data || response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error(`Error fetching checklist for booking ${appointmentId} in Mobile:`, error);
      throw error;
    }
  }

  getChecklistPdfUrl(checklistId: string): string {
    return `${API_BASE_URL}/booking-checklists/${checklistId}/export-pdf`;
  }

  async createChecklist(appointmentId: string, items: any[], note: string, images: string[], signatureUri: string | null): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('appointment_id', appointmentId);
      formData.append('checklist_items', JSON.stringify(items));
      if (note.trim()) {
        formData.append('note', note.trim());
      }

      images.forEach((uri, index) => {
        const uriParts = uri.split('.');
        const fileExt = uriParts[uriParts.length - 1] || 'jpg';
        const mimeType = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : `image/${fileExt}`;
        formData.append('images', {
          uri,
          type: mimeType,
          name: `image_${index}.${fileExt}`
        } as any);
      });

      if (signatureUri) {
        formData.append('customer_signature', signatureUri);
      }

      const response = await this.axiosInstance.post<{ success: boolean; data: any }>(
        '/booking-checklists',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating checklist in Mobile:', error);
      throw error;
    }
  }
}

export default new BookingService();
