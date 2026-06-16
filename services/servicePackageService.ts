import axios from 'axios';
import { API_CONFIG } from '../config/app.config';

const API_BASE_URL = API_CONFIG.API_BASE_URL;

export interface ServicePackage {
  _id?: string;
  id?: string;
  service_group_id: string;
  package_name: string;
  package_code?: string;
  description: string;
  package_discount_percentage: number;
  is_active: boolean;
}

class ServicePackageService {
  async list(params: { is_active?: boolean; limit?: number } = {}): Promise<ServicePackage[]> {
    try {
      const response = await axios.get<{ success: boolean; data: any }>(
        `${API_BASE_URL}/service-packages`,
        {
          params,
          timeout: API_CONFIG.API_TIMEOUT,
        }
      );
      
      const data = response.data?.data;
      const docs = Array.isArray(data) ? data : (data?.docs || []);
      return docs;
    } catch (error) {
      console.error('Error fetching service packages in Mobile:', error);
      throw error;
    }
  }

  async listDetailedServicesByPackage(id: string): Promise<any[]> {
    try {
      const response = await axios.get<{ success: boolean; data: any[] }>(
        `${API_BASE_URL}/service-packages/${id}/services`,
        {
          timeout: API_CONFIG.API_TIMEOUT,
        }
      );
      return response.data?.data || [];
    } catch (error) {
      console.error(`Error fetching detailed services for package ${id} in Mobile:`, error);
      throw error;
    }
  }

  async listActiveServices(): Promise<any[]> {
    try {
      const response = await axios.get<{ success: boolean; data: any }>(
        `${API_BASE_URL}/services`,
        {
          params: { page: 1, limit: 100, is_active: true },
          timeout: API_CONFIG.API_TIMEOUT,
        }
      );
      const data = response.data?.data;
      const docs = Array.isArray(data) ? data : (data?.docs || []);
      return docs;
    } catch (error) {
      console.error('Error fetching active services in Mobile:', error);
      throw error;
    }
  }
}

export default new ServicePackageService();

