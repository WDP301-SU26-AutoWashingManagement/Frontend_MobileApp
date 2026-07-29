import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/app.config';

const API_BASE_URL = API_CONFIG.API_BASE_URL;
const API_TIMEOUT = API_CONFIG.API_TIMEOUT;

const ACCESS_TOKEN_KEY = '@auth_access_token';

export interface AttendanceRecord {
  _id: string;
  schedule_id: any;
  staff_id: string;
  check_in_time?: string;
  check_out_time?: string;
  status: 'pending' | 'checked_in' | 'checked_out' | 'absent' | 'not_checked';
}

export interface Schedule {
  _id: string;
  branch_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_status: string;
  max_staff: number;
  assigned_staff: any[];
}

class AttendanceService {
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

  async getMyAttendance(): Promise<AttendanceRecord[]> {
    try {
      const response = await this.axiosInstance.get<{ success: boolean; data: AttendanceRecord[] }>(
        '/attendance/me'
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching attendance in Mobile:', error);
      throw error;
    }
  }

  async checkIn(scheduleId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.post<any>('/attendance/check-in', {
        schedule_id: scheduleId,
      });
      return response.data;
    } catch (error) {
      console.error('Error checkin in Mobile:', error);
      throw error;
    }
  }

  async checkOut(scheduleId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.post<any>('/attendance/check-out', {
        schedule_id: scheduleId,
      });
      return response.data;
    } catch (error) {
      console.error('Error checkout in Mobile:', error);
      throw error;
    }
  }

  async getAllSchedules(): Promise<Schedule[]> {
    try {
      const response = await this.axiosInstance.get<{ success: boolean; data: Schedule[] }>('/schedule');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching schedules in Mobile:', error);
      throw error;
    }
  }
}

export default new AttendanceService();
