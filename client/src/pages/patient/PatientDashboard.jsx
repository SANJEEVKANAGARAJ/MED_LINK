import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { patientApi } from '../../api/patient';
import { Calendar, Clock, User, Video } from 'lucide-react';
import { format, isAfter, isToday } from 'date-fns';
import { toast } from 'react-hot-toast';
import { SkeletonCard } from '../../components/ui/Skeleton';
import CalendarConnect from '../../components/CalendarConnect';

const PatientDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const navigation = [
    { name: 'Dashboard', href: '/patient/dashboard' },
    { name: 'Search Doctors', href: '/patient/doctors' },
    { name: 'Appointment History', href: '/patient/history' },
    { name: 'Pharmacy', href: '/patient/pharmacy' },
  ];

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await patientApi.getAppointments();
        const now = new Date();
        const appointmentsArray = res.data?.data?.data || [];
        const upcoming = appointmentsArray.filter(app => {
          if (app.status !== 'booked') return false;
          // appointment_date and slot_time are stored/treated as UTC on the server.
          // Build an explicit UTC ISO string so the comparison is timezone-safe.
          const dateStr = new Date(app.appointment_date).toISOString().split('T')[0];
          const slotStr = app.slot_time.substring(0, 8); // HH:MM:SS
          const appDateUTC = new Date(`${dateStr}T${slotStr}Z`);
          app.parsedDate = appDateUTC;
          return isAfter(appDateUTC, now);
        });
        upcoming.sort((a, b) => a.parsedDate - b.parsedDate);
        setAppointments(upcoming);
      } catch {
        toast.error('Failed to load appointments');
        setError('Failed to load appointments.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await patientApi.cancelAppointment(id);
        setAppointments(prev => prev.filter(app => app.id !== id));
        toast.success('Appointment cancelled');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to cancel appointment');
      }
    }
  };

  return (
    <DashboardLayout title="Patient Portal" roleColor="emerald" navigation={navigation}>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back!</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your appointments and medical history from your dashboard.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <CalendarConnect />
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Upcoming Appointments</h3>
        <Link
          to="/patient/doctors"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          Book New Appointment
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming appointments</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by booking an appointment with a doctor.</p>
          <div className="mt-6">
            <Link
              to="/patient/doctors"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
            >
              Search Doctors
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {appointments.map((appointment) => {
            // Use UTC date string for display so it matches the stored UTC date.
            const dateStr = new Date(appointment.appointment_date).toISOString().split('T')[0];
            const dateObj = new Date(`${dateStr}T00:00:00`);
            const isAppToday = isToday(dateObj);
            
            return (
              <div key={appointment.id} className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 transition-all hover:shadow-md">
                <div className={`px-4 py-2 ${isAppToday ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-gray-50 border-b border-gray-100'}`}>
                  <p className={`text-xs font-semibold ${isAppToday ? 'text-emerald-700' : 'text-gray-500 uppercase'}`}>
                    {isAppToday ? 'TODAY' : format(dateObj, 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-emerald-100 rounded-full p-3">
                      <User className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="ml-4 w-full">
                      <h4 className="text-lg font-bold text-gray-900">Dr. {appointment.doctor_first_name} {appointment.doctor_last_name}</h4>
                      <p className="text-sm text-gray-500">{appointment.specialisation}</p>
                      
                      <div className="mt-4 flex flex-col space-y-2">
                        <div className="flex items-center text-sm text-gray-700">
                          <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          <time>{appointment.slot_time.substring(0, 5)}</time>
                          <span className="ml-1 text-xs text-gray-400">(UTC)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-4 sm:px-6 flex justify-between items-center">
                  <button
                    onClick={() => handleCancel(appointment.id)}
                    className="text-sm font-medium text-red-600 hover:text-red-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center space-x-3">
                    {appointment.is_approved ? (
                      <Link
                        to={`/telehealth/${appointment.id}`}
                        className="inline-flex items-center text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-md border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      >
                        <Video className="h-3.5 w-3.5 mr-1" />
                        Join Call
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="inline-flex items-center text-xs font-semibold bg-gray-100 text-gray-400 px-2.5 py-1.5 rounded-md border border-gray-200 cursor-not-allowed"
                        title="Waiting for the doctor to approve and initiate the video consultation."
                      >
                        <Video className="h-3.5 w-3.5 mr-1 text-gray-300" />
                        Pending Approval
                      </button>
                    )}
                    <Link
                      to={`/patient/book/${appointment.doctor_id}?reschedule=true&appId=${appointment.id}`}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
                    >
                      Reschedule
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PatientDashboard;
