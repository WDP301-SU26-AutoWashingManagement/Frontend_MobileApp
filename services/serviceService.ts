import axios from 'axios';
import { API_CONFIG } from '../config/app.config';

const API_BASE_URL = API_CONFIG.API_BASE_URL;

export interface Service {
  _id?: string;
  id?: string;
  service_name: string;
  service_price: number;
  service_description?: string;
  is_active?: boolean;
}

class ServiceService {
  async list(params: any = {}): Promise<Service[]> {
    try {
      const response = await axios.get<{ success: boolean; data: any[] }>(
        `${API_BASE_URL}/services`,
        {
          params,
          timeout: API_CONFIG.API_TIMEOUT,
        }
      );
      return response.data.data.map(data => ({
        _id: data._id || data.id,
        id: data._id || data.id,
        service_name: String(data.service_name ?? ''),
        service_price: Number(data.service_price ?? 0),
        service_description: data.description || data.service_description,
        is_active: data.is_active !== false,
      }));
    } catch (error) {
      console.error('Error fetching services in Mobile:', error);
      return [];
    }
  }
}

export default new ServiceService();
