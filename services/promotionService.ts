import axios from 'axios';
import { API_CONFIG } from '../config/app.config';

const API_BASE_URL = API_CONFIG.API_BASE_URL;

export interface Promotion {
  _id?: string;
  id?: string;
  promotion_code: string;
  promotion_name?: string;
  description?: string;
  min_order_amount?: number;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  bonus_reward_point?: number;
  start_at?: string;
  end_at?: string;
  is_active?: boolean;
}

export interface ValidatePromotionResult {
  promotion: Promotion;
  message?: string;
}

class PromotionService {
  async validateCode(code: string): Promise<ValidatePromotionResult> {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      throw new Error('Vui lòng nhập mã khuyến mãi');
    }

    try {
      const response = await axios.post<{ success: boolean; message?: string; data: any }>(
        `${API_BASE_URL}/promotions/discount`,
        { code: trimmed },
        {
          timeout: API_CONFIG.API_TIMEOUT,
        }
      );
      
      const data = response.data.data;
      
      // Map returned data to Promotion model
      const promotion: Promotion = {
        _id: data._id || data.id,
        id: data._id || data.id,
        promotion_code: String(data.code || data.promotion_code || ''),
        promotion_name: String(data.promotion_name || ''),
        description: String(data.description || ''),
        min_order_amount: Number(data.min_order_amount || 0),
        discount_type: data.discount_percentage ? 'percentage' : 'fixed',
        discount_value: Number(data.discount_percentage || data.discount_amount || 0),
        bonus_reward_point: data.bonus_reward_point != null ? Number(data.bonus_reward_point) : undefined,
        start_at: data.start_date || data.start_at,
        end_at: data.end_date || data.end_at,
        is_active: data.is_active !== false,
      };

      return {
        promotion,
        message: response.data.message || 'Áp dụng mã thành công',
      };
    } catch (error: any) {
      console.error('Error validating promo code in Mobile:', error);
      const msg = error.response?.data?.message || 'Mã khuyến mãi không hợp lệ hoặc đã hết hạn';
      throw new Error(msg);
    }
  }

  async list(params: any = {}): Promise<Promotion[]> {
    try {
      const response = await axios.get<{ success: boolean; data: any[] }>(
        `${API_BASE_URL}/promotions`,
        {
          params,
          timeout: API_CONFIG.API_TIMEOUT,
        }
      );
      return response.data.data.map(data => ({
        _id: data._id || data.id,
        id: data._id || data.id,
        promotion_code: String(data.code || data.promotion_code || ''),
        promotion_name: String(data.promotion_name || ''),
        description: String(data.description || ''),
        min_order_amount: Number(data.min_order_amount || 0),
        discount_type: data.discount_percentage ? 'percentage' : 'fixed',
        discount_value: Number(data.discount_percentage || data.discount_amount || 0),
        bonus_reward_point: data.bonus_reward_point != null ? Number(data.bonus_reward_point) : undefined,
        start_at: data.start_date || data.start_at,
        end_at: data.end_date || data.end_at,
        is_active: data.is_active !== false,
      }));
    } catch (error) {
      console.error('Error fetching promotions in Mobile:', error);
      throw error;
    }
  }
}

export default new PromotionService();
