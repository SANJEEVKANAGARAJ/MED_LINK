import axiosInstance from './axios';

export const doctorApi = {
  getMe: async () => {
    return await axiosInstance.get('/doctors/me');
  },

  getAppointments: async () => {
    return await axiosInstance.get('/appointments');
  },

  getPatientHistory: async (patientId) => {
    return await axiosInstance.get(`/patients/${patientId}/history`);
  },

  submitClinicalNotes: async (appointmentId, notesData) => {
    return await axiosInstance.post(`/appointments/${appointmentId}/notes`, notesData);
  },

  createPrescription: async (appointmentId, prescriptionData) => {
    return await axiosInstance.post(`/appointments/${appointmentId}/prescriptions`, prescriptionData);
  },

  completeAppointment: async (appointmentId) => {
    return await axiosInstance.put(`/appointments/${appointmentId}/complete`);
  },

  getAppointmentSymptoms: async (appointmentId) => {
    return await axiosInstance.get(`/patients/appointment/${appointmentId}/symptoms`);
  }
};
