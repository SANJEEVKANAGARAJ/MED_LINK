import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Pharmacy axios instance — uses pharmacy JWT stored separately
const pharmacyAxios = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

pharmacyAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('pharmacyToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const pharmacyApi = {
  login: (data) => axios.post(`${API_URL}/pharmacy/login`, data),
  getMedicines: () => pharmacyAxios.get('/pharmacy/medicines'),
  updateMedicine: (id, data) => pharmacyAxios.put(`/pharmacy/medicines/${id}`, data),
  getOrders: () => pharmacyAxios.get('/pharmacy/orders'),
  updateOrderStatus: (id, delivery_status) =>
    pharmacyAxios.put(`/pharmacy/orders/${id}/status`, { delivery_status }),
};
