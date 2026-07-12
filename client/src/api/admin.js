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
  },

  getAllPharmacies: () => axiosInstance.get('/pharmacy/admin/list'),
  createPharmacy: (data) => axiosInstance.post('/pharmacy/admin/create', data),
  updatePharmacy: (id, data) => axiosInstance.put(`/pharmacy/admin/${id}`, data),
  deletePharmacy: (id) => axiosInstance.delete(`/pharmacy/admin/${id}`),
  getPharmacyMedicines: (id) => axiosInstance.get(`/pharmacy/admin/${id}/medicines`),
  updatePharmacyMedicine: (pharmacyId, medicineId, data) => axiosInstance.put(`/pharmacy/admin/medicines/${medicineId}`, { pharmacy_id: pharmacyId, ...data }),
  updateOrderStatus: (pharmacyId, orderId, data) => axiosInstance.put(`/pharmacy/admin/${pharmacyId}/orders/${orderId}/status`, data)
};
