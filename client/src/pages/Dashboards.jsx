import React from 'react';
import DashboardLayout from '../components/DashboardLayout';

export const DoctorDashboard = () => (
  <DashboardLayout title="Doctor Portal" roleColor="teal">
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Doctor Dashboard</h2>
      <p className="text-gray-600">This is a placeholder for the Doctor Dashboard.</p>
    </div>
  </DashboardLayout>
);

export const PatientDashboard = () => (
  <DashboardLayout title="Patient Portal" roleColor="blue">
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Patient Dashboard</h2>
      <p className="text-gray-600">This is a placeholder for the Patient Dashboard.</p>
    </div>
  </DashboardLayout>
);
