import axiosInstance from './axios';

export const calendarApi = {
  getStatus: async () => {
    const response = await axiosInstance.get('/calendar/status');
    return response.data;
  },

  getAuthUrl: async () => {
    const response = await axiosInstance.get('/calendar/auth');
    return response.data;
  },

  disconnect: async () => {
    const response = await axiosInstance.post('/calendar/disconnect');
    return response.data;
  }
};
