import axiosInstance from './axios';

export const adminApi = {
  getAllDoctors: () => axiosInstance.get('/doctors'),
  
  getDoctorById: (id) => axiosInstance.get(`/doctors/${id}`),
  
  createDoctor: (doctorData) => axiosInstance.post('/doctors', doctorData),
  
  updateDoctor: (id, doctorData) => axiosInstance.put(`/doctors/${id}`, doctorData),
  
  deleteDoctor: (id) => axiosInstance.delete(`/doctors/${id}`),

  getDoctorAvailability: (id) => axiosInstance.get(`/doctors/${id}/availability`),
  
  setDoctorAvailability: (id, schedules) => axiosInstance.post(`/doctors/${id}/availability`, schedules),

  getDoctorLeave: (id) => axiosInstance.get(`/doctors/${id}/leave`),

  addDoctorLeave: (id, data) => axiosInstance.post(`/doctors/${id}/leave`, data),
  
  removeDoctorLeave: (id, date) => axiosInstance.delete(`/doctors/${id}/leave/${date}`),
  
  getDashboardMetrics: async () => {
    const response = await axiosInstance.get('/analytics/dashboard');
    return response.data.data;
  }
};
