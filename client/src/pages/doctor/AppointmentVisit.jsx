import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doctorApi } from '../../api/doctor';
import DashboardLayout from '../../components/DashboardLayout';
import { format } from 'date-fns';
import { ArrowLeft, User, Activity, FileText, CheckCircle, Plus, Trash2, Clock, Calendar, Brain, AlertTriangle } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';

const prescriptionSchema = z.object({
  clinical_notes: z.string().min(1, 'Required'),
  medications: z.array(z.object({
    medication_name: z.string().min(1, 'Required'),
    dosage: z.string().min(1, 'Required'),
    frequency: z.string().min(1, 'Required'),
    duration_days: z.coerce.number().min(1, 'Required')
  })).optional()
});

const urgencyColors = {
  high:   { badge: 'bg-red-100 text-red-800 ring-1 ring-red-200',    dot: 'bg-red-500'    },
  medium: { badge: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200', dot: 'bg-yellow-400' },
  low:    { badge: 'bg-green-100 text-green-800 ring-1 ring-green-200',  dot: 'bg-green-500'  },
};

const AppointmentVisit = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  
  const [appointment, setAppointment] = useState(null);
  const [preVisitSummary, setPreVisitSummary] = useState(null);  // dedicated state for AI summary
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      clinical_notes: '',
      medications: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "medications"
  });

  const navigation = [
    { name: 'Dashboard', href: '/doctor/dashboard' },
  ];

  useEffect(() => {
    const fetchVisitData = async () => {
      try {
        // 1. Find current appointment from doctor's appointment list
        const apptsRes = await doctorApi.getAppointments();
        const appointmentsArray = apptsRes.data.data?.data || [];
        const currentAppt = appointmentsArray.find(a => a.id === appointmentId);
        
        if (!currentAppt) {
          setError('Appointment not found');
          setIsLoading(false);
          return;
        }
        
        setAppointment(currentAppt);

        // 2. Fetch pre-visit symptoms & AI summary directly by appointmentId
        //    This works for ANY status (booked, in-progress, completed)
        try {
          const symptomsRes = await doctorApi.getAppointmentSymptoms(appointmentId);
          const summary = symptomsRes.data.data;
          if (summary && (summary.raw_symptoms || summary.urgency_level)) {
            setPreVisitSummary(summary);
          }
        } catch {
          // No symptoms submitted by patient — not an error, just hide the panel
        }
      } catch (err) {
        if (err.response?.status === 429) {
          setError('Too many requests. Please wait a moment and try again.');
          toast.error('Too many requests, please try again later.');
        } else {
          setError(`Failed to load visit details: ${err.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchVisitData();
  }, [appointmentId]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError('');
    try {
      // 1. Submit Clinical Notes → AI generates Post-Visit Summary
      await doctorApi.submitClinicalNotes(appointmentId, {
        doctor_id: appointment.doctor_id,
        patient_id: appointment.patient_id,
        clinical_notes: data.clinical_notes
      });

      // 2. Submit Prescription (if any medications added)
      if (data.medications && data.medications.length > 0 && data.medications[0].medication_name !== '') {
        await doctorApi.createPrescription(appointmentId, {
          doctorId: appointment.doctor_id,
          patientId: appointment.patient_id,
          clinicalNotes: data.clinical_notes,
          medications: data.medications
        });
      }
      // 3. Mark appointment as complete
      await doctorApi.completeAppointment(appointmentId);

      setSuccess(true);
      toast.success('Visit completed! AI summary sent to patient.');
      setTimeout(() => navigate('/doctor/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete visit');
      setIsSubmitting(false);
    }
  };

  const urgencyKey = preVisitSummary?.urgency_level?.toLowerCase();
  const urgencyStyle = urgencyColors[urgencyKey] || urgencyColors.low;

  return (
    <DashboardLayout title="Doctor Portal" roleColor="blue" navigation={navigation}>
      <div className="mb-6">
        <button 
          onClick={() => navigate('/doctor/dashboard')}
          className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Dashboard
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      ) : error && !appointment ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* ── Left Column: Patient info + Pre-visit AI Summary ── */}
          <div className="w-full lg:w-1/3 space-y-6">

            {/* Patient Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-blue-600 px-6 py-4">
                <h2 className="text-lg font-medium text-white flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Patient Profile
                </h2>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {appointment.patient_first_name} {appointment.patient_last_name}
                </h3>
                <div className="flex flex-col space-y-2 mt-4 text-sm text-gray-600">
                  <span className="flex items-center"><Calendar className="h-4 w-4 mr-2 text-gray-400" /> {format(new Date(appointment.appointment_date), 'MMMM d, yyyy')}</span>
                  <span className="flex items-center"><Clock className="h-4 w-4 mr-2 text-gray-400" /> {appointment.slot_time.substring(0, 5)}</span>
                </div>
              </div>
            </div>

            {/* Pre-Visit AI Summary Card */}
            {preVisitSummary ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <h2 className="text-lg font-medium text-white flex items-center">
                    <Brain className="h-5 w-5 mr-2" />
                    Pre-Visit AI Summary
                  </h2>
                  <p className="text-xs text-indigo-200 mt-0.5">Generated from patient-reported symptoms</p>
                </div>
                <div className="p-6 space-y-4">
                  {/* Urgency Badge */}
                  {preVisitSummary.urgency_level && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Urgency</span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${urgencyStyle.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${urgencyStyle.dot}`}></span>
                        {preVisitSummary.urgency_level}
                      </span>
                    </div>
                  )}

                  {/* Raw Symptoms */}
                  {preVisitSummary.raw_symptoms && (
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Patient Reported Symptoms</span>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                        "{preVisitSummary.raw_symptoms}"
                      </p>
                    </div>
                  )}

                  {/* Chief Complaint */}
                  {preVisitSummary.chief_complaint && (
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Chief Complaint (AI)</span>
                      <p className="text-sm text-gray-900 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                        {preVisitSummary.chief_complaint}
                      </p>
                    </div>
                  )}

                  {/* Suggested Questions */}
                  {preVisitSummary.suggested_questions && (
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">AI Suggested Questions</span>
                      <ul className="space-y-2">
                        {(() => {
                          try {
                            const qs = JSON.parse(preVisitSummary.suggested_questions);
                            return qs.map((q, i) => (
                              <li key={i} className="flex items-start text-sm text-gray-700">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mr-2 mt-0.5">{i + 1}</span>
                                {q}
                              </li>
                            ));
                          } catch {
                            return <li className="text-sm text-gray-700">{preVisitSummary.suggested_questions}</li>;
                          }
                        })()}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* No symptoms submitted */
              <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-6 text-center">
                <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">No Pre-Visit Summary</p>
                <p className="text-xs text-gray-400 mt-1">The patient has not submitted symptoms yet.</p>
              </div>
            )}
          </div>

          {/* ── Right Column: Clinical Notes & Prescription ── */}
          <div className="w-full lg:w-2/3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-500" />
                  Clinical Notes &amp; Prescription
                </h2>
                {success && (
                  <span className="flex items-center text-sm font-medium text-green-600">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Visit Completed
                  </span>
                )}
              </div>
              
              <div className="p-6">
                {error && (
                  <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 flex items-start">
                    <AlertTriangle className="h-4 w-4 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Clinical Notes */}
                  <div>
                    <label htmlFor="clinical_notes" className="block text-sm font-medium text-gray-700">
                      Clinical Notes <span className="text-gray-400 font-normal">(Internal — not shared with patient)</span>
                    </label>
                    <div className="mt-1">
                      <textarea
                        id="clinical_notes"
                        rows={6}
                        className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 border ${errors.clinical_notes ? 'border-red-300' : ''}`}
                        placeholder="Enter diagnosis, observations, and treatment plan. An AI summary in patient-friendly language will be automatically generated and sent to the patient."
                        {...register('clinical_notes')}
                        disabled={success}
                      />
                    </div>
                    {errors.clinical_notes && (
                      <p className="mt-1 text-sm text-red-600">{errors.clinical_notes.message}</p>
                    )}
                    <p className="mt-1.5 text-xs text-indigo-600 flex items-center">
                      <Brain className="h-3 w-3 mr-1" />
                      AI will translate these notes into patient-friendly language upon submission.
                    </p>
                  </div>

                  {/* Medications */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Prescriptions</label>
                      <button
                        type="button"
                        onClick={() => append({ medication_name: '', dosage: '', frequency: '', duration_days: 7 })}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={success}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Medication
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex gap-4 items-start bg-gray-50 p-4 rounded-md border border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-grow">
                            <div>
                              <input
                                type="text"
                                placeholder="Medication Name"
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                {...register(`medications.${index}.medication_name`)}
                                disabled={success}
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                placeholder="Dosage (e.g. 500mg)"
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                {...register(`medications.${index}.dosage`)}
                                disabled={success}
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                placeholder="Frequency (e.g. 2x/day)"
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                {...register(`medications.${index}.frequency`)}
                                disabled={success}
                              />
                            </div>
                            <div>
                              <input
                                type="number"
                                placeholder="Days"
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                {...register(`medications.${index}.duration_days`, { valueAsNumber: true })}
                                disabled={success}
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="mt-1 text-red-500 hover:text-red-700"
                            disabled={success}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-5 border-t border-gray-200 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting || success}
                      className={`inline-flex justify-center items-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        (isSubmitting || success) ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSubmitting ? 'Completing...' : success ? 'Success!' : 'Complete Visit & Generate AI Summary'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AppointmentVisit;
