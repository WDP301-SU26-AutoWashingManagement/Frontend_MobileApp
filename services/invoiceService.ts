import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/app.config';

const API_BASE_URL = API_CONFIG.API_BASE_URL;
const API_TIMEOUT = API_CONFIG.API_TIMEOUT;
const ACCESS_TOKEN_KEY = '@auth_access_token';

class InvoiceService {
  private axiosInstance: AxiosInstance;

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
        const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  async createInvoice(appointmentId: string, options: any = {}): Promise<any> {
    const res = await this.axiosInstance.post(`/invoices`, {
      appointment_id: appointmentId,
      ...options,
    });
    return res.data;
  }

  async confirmCash(invoiceId: string, staffId: string): Promise<any> {
    const res = await this.axiosInstance.patch(`/invoices/${invoiceId}/confirm-cash`, {
      staff_id: staffId,
    });
    return res.data;
  }

  async createPaymentLink(invoiceId: string): Promise<any> {
    await this.axiosInstance.post(`/invoices/${invoiceId}/payment-link`);
    const res = await this.axiosInstance.get(`/invoices/${invoiceId}`);
    return res.data;
  }

  async syncPaymentStatus(invoiceId: string): Promise<any> {
    const res = await this.axiosInstance.get(`/invoices/${invoiceId}/sync`);
    return res.data;
  }

  async cancelPaymentLink(invoiceId: string, reason?: string): Promise<any> {
    const res = await this.axiosInstance.patch(`/invoices/${invoiceId}/cancel-payment`, { reason });
    return res.data;
  }

  async list(params?: any): Promise<any> {
    const res = await this.axiosInstance.get(`/invoices`, { params });
    return res.data;
  }
}

export const invoiceService = new InvoiceService();
