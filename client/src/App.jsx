import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import PublicLayout from './components/PublicLayout';
import Home from './pages/Home';
import Product from './pages/public/Product';
import Features from './pages/public/Features';
import Security from './pages/public/Security';
import Privacy from './pages/public/Privacy';
import Terms from './pages/public/Terms';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Unauthorized from './pages/Unauthorized';
import AdminDashboard from './pages/admin/AdminDashboard';
import DoctorList from './pages/admin/DoctorList';
import DoctorForm from './pages/admin/DoctorForm';
import LeaveManagement from './pages/admin/LeaveManagement';
import PatientDashboard from './pages/patient/PatientDashboard';
import SearchDoctors from './pages/patient/SearchDoctors';
import DoctorProfile from './pages/patient/DoctorProfile';
import BookingFlow from './pages/patient/BookingFlow';
import AppointmentHistory from './pages/patient/AppointmentHistory';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import AppointmentVisit from './pages/doctor/AppointmentVisit';

import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/product" element={<Product />} />
            <Route path="/features" element={<Features />} />
            <Route path="/security" element={<Security />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
          </Route>

          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Routes - Admin Only */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/doctors" element={<DoctorList />} />
            <Route path="/admin/doctors/new" element={<DoctorForm />} />
            <Route path="/admin/doctors/:id/edit" element={<DoctorForm />} />
            <Route path="/admin/leave" element={<LeaveManagement />} />
          </Route>

          {/* Protected Routes - Doctor Only */}
          <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor/visit/:appointmentId" element={<AppointmentVisit />} />
          </Route>

          {/* Protected Routes - Patient Only */}
          <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
            <Route path="/patient/doctors" element={<SearchDoctors />} />
            <Route path="/patient/doctors/:doctorId" element={<DoctorProfile />} />
            <Route path="/patient/book/:doctorId" element={<BookingFlow />} />
            <Route path="/patient/history" element={<AppointmentHistory />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
