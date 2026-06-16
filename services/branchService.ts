import axios from 'axios';
import { API_CONFIG } from '../config/app.config';

const API_BASE_URL = API_CONFIG.API_BASE_URL;

export interface Branch {
  _id?: string;
  id?: string;
  branch_address?: {
    street: string;
    ward: string;
    district: string;
    city: string;
  };
  branch_phone?: string;
  operating_time?: {
    default_open: string;
    default_close: string;
    weekend_open?: string;
    weekend_close?: string;
  };
  is_active?: boolean;
  bay_counts?: number;
  geo?: {
    latitude: number;
    longitude: number;
  };
}

class BranchService {
  async list(): Promise<Branch[]> {
    try {
      const response = await axios.get<{ success: boolean; data: Branch[] }>(
        `${API_BASE_URL}/branches`,
        {
          timeout: API_CONFIG.API_TIMEOUT,
        }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching branches in Mobile:', error);
      throw error;
    }
  }
}

export default new BranchService();
