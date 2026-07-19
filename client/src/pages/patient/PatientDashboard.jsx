import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { patientApi } from '../../api/patient';
import { Calendar, Clock, User, Video, X, Download, Stethoscope, CheckCircle, XCircle } from 'lucide-react';
import { format, isAfter, isToday, parseISO } from 'date-fns';
import { toast } from 'react-hot-toast';
import { SkeletonCard } from '../../components/ui/Skeleton';
import CalendarConnect from '../../components/CalendarConnect';

// ─────────────────────────────────────────────
// ICS calendar file generator
// ─────────────────────────────────────────────
function generateICS(appointment) {
  const dateStr = appointment.appointment_date.toString().split('T')[0]; // "YYYY-MM-DD"
  const slotStr = appointment.slot_time.substring(0, 8); // "HH:MM:SS"
  const startDt = new Date(`${dateStr}T${slotStr}Z`);
  const durationMs = (appointment.slot_duration_minutes || 30) * 60 * 1000;
  const endDt = new Date(startDt.getTime() + durationMs);

  const fmt = (dt) =>
    dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const doctorName = `Dr. ${appointment.doctor_first_name} ${appointment.doctor_last_name}`;
  const summary = `Appointment with ${doctorName}`;
  const description = `Specialisation: ${appointment.specialisation}\\nStatus: ${appointment.status}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MedLink//Healthcare//EN',
    'BEGIN:VEVENT',
    `UID:${appointment.id}@medlink`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(startDt)}`,
    `DTEND:${fmt(endDt)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadICS(appointment) {
  const ics = generateICS(appointment);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `appointment-${appointment.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// Appointment Detail Modal
// ─────────────────────────────────────────────
const AppointmentDetailModal = ({ appointment, onClose, onCancel }) => {
  if (!appointment) return null;

  // Safe date parsing — use the raw date string directly, not via new Date()
  const dateStr = appointment.appointment_date.toString().split('T')[0];
  const dateObj = parseISO(dateStr); // parseISO treats as local midnight, correct for display
  const isAppToday = isToday(dateObj);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Appointment Details</h2>
            <p className="text-emerald-100 text-sm mt-0.5">
              {isAppToday ? '📅 TODAY' : format(dateObj, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1.5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Doctor */}
          <div className="flex items-center space-x-3 bg-gray-50 rounded-xl p-4">
            <div className="bg-emerald-100 rounded-full p-2.5">
              <User className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Doctor</p>
              <p className="font-semibold text-gray-900">
                Dr. {appointment.doctor_first_name} {appointment.doctor_last_name}
              </p>
            </div>
          </div>

          {/* Specialisation */}
          <div className="flex items-center space-x-3 bg-gray-50 rounded-xl p-4">
            <div className="bg-blue-100 rounded-full p-2.5">
              <Stethoscope className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Specialisation</p>
              <p className="font-semibold text-gray-900">{appointment.specialisation}</p>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center space-x-3 bg-gray-50 rounded-xl p-4">
              <div className="bg-purple-100 rounded-full p-2.5">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Date</p>
                <p className="font-semibold text-gray-900">{format(dateObj, 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 bg-gray-50 rounded-xl p-4">
              <div className="bg-orange-100 rounded-full p-2.5">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Time (UTC)</p>
                <p className="font-semibold text-gray-900">{appointment.slot_time.substring(0, 5)}</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-3 bg-gray-50 rounded-xl p-4">
            <div className={`rounded-full p-2.5 ${appointment.is_approved ? 'bg-green-100' : 'bg-yellow-100'}`}>
              {appointment.is_approved
                ? <CheckCircle className="h-5 w-5 text-green-600" />
                : <Clock className="h-5 w-5 text-yellow-600" />
              }
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Video Call Status</p>
              <p className="font-semibold text-gray-900">
                {appointment.is_approved ? 'Approved – ready to join' : 'Awaiting doctor approval'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => downloadICS(appointment)}
            className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors text-sm"
          >
            <Download className="h-4 w-4" />
            Add to Calendar (.ics)
          </button>

          {appointment.is_approved && (
            <Link
              to={`/telehealth/${appointment.id}`}
              className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm"
              onClick={onClose}
            >
              <Video className="h-4 w-4" />
              Join Video Call
            </Link>
          )}

          <button
            onClick={() => {
              onClose();
              onCancel(appointment.id);
            }}
            className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors text-sm"
          >
            <XCircle className="h-4 w-4" />
            Cancel Appointment
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Patient Dashboard
// ─────────────────────────────────────────────
const PatientDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);

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

          // BUG FIX: Use the raw date string directly to avoid timezone drift.
          // PostgreSQL DATE columns arrive as "YYYY-MM-DD" or "YYYY-MM-DDT00:00:00.000Z".
          // We extract only the date portion and combine with slot_time as a UTC datetime.
          const rawDate = app.appointment_date; // may have a T suffix from pg
          const dateStr = typeof rawDate === 'string'
            ? rawDate.split('T')[0]
            : new Date(rawDate).toISOString().split('T')[0];

          const slotStr = app.slot_time.substring(0, 8); // HH:MM:SS
          const appDateUTC = new Date(`${dateStr}T${slotStr}Z`);
          app.parsedDate = appDateUTC;

          // Keep anything that hasn't ended yet (within the next few hours counts as upcoming)
          const durationMs = (app.slot_duration_minutes || 30) * 60 * 1000;
          return isAfter(new Date(appDateUTC.getTime() + durationMs), now);
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
      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onCancel={handleCancel}
        />
      )}

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
            const rawDate = appointment.appointment_date;
            const dateStr = typeof rawDate === 'string'
              ? rawDate.split('T')[0]
              : new Date(rawDate).toISOString().split('T')[0];
            const dateObj = parseISO(dateStr); // local midnight, correct for display
            const isAppToday = isToday(dateObj);

            return (
              <div
                key={appointment.id}
                className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                onClick={() => setSelectedAppointment(appointment)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedAppointment(appointment)}
                aria-label={`View details for appointment with Dr. ${appointment.doctor_first_name} ${appointment.doctor_last_name}`}
              >
                {/* Date badge */}
                <div className={`px-4 py-2 ${isAppToday ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-gray-50 border-b border-gray-100'}`}>
                  <p className={`text-xs font-semibold ${isAppToday ? 'text-emerald-700' : 'text-gray-500 uppercase'}`}>
                    {isAppToday ? 'TODAY' : format(dateObj, 'MMM d, yyyy')}
                  </p>
                </div>

                {/* Card body */}
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-emerald-100 rounded-full p-3">
                      <User className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="ml-4 w-full">
                      <h4 className="text-lg font-bold text-gray-900">
                        Dr. {appointment.doctor_first_name} {appointment.doctor_last_name}
                      </h4>
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

                {/* Card footer */}
                <div
                  className="bg-gray-50 px-4 py-4 sm:px-6 flex justify-between items-center"
                  onClick={(e) => e.stopPropagation()} // prevent modal open on action buttons
                >
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
                        onClick={(e) => e.stopPropagation()}
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
                      onClick={(e) => e.stopPropagation()}
                    >
                      Reschedule
                    </Link>
                  </div>
                </div>

                {/* Click hint */}
                <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100 text-xs text-emerald-600 font-medium text-center">
                  Tap to view details &amp; add to calendar
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
