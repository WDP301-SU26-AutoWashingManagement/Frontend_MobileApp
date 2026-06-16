import axios from 'axios';
import { API_CONFIG } from '../config/app.config';

const API_BASE_URL = API_CONFIG.API_BASE_URL;

export interface Promotion {
  _id?: string;
  id?: string;
  promotion_code: string;
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
      const response = await axios.get<{ success: boolean; message?: string; data: any }>(
        `${API_BASE_URL}/promotions/validate/${encodeURIComponent(trimmed)}`,
        {
          timeout: API_CONFIG.API_TIMEOUT,
        }
      );
      
      const data = response.data.data;
      
      // Map returned data to Promotion model
      const promotion: Promotion = {
        _id: data._id || data.id,
        id: data._id || data.id,
        promotion_code: String(data.promotion_code ?? ''),
        discount_type: data.discount_type === 'fixed' ? 'fixed' : 'percentage',
        discount_value: Number(data.discount_value ?? 0),
        bonus_reward_point: data.bonus_reward_point != null ? Number(data.bonus_reward_point) : undefined,
        start_at: data.start_at,
        end_at: data.end_at,
        is_active: data.is_active !== false,
      };

      return {
        promotion,
        message: response.data.message,
      };
    } catch (error: any) {
      console.error('Error validating promo code in Mobile:', error);
      const msg = error.response?.data?.message || 'Mã khuyến mãi không hợp lệ hoặc đã hết hạn';
      throw new Error(msg);
    }
  }
}

export default new PromotionService();
