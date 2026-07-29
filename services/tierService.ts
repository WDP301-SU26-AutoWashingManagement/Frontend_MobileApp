import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from '../config/app.config';
import authService from './authService';

export interface Tier {
  _id?: string;
  id?: string;
  tier_name: string;
  min_membership_points: number;
  discount_percentage: number;
  free_features: string[];
  booking_window_days: number;
}

class TierService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.API_BASE_URL,
      timeout: API_CONFIG.API_TIMEOUT,
    });
  }

  async list(): Promise<Tier[]> {
    try {
      const response = await this.axiosInstance.get<{ success: boolean; data: Tier[] }>('/tiers', {
        params: { limit: 100 }
      });
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching tiers in Mobile:', error);
      throw error;
    }
  }
}

export default new TierService();
