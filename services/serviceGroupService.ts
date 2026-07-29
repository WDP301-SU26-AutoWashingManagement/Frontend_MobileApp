import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from '../config/app.config';

export interface ServiceGroup {
  _id?: string;
  id?: string;
  group_name: string;
  group_description?: string;
  is_active: boolean;
}

class ServiceGroupService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.API_BASE_URL,
      timeout: API_CONFIG.API_TIMEOUT,
    });
  }

  async list(params = {}): Promise<ServiceGroup[]> {
    try {
      const response = await this.axiosInstance.get<{ success: boolean; data: ServiceGroup[] }>('/service-groups', {
        params
      });
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching service groups in Mobile:', error);
      throw error;
    }
  }
}

export default new ServiceGroupService();
