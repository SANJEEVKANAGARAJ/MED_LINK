import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { patientApi } from '../../api/patient';
import { adminApi } from '../../api/admin';
import { Calendar as CalendarIcon, Clock, ArrowLeft, CheckCircle, Brain, SkipForward } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'react-hot-toast';

const BookingFlow = () => {
  const { doctorId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const isReschedule = searchParams.get('reschedule') === 'true';
  const appId = searchParams.get('appId');

  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  const [isHolding, setIsHolding] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [holdSuccess, setHoldSuccess] = useState(false);
  const [error, setError] = useState('');

  // Step 4: symptoms state
  const [confirmedAppointmentId, setConfirmedAppointmentId] = useState(null);
  const [symptomsText, setSymptomsText] = useState('');
  const [isSubmittingSymptoms, setIsSubmittingSymptoms] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/patient/dashboard' },
    { name: 'Search Doctors', href: '/patient/doctors' },
    { name: 'Appointment History', href: '/patient/history' },
  ];
  
  const nextDates = Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i));

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const res = await adminApi.getDoctorById(doctorId);
        setDoctor(res.data.data);
      } catch {
        toast.error('Failed to load doctor details.');
        setError('Failed to load doctor details.');
      }
    };
    fetchDoctor();
  }, [doctorId]);

  useEffect(() => {
    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      setError('');
      setSelectedSlot(null);
      setHoldSuccess(false);
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

  const handleHold = async () => {
    if (!selectedSlot) return;
    setIsHolding(true);
    setError('');
    
    try {
      await patientApi.holdSlot({
        doctor_id: doctorId,
        appointment_date: selectedDate,
        slot_time: selectedSlot
      });
      setHoldSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to hold this slot. It might be taken.');
      setError(err.response?.data?.message || 'Failed to hold this slot. It might be taken.');
      setSelectedSlot(null);
    } finally {
      setIsHolding(false);
    }
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    setError('');

    try {
      let result;
      if (isReschedule && appId) {
        result = await patientApi.rescheduleAppointment(appId, {
          doctor_id: doctorId,
          appointment_date: selectedDate,
          slot_time: selectedSlot
        });
      } else {
        result = await patientApi.bookAppointment({
          doctor_id: doctorId,
          appointment_date: selectedDate,
          slot_time: selectedSlot
        });
      }
      toast.success('Appointment confirmed!');
      // Move to symptoms step instead of navigating away
      const bookedId = result?.data?.data?.id;
      if (bookedId && !isReschedule) {
        setConfirmedAppointmentId(bookedId);
      } else {
        navigate('/patient/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm booking.');
      setError(err.response?.data?.message || 'Failed to confirm booking.');
    } finally {
      setIsConfirming(false);
    }
  };

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

  // === STEP 4: Symptoms Form ===
  if (confirmedAppointmentId) {
    return (
      <DashboardLayout title="Patient Portal" roleColor="emerald" navigation={navigation}>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex items-center space-x-3">
            <div className="bg-emerald-100 p-3 rounded-full">
              <CheckCircle className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Appointment Confirmed!</h2>
              <p className="text-sm text-gray-500 mt-0.5">Booked with Dr. {doctor?.first_name} {doctor?.last_name} on {format(new Date(selectedDate), 'MMMM d, yyyy')} at {selectedSlot?.substring(0, 5)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
              <div className="flex items-center space-x-3">
                <Brain className="h-6 w-6 text-white" />
                <div>
                  <h3 className="text-lg font-semibold text-white">Step 4: Describe Your Symptoms (Optional)</h3>
                  <p className="text-sm text-indigo-100 mt-0.5">Our AI will analyse your symptoms and create a pre-visit summary for your doctor.</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700 mb-2">
                What symptoms are you experiencing? Describe in as much detail as possible.
              </label>
              <textarea
                id="symptoms"
                rows={6}
                value={symptomsText}
                onChange={(e) => setSymptomsText(e.target.value)}
                placeholder="e.g. I have had a persistent headache and fever (38.5°C) for the last 3 days. I also have a sore throat and feel very tired. The headache is worse in the mornings..."
                className="block w-full border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-3 resize-none"
              />
              <p className="mt-2 text-xs text-gray-400">Your doctor will see this summary before the appointment to prepare better questions for you.</p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSubmitSymptoms}
                  disabled={!symptomsText.trim() || isSubmittingSymptoms}
                  className="flex-1 inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {isSubmittingSymptoms ? 'Submitting...' : 'Submit Symptoms & Get AI Summary'}
                </button>
                <button
                  onClick={() => navigate('/patient/dashboard')}
                  className="flex-1 inline-flex justify-center items-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
                >
                  <SkipForward className="h-4 w-4 mr-2" />
                  Skip for Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Patient Portal" roleColor="emerald" navigation={navigation}>
      <div className="mb-6 flex items-center">
        <button onClick={() => navigate(-1)} className="mr-4 text-gray-500 hover:text-gray-700 transition">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold text-gray-900">
          {isReschedule ? 'Reschedule Appointment' : 'Book Appointment'}
        </h2>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6 max-w-4xl mx-auto">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {doctor && (
          <div className="mb-8 pb-8 border-b border-gray-200 flex items-center">
            <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center border-2 border-emerald-200">
              <span className="text-xl font-bold text-emerald-700">{doctor.first_name[0]}{doctor.last_name[0]}</span>
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-bold text-gray-900">Dr. {doctor.first_name} {doctor.last_name}</h3>
              <p className="text-sm text-gray-500">{doctor.specialisation}</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Column: Date and Slot Selection */}
          <div className={holdSuccess ? 'opacity-50 pointer-events-none' : ''}>
            <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5 text-emerald-600" />
              1. Select Date
            </h4>
            
            <div className="mb-4">
              <input 
                type="date"
                min={format(new Date(), 'yyyy-MM-dd')}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full max-w-sm border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm py-2 px-3 border"
              />
            </div>

            <div className="flex space-x-2 overflow-x-auto pb-4 mb-4">
              {nextDates.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isSelected = dateStr === selectedDate;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex-shrink-0 flex flex-col items-center justify-center p-3 w-16 rounded-lg border transition-colors ${
                      isSelected 
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
                        : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="text-xs font-medium uppercase">{format(date, 'EEE')}</span>
                    <span className="text-lg font-bold">{format(date, 'd')}</span>
                  </button>
                );
              })}
            </div>

            <h4 className="text-lg font-medium text-gray-900 mb-4 mt-8 flex items-center">
              <Clock className="mr-2 h-5 w-5 text-emerald-600" />
              2. Select Time Slot
            </h4>

            {isLoadingSlots ? (
              <p className="text-sm text-gray-500">Loading available times...</p>
            ) : availableSlots.length === 0 ? (
              <div className="bg-gray-50 rounded-md p-4 border border-gray-200 text-center">
                <p className="text-sm text-gray-600">No available slots for this date.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2 px-3 text-sm font-medium rounded-md border transition-colors ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-emerald-500 hover:text-emerald-700'
                      }`}
                    >
                      {slot.substring(0, 5)}
                    </button>
                  );
                })}
              </div>
            )}
            
            <div className="mt-8">
              <button
                onClick={handleHold}
                disabled={!selectedSlot || isHolding}
                className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isHolding ? 'Holding...' : 'Hold Slot to Continue'}
              </button>
              <p className="mt-2 text-xs text-gray-500 text-center">
                You will have 5 minutes to confirm your booking after holding the slot.
              </p>
            </div>
          </div>

          {/* Right Column: Confirmation */}
          <div className={`transition-opacity duration-300 ${holdSuccess ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200 h-full flex flex-col">
              <h4 className="text-lg font-medium text-emerald-900 mb-6 flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-emerald-600" />
                3. Confirm Booking
              </h4>
              
              <div className="flex-grow space-y-4 text-emerald-900">
                <div className="bg-white bg-opacity-60 p-4 rounded-lg">
                  <p className="text-sm text-emerald-700 font-medium mb-1">Doctor</p>
                  <p className="font-semibold">{doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : '...'}</p>
                </div>
                <div className="bg-white bg-opacity-60 p-4 rounded-lg">
                  <p className="text-sm text-emerald-700 font-medium mb-1">Date</p>
                  <p className="font-semibold">{format(new Date(selectedDate), 'MMMM d, yyyy')}</p>
                </div>
                <div className="bg-white bg-opacity-60 p-4 rounded-lg">
                  <p className="text-sm text-emerald-700 font-medium mb-1">Time</p>
                  <p className="font-semibold">{selectedSlot ? selectedSlot.substring(0, 5) : '...'}</p>
                </div>
                {!isReschedule && (
                  <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
                    <p className="text-xs text-indigo-700 flex items-start">
                      <Brain className="h-3.5 w-3.5 mr-1.5 mt-0.5 flex-shrink-0" />
                      After confirming, you'll be able to submit your symptoms for an AI pre-visit summary.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-emerald-200">
                <button
                  onClick={handleConfirm}
                  disabled={!holdSuccess || isConfirming}
                  className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {isConfirming ? 'Confirming...' : (isReschedule ? 'Confirm Reschedule' : 'Confirm Appointment')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BookingFlow;
