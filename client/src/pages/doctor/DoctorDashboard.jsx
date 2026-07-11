import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doctorApi } from '../../api/doctor';
import DashboardLayout from '../../components/DashboardLayout';
import { format, isToday } from 'date-fns';
import { Clock, Calendar as CalendarIcon, User, ChevronRight, Activity } from 'lucide-react';
import CalendarConnect from '../../components/CalendarConnect';
import { toast } from 'react-hot-toast';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const navigation = [
    { name: 'Dashboard', href: '/doctor/dashboard' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, apptsRes] = await Promise.all([
          doctorApi.getMe(),
          doctorApi.getAppointments()
        ]);
        
        setProfile(profileRes.data.data);
        setAppointments(apptsRes.data.data?.data || []);
      } catch (err) {
        if (err.response?.status === 429) {
          setError('Too many requests. Please wait a moment and try again.');
          toast.error('Too many requests, please try again later.');
        } else {
          setError(`Failed to load dashboard data: ${err.message} - ${JSON.stringify(err.response?.data || {})}`);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const todayAppointments = appointments.filter(app => {
    return app.status === 'booked' && isToday(new Date(app.appointment_date));
  }).sort((a, b) => a.slot_time.localeCompare(b.slot_time));

  const upcomingAppointments = appointments.filter(app => {
    return app.status === 'booked' && !isToday(new Date(app.appointment_date)) && new Date(app.appointment_date) > new Date();
  }).sort((a, b) => new Date(`${a.appointment_date}T${a.slot_time}Z`) - new Date(`${b.appointment_date}T${b.slot_time}Z`));

  return (
    <DashboardLayout title="Doctor Portal" roleColor="blue" navigation={navigation}>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome, Dr. {profile?.last_name || user?.email}</h2>
          <p className="mt-1 text-sm text-gray-500">Here's your schedule for today.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <CalendarConnect />
        </div>
      </div>

      {error && (
        <div className="mb-8 bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 h-32"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Today's Appointments</h3>
              <span className="ml-3 bg-blue-100 text-blue-800 py-0.5 px-2.5 rounded-full text-xs font-medium">
                {todayAppointments.length}
              </span>
            </div>
            
            {todayAppointments.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-sm">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments today</h3>
                <p className="mt-1 text-sm text-gray-500">Take a well-deserved break or review patient histories.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {todayAppointments.map((app) => (
                  <div key={app.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                    <div className="p-6 flex-grow">
                      <div className="flex items-center justify-between mb-4">
                        <span className="flex items-center text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                          <Clock className="h-4 w-4 mr-1.5" />
                          {app.slot_time.substring(0, 5)}
                        </span>
                        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full uppercase tracking-wider">
                          {app.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="bg-gray-100 p-2 rounded-full">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900">
                          {app.patient_first_name} {app.patient_last_name}
                        </h4>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                      <button
                        onClick={() => navigate(`/doctor/visit/${app.id}`)}
                        className="w-full flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                      >
                        Start Visit
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Appointments</h3>
            {upcomingAppointments.length === 0 ? (
              <div className="bg-white p-8 text-center rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500">No upcoming appointments scheduled.</p>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {upcomingAppointments.map((app) => (
                    <li key={app.id}>
                      <div className="px-4 py-4 sm:px-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <Activity className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-blue-600 truncate">
                              {app.patient_first_name} {app.patient_last_name}
                            </p>
                            <div className="mt-1 flex text-sm text-gray-500">
                              <span className="flex items-center mr-4">
                                <CalendarIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                {format(new Date(app.appointment_date), 'MMM d, yyyy')}
                              </span>
                              <span className="flex items-center">
                                <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                {app.slot_time.substring(0, 5)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <button
                            onClick={() => navigate(`/doctor/visit/${app.id}`)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Prepare
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DoctorDashboard;
