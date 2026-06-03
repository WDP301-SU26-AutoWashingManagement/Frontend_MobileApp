import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/app.config';

const API_BASE_URL = API_CONFIG.API_BASE_URL;
const API_TIMEOUT = API_CONFIG.API_TIMEOUT;

const ACCESS_TOKEN_KEY = '@auth_access_token';
const REFRESH_TOKEN_KEY = '@auth_refresh_token';

export interface Vehicle {
  _id: string;
  customer_id: string | any;
  vehicle_class_id: string | any;
  model_id: string | any;
  license_plate: string;
  vehicle_model: string;
  fuel_type: string;
  color: string;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleListResponse {
  success: boolean;
  message: string;
  data: Vehicle[];
  pagination: {
    totalDocs: number;
    limit: number;
    page: number;
    totalPages: number;
  };
}

interface ApiSuccessResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface UserProfileResponse {
  _id: string;
  role: 'customer' | 'admin' | 'staff' | 'manager';
  role_data: {
    _id: string;
  } | null;
}

export interface CreateVehicleRequest {
  customer_id: string;
  vehicle_class_id: string;
  model_id: string;
  license_plate: string;
  vehicle_model: string;
  fuel_type: string;
  color: string;
}

export interface UpdateVehicleRequest {
  vehicle_class_id?: string;
  model_id?: string;
  license_plate?: string;
  vehicle_model?: string;
  fuel_type?: string;
  color?: string;
}

class VehicleService {
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

  async getMyVehicles(page = 1, limit = 20) {
    const response = await this.axiosInstance.get<VehicleListResponse>('/vehicles', {
      params: { page, limit },
    });

    return {
      vehicles: response.data.data,
      pagination: response.data.pagination,
      message: response.data.message,
    };
  }

  async getCurrentCustomerId(): Promise<string> {
    const response = await this.axiosInstance.get<ApiSuccessResponse<UserProfileResponse>>('/profile');
    const profile = response.data.data;

    if (profile.role !== 'customer' || !profile.role_data?._id) {
      throw new Error('Tài khoản hiện tại không phải khách hàng');
    }

    return profile.role_data._id;
  }

  async getVehicleById(vehicleId: string) {
    const response = await this.axiosInstance.get<{ success: boolean; message: string; data: Vehicle }>(
      `/vehicles/${vehicleId}`
    );

    return response.data.data;
  }

  async createVehicle(request: CreateVehicleRequest) {
    const response = await this.axiosInstance.post<{ success: boolean; message: string; data: Vehicle }>(
      '/vehicles',
      request
    );

    return response.data.data;
  }

  async updateVehicle(vehicleId: string, request: UpdateVehicleRequest) {
    const response = await this.axiosInstance.put<{ success: boolean; message: string; data: Vehicle }>(
      `/vehicles/${vehicleId}`,
      request
    );

    return response.data.data;
  }

  async deleteVehicle(vehicleId: string): Promise<void> {
    await this.axiosInstance.delete(`/vehicles/${vehicleId}`);
  }

  async getVehicleClasses() {
    const response = await this.axiosInstance.get<{ success: boolean; data: { docs: any[] } | any[] }>('/vehicle-classes');
    // Handle both paginated and non-paginated responses just in case
    return Array.isArray(response.data.data) ? response.data.data : response.data.data?.docs || [];
  }

  async getVehicleModels() {
    const response = await this.axiosInstance.get<{ success: boolean; data: any[] }>('/vehicle-models');
    return response.data.data || [];
  }
}

export default new VehicleService();