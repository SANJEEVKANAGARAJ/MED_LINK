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
};
