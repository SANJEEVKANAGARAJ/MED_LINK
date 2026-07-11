import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { Users, Calendar, Activity, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { adminApi } from '../../api/admin';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState({ totalDoctors: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard' },
    { name: 'Manage Doctors', href: '/admin/doctors' },
    { name: 'Leave Management', href: '/admin/leave' },
  ];

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await adminApi.getDashboardMetrics();
        setMetrics(data);
      } catch {
        setError('Failed to fetch dashboard data');
        toast.error('Failed to load dashboard metrics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return (
    <DashboardLayout title="Admin Portal" roleColor="indigo" navigation={navigation}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
        <p className="text-sm text-gray-500">Welcome to the healthcare admin control panel.</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 flex">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="ml-3 text-sm text-red-700">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Total Doctors */}
            <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-indigo-50 rounded-md p-3">
                    <Users className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Doctors</dt>
                      <dd className="text-2xl font-bold text-gray-900">{metrics?.totalDoctors || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Patients */}
            <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-50 rounded-md p-3">
                    <Activity className="h-6 w-6 text-green-600" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Patients</dt>
                      <dd className="text-2xl font-bold text-gray-900">{metrics?.totalPatients || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Appointments */}
            <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-50 rounded-md p-3">
                    <Calendar className="h-6 w-6 text-blue-600" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Appointments</dt>
                      <dd className="text-2xl font-bold text-gray-900">{metrics?.totalAppointments || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Appointments by Status</h3>
              <div className="h-72">
                {metrics?.appointmentsByStatus && Object.keys(metrics.appointmentsByStatus).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(metrics.appointmentsByStatus).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {Object.entries(metrics.appointmentsByStatus).map((entry, index) => {
                          const status = entry[0];
                          let color = '#9ca3af'; // default gray
                          if (status === 'completed') color = '#10b981'; // green
                          else if (status === 'scheduled') color = '#3b82f6'; // blue
                          else if (status === 'cancelled') color = '#ef4444'; // red
                          
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <Tooltip formatter={(value) => [value, 'Appointments']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    No appointment data available
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status Breakdown</h3>
              <div className="h-72">
                {metrics?.appointmentsByStatus && Object.keys(metrics.appointmentsByStatus).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(metrics.appointmentsByStatus).map(([name, value]) => ({ 
                        name: name.charAt(0).toUpperCase() + name.slice(1), 
                        value 
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: '#f3f4f6'}} />
                      <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    No appointment data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;
