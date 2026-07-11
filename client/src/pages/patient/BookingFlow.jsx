import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { patientApi } from '../../api/patient';
import { adminApi } from '../../api/admin';
import { Calendar as CalendarIcon, Clock, ArrowLeft, CheckCircle, Brain, SkipForward, CreditCard, ChevronRight, FileText, AlertTriangle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'react-hot-toast';

/**
 * 4-Step Booking Flow:
 * Step 1: Select Date & Time Slot → Hold Slot
 * Step 2: Describe Symptoms (optional)
 * Step 3: Review Booking Summary & Fee → Pay
 * (After payment, Stripe redirects to /patient/booking/success)
 */
const BookingFlow = () => {
  const { doctorId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isReschedule = searchParams.get('reschedule') === 'true';
  const appId = searchParams.get('appId');

  const navigation = [
    { name: 'Dashboard', href: '/patient/dashboard' },
    { name: 'Search Doctors', href: '/patient/doctors' },
    { name: 'Appointment History', href: '/patient/history' },
  ];

  const CONSULTATION_FEE = 50; // USD — mirrors server CONSULTATION_FEE_USD

  // ── State ──
  const [step, setStep] = useState(1); // 1 | 2 | 3
  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isHolding, setIsHolding] = useState(false);
  const [error, setError] = useState('');

  // Step 2 – Symptoms
  const [symptomsText, setSymptomsText] = useState('');

  // Step 3 – Payment
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Reschedule legacy flow (no payment for reschedule)
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmittingSymptoms, setIsSubmittingSymptoms] = useState(false);
  const [confirmedAppointmentId, setConfirmedAppointmentId] = useState(null);

  const nextDates = Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i));

  // ── Data Fetching ──
  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const res = await adminApi.getDoctorById(doctorId);
        setDoctor(res.data.data);
      } catch {
        toast.error('Failed to load doctor details.');
      }
    };
    fetchDoctor();
  }, [doctorId]);

  useEffect(() => {
    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      setError('');
      setSelectedSlot(null);
      try {
        const res = await patientApi.getAvailableSlots(doctorId, selectedDate);
        setAvailableSlots(res.data.data || []);
      } catch {
        toast.error('Failed to load availability for this date.');
        setError('Failed to load availability for this date.');
      } finally {
        setIsLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [doctorId, selectedDate]);

  // ── Step 1 → 2: Hold slot then proceed ──
  const handleHoldAndContinue = async () => {
    if (!selectedSlot) return;
    setIsHolding(true);
    setError('');
    try {
      await patientApi.holdSlot({ doctor_id: doctorId, appointment_date: selectedDate, slot_time: selectedSlot });
      if (isReschedule) {
        // Reschedule uses the old confirm flow (no payment)
        setStep('reschedule-confirm');
      } else {
        setStep(2);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to hold this slot. It might be taken.');
      setError(err.response?.data?.message || 'Slot unavailable. Please choose another.');
      setSelectedSlot(null);
    } finally {
      setIsHolding(false);
    }
  };

  // ── Reschedule confirm (legacy path, no payment) ──
  const handleRescheduleConfirm = async () => {
    setIsConfirming(true);
    setError('');
    try {
      await patientApi.rescheduleAppointment(appId, { doctor_id: doctorId, appointment_date: selectedDate, slot_time: selectedSlot });
      toast.success('Appointment rescheduled!');
      navigate('/patient/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reschedule.');
      setError(err.response?.data?.message || 'Failed to reschedule.');
    } finally {
      setIsConfirming(false);
    }
  };

  // ── Step 3: Create Stripe session and redirect ──
  const handlePayAndConfirm = async () => {
    setIsRedirecting(true);
    setError('');
    try {
      const res = await patientApi.createPaymentSession({
        doctor_id: doctorId,
        appointment_date: selectedDate,
        slot_time: selectedSlot,
        symptoms_text: symptomsText.trim(),
      });
      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      setIsRedirecting(false);
      const msg = err.response?.data?.message || 'Payment session failed. Please try again.';
      toast.error(msg);
      setError(msg);
    }
  };

  // ── Legacy symptoms submit (kept for reschedule / non-payment path) ──
  const handleSubmitSymptoms = async () => {
    if (!symptomsText.trim()) return;
    setIsSubmittingSymptoms(true);
    try {
      await patientApi.submitSymptoms(confirmedAppointmentId, { symptoms: symptomsText });
      toast.success('Symptoms submitted! AI summary will be ready for your doctor.');
    } catch {
      toast.error('Could not submit symptoms, but your appointment is confirmed.');
    } finally {
      setIsSubmittingSymptoms(false);
      navigate('/patient/dashboard');
    }
  };

  // ── Step Indicator ──
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8 space-x-2">
      {[
        { num: 1, label: 'Select Slot' },
        { num: 2, label: 'Symptoms' },
        { num: 3, label: 'Pay & Confirm' },
      ].map(({ num, label }, idx) => {
        const isActive = step === num;
        const isDone = step > num;
        return (
          <React.Fragment key={num}>
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isActive
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isDone ? <CheckCircle className="h-4 w-4" /> : num}
              </div>
              <span className={`mt-1 text-xs font-medium ${isActive ? 'text-indigo-600' : isDone ? 'text-emerald-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {idx < 2 && (
              <div className={`flex-1 h-0.5 mb-4 mx-1 rounded ${isDone ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── RENDER ──
  return (
    <DashboardLayout title="Patient Portal" roleColor="emerald" navigation={navigation}>
      <div className="mb-6 flex items-center">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
          className="mr-4 text-gray-500 hover:text-gray-700 transition flex items-center space-x-1 text-sm font-medium"
        >
          <ArrowLeft size={18} />
          <span>{step > 1 ? 'Back' : 'Go Back'}</span>
        </button>
        <h2 className="text-2xl font-bold text-gray-900">
          {isReschedule ? 'Reschedule Appointment' : 'Book Appointment'}
        </h2>
      </div>

      {/* Doctor header */}
      {doctor && (
        <div className="max-w-3xl mx-auto mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center space-x-4">
          <div className="h-14 w-14 bg-emerald-100 rounded-full flex items-center justify-center border-2 border-emerald-200 flex-shrink-0">
            <span className="text-lg font-bold text-emerald-700">{doctor.first_name[0]}{doctor.last_name[0]}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Dr. {doctor.first_name} {doctor.last_name}</h3>
            <p className="text-sm text-gray-500 capitalize">{doctor.specialisation}</p>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {!isReschedule && typeof step === 'number' && <StepIndicator />}

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-md flex items-start">
            <AlertTriangle className="h-4 w-4 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ══════════════ STEP 1: Date & Slot ══════════════ */}
        {(step === 1 || step === 'reschedule-confirm') && step === 1 && (
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-5 flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5 text-emerald-600" />
              Select Date
            </h4>

            <div className="mb-5">
              <input
                type="date"
                min={format(new Date(), 'yyyy-MM-dd')}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full max-w-xs border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm py-2.5 px-3 border"
              />
            </div>

            <div className="flex space-x-2 overflow-x-auto pb-3 mb-6">
              {nextDates.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isSelected = dateStr === selectedDate;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex-shrink-0 flex flex-col items-center justify-center p-3 w-16 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md scale-105'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="text-xs font-medium uppercase">{format(date, 'EEE')}</span>
                    <span className="text-lg font-bold">{format(date, 'd')}</span>
                  </button>
                );
              })}
            </div>

            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="mr-2 h-5 w-5 text-emerald-600" />
              Select Time Slot
            </h4>

            {isLoadingSlots ? (
              <p className="text-sm text-gray-500">Loading available times...</p>
            ) : availableSlots.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 text-center">
                <p className="text-sm text-gray-600">No available slots for this date.</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2.5 px-2 text-sm font-medium rounded-lg border-2 transition-all ${
                      selectedSlot === slot
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm scale-105'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-400 hover:text-emerald-700'
                    }`}
                  >
                    {slot.substring(0, 5)}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-8">
              <button
                onClick={handleHoldAndContinue}
                disabled={!selectedSlot || isHolding}
                className="w-full inline-flex justify-center items-center px-5 py-3.5 border border-transparent text-sm font-semibold rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isHolding ? 'Holding Slot...' : (
                  <>Continue to Symptoms <ChevronRight className="ml-1 h-4 w-4" /></>
                )}
              </button>
              <p className="mt-2 text-xs text-gray-400 text-center">
                Slot will be held for 5 minutes while you complete your booking.
              </p>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 2: Symptoms ══════════════ */}
        {step === 2 && (
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
              <div className="flex items-center space-x-3">
                <Brain className="h-6 w-6 text-white" />
                <div>
                  <h3 className="text-lg font-semibold text-white">Describe Your Symptoms</h3>
                  <p className="text-sm text-indigo-100 mt-0.5">Optional — AI will analyse your symptoms so your doctor can prepare before the appointment.</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700 mb-2">
                What symptoms are you experiencing?
              </label>
              <textarea
                id="symptoms"
                rows={6}
                value={symptomsText}
                onChange={(e) => setSymptomsText(e.target.value)}
                placeholder="e.g. I've had a persistent headache and fever (38.5°C) for 3 days. Sore throat, fatigue, and nausea. Headache is worse in the mornings..."
                className="block w-full border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 resize-none"
              />
              <p className="mt-2 text-xs text-gray-400">
                Your doctor sees this before the visit to prepare targeted questions.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setStep(3)}
                  disabled={!symptomsText.trim()}
                  className="flex-1 inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Continue with Symptoms
                  <ChevronRight className="ml-1 h-4 w-4" />
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 inline-flex justify-center items-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <SkipForward className="h-4 w-4 mr-2" />
                  Skip — Go to Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ STEP 3: Review & Pay ══════════════ */}
        {step === 3 && (
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5">
              <div className="flex items-center space-x-3">
                <CreditCard className="h-6 w-6 text-white" />
                <div>
                  <h3 className="text-lg font-semibold text-white">Review & Pay</h3>
                  <p className="text-sm text-slate-300 mt-0.5">Confirm your booking details and complete payment to secure the appointment.</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-5 space-y-4 border border-gray-100">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Booking Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Doctor</p>
                    <p className="font-semibold text-gray-900">
                      {doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : '...'}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{doctor?.specialisation}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Date & Time</p>
                    <p className="font-semibold text-gray-900">{format(new Date(selectedDate), 'MMMM d, yyyy')}</p>
                    <p className="text-xs text-gray-400">{selectedSlot?.substring(0, 5)}</p>
                  </div>
                </div>

                {symptomsText && (
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs text-gray-500 font-medium mb-1 flex items-center">
                      <Brain className="h-3 w-3 mr-1 text-indigo-400" />
                      Symptoms submitted
                    </p>
                    <p className="text-xs text-gray-700 italic bg-indigo-50 p-2 rounded border border-indigo-100 line-clamp-2">
                      "{symptomsText}"
                    </p>
                  </div>
                )}
              </div>

              {/* Fee Breakdown */}
              <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-emerald-600" />
                  Payment Breakdown
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-700">
                    <span>Consultation Fee</span>
                    <span>${CONSULTATION_FEE}.00</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>Platform fee</span>
                    <span>$0.00</span>
                  </div>
                  <div className="border-t border-emerald-200 pt-2 flex justify-between font-bold text-emerald-800 text-base">
                    <span>Total</span>
                    <span>${CONSULTATION_FEE}.00 USD</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-400 flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1 text-emerald-400" />
                  Secured by Stripe · No card data touches our servers
                </p>
              </div>

              {/* Pay Button */}
              <button
                onClick={handlePayAndConfirm}
                disabled={isRedirecting}
                className="w-full inline-flex justify-center items-center px-5 py-4 border border-transparent text-base font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-100"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                {isRedirecting ? 'Redirecting to Stripe...' : `Pay $${CONSULTATION_FEE}.00 & Confirm Appointment`}
              </button>

              <p className="text-center text-xs text-gray-400">
                You'll be redirected to Stripe's secure checkout. Your appointment is only confirmed after payment.
              </p>
            </div>
          </div>
        )}

        {/* ══════════════ RESCHEDULE (legacy, no payment) ══════════════ */}
        {step === 'reschedule-confirm' && (
          <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
            <h4 className="text-lg font-medium text-emerald-900 mb-4 flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-emerald-600" />
              Confirm Reschedule
            </h4>
            <div className="space-y-3 text-sm text-emerald-900 mb-6">
              <div className="bg-white p-3 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">Doctor</p>
                <p className="font-semibold">{doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : '...'}</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">New Date</p>
                <p className="font-semibold">{format(new Date(selectedDate), 'MMMM d, yyyy')} at {selectedSlot?.substring(0, 5)}</p>
              </div>
            </div>
            <button
              onClick={handleRescheduleConfirm}
              disabled={isConfirming}
              className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none disabled:opacity-50 transition-colors"
            >
              {isConfirming ? 'Confirming...' : 'Confirm Reschedule'}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BookingFlow;
