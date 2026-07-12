import axiosInstance from './axios';

export const patientApi = {
  getDoctors: () => axiosInstance.get('/doctors'),
  getDoctorById: (id) => axiosInstance.get(`/doctors/${id}`),
  
  getAppointments: () => axiosInstance.get('/appointments'),
  getAvailableSlots: (doctorId, date) => axiosInstance.get(`/appointments/slots`, { params: { doctor_id: doctorId, date } }),
  holdSlot: (data) => axiosInstance.post('/appointments/hold', data),
  bookAppointment: (data) => axiosInstance.post('/appointments', data),
  cancelAppointment: (id) => axiosInstance.put(`/appointments/${id}/cancel`),
  rescheduleAppointment: (id, data) => axiosInstance.put(`/appointments/${id}/reschedule`, data),

  getPatientProfile: () => axiosInstance.get('/patients/me'),
  getPatientHistory: (patientId) => axiosInstance.get(`/patients/${patientId}/history`),
  submitSymptoms: (appointmentId, data) => axiosInstance.post(`/appointments/${appointmentId}/symptoms`, data),

  // Payment
  createPaymentSession: (data) => axiosInstance.post('/payments/create-session', data),
  verifyPayment: (sessionId) => axiosInstance.get(`/payments/verify?session_id=${sessionId}`),
  getPaymentByAppointment: (appointmentId) => axiosInstance.get(`/payments/session/${appointmentId}`),
  getTelehealthStatus: (appointmentId) => axiosInstance.get(`/appointments/${appointmentId}/telehealth-status`),

  // Pharmacy Marketplace
  getMarketplace: () => axiosInstance.get('/pharmacy/marketplace'),
  createPharmacyOrderSession: (data) => axiosInstance.post('/pharmacy/order-session', data),
  verifyPharmacyOrder: (sessionId) => axiosInstance.get(`/pharmacy/verify-order?session_id=${sessionId}`),
  getMyOrders: () => axiosInstance.get('/pharmacy/my-orders'),

  // Reviews
  submitReview: (data) => axiosInstance.post('/reviews', data),
  getDoctorReviews: (doctorId) => axiosInstance.get(`/reviews/doctor/${doctorId}`),
};

