import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { patientApi } from '../../api/patient';
import DashboardLayout from '../../components/DashboardLayout';
import { CheckCircle, AlertTriangle, Calendar, Clock, ArrowRight, Loader } from 'lucide-react';
import { format } from 'date-fns';

const navigation = [
  { name: 'Dashboard', href: '/patient/dashboard' },
  { name: 'Search Doctors', href: '/patient/doctors' },
  { name: 'Appointment History', href: '/patient/history' },
  { name: 'Pharmacy', href: '/patient/pharmacy' },
];

const BookingSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [state, setState] = useState('loading'); // loading | success | error
  const [appointment, setAppointment] = useState(null);
  const [amountPaid, setAmountPaid] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setState('error');
      setErrorMessage('No payment session ID found. Please try booking again.');
      return;
    }

    const verify = async () => {
      try {
        const res = await patientApi.verifyPayment(sessionId);
        const data = res.data?.data;
        setAppointment(data.appointment);
        setAmountPaid(data.amountPaid);
        setCurrency(data.currency || 'USD');
        setState('success');
      } catch (err) {
        const msg = err.response?.data?.message || 'Payment verification failed. Please contact support.';
        setErrorMessage(msg);
        setState('error');
      }
    };

    verify();
  }, [sessionId]);

  return (
    <DashboardLayout title="Patient Portal" roleColor="emerald" navigation={navigation}>
      <div className="max-w-2xl mx-auto py-8">
        {state === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader className="h-10 w-10 text-emerald-500 animate-spin" />
            <p className="text-gray-600 font-medium">Confirming your payment...</p>
            <p className="text-sm text-gray-400">Please wait, this takes just a moment.</p>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
            <div className="bg-red-600 px-8 py-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-8 w-8 text-white" />
                <h2 className="text-2xl font-bold text-white">Payment Issue</h2>
              </div>
            </div>
            <div className="p-8">
              <p className="text-gray-700 mb-6">{errorMessage}</p>
              <Link
                to="/patient/doctors"
                className="inline-flex items-center px-5 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                Try Booking Again
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {state === 'success' && appointment && (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-9 w-9 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white">Appointment Confirmed!</h1>
              <p className="text-emerald-100 mt-2">Payment received · Your booking is secured</p>
              {amountPaid && (
                <div className="mt-4 inline-flex items-center bg-white bg-opacity-20 rounded-full px-4 py-1.5">
                  <span className="text-white font-semibold text-sm">
                    {currency} {amountPaid.toFixed(2)} paid
                  </span>
                </div>
              )}
            </div>

            {/* Appointment Details */}
            <div className="p-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Appointment Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Date</p>
                    <p className="font-semibold text-gray-900">
                      {format(new Date(appointment.appointment_date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Time</p>
                    <p className="font-semibold text-gray-900">
                      {appointment.slot_time?.substring(0, 5)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 mb-8">
                <p className="text-sm text-emerald-800 font-medium">✅ What happens next?</p>
                <ul className="mt-3 space-y-2 text-sm text-emerald-700">
                  <li>• Your doctor will review your symptoms before the appointment.</li>
                  <li>• You'll receive a confirmation email with the details.</li>
                  <li>• At appointment time, your doctor will either send a prescription or start a video call.</li>
                  <li>• After the visit, you can download your prescription from Appointment History.</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/patient/dashboard"
                  className="flex-1 inline-flex justify-center items-center px-5 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  to="/patient/history"
                  className="flex-1 inline-flex justify-center items-center px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  View Appointment History
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BookingSuccess;
