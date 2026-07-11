import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { patientApi } from '../../api/patient';
import { FileText, Stethoscope, Pill, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { SkeletonCard } from '../../components/ui/Skeleton';

const AppointmentHistory = () => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const navigation = [
    { name: 'Dashboard', href: '/patient/dashboard' },
    { name: 'Search Doctors', href: '/patient/doctors' },
    { name: 'Appointment History', href: '/patient/history' },
  ];

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const profileRes = await patientApi.getPatientProfile();
        const patientId = profileRes.data.data.id;
        
        const historyRes = await patientApi.getPatientHistory(patientId);
        setHistory(historyRes.data.data || []);
      } catch {
        toast.error('Failed to load history');
        setError('Failed to load history.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <DashboardLayout title="Patient Portal" roleColor="emerald" navigation={navigation}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Medical History</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review your past appointments, doctor's notes, prescriptions, and AI summaries.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No history found</h3>
          <p className="mt-1 text-sm text-gray-500">You don't have any past appointments yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record) => {
            const isExpanded = expandedId === record.appointment_id;
            const dateObj = new Date(record.appointment_date);
            
            return (
              <div key={record.appointment_id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div 
                  className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(record.appointment_id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-emerald-100 p-3 rounded-full">
                      <Stethoscope className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">Dr. {record.doctor_first_name} {record.doctor_last_name}</h4>
                      <div className="flex items-center text-sm text-gray-500 space-x-4 mt-1">
                        <span className="flex items-center"><Calendar className="h-4 w-4 mr-1" /> {format(dateObj, 'MMMM d, yyyy')}</span>
                        {record.slot_time && (
                          <span className="flex items-center"><Clock className="h-4 w-4 mr-1" /> {record.slot_time.substring(0, 5)}</span>
                        )}
                        <span className="capitalize flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {record.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 py-5 border-t border-gray-200 bg-gray-50">
                    <div className="grid md:grid-cols-2 gap-6">
                      
                      {/* Left Column */}
                      <div className="space-y-6">
                        {record.raw_symptoms && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                              <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                              Symptoms Reported
                            </h5>
                            <p className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
                              {record.raw_symptoms}
                            </p>
                          </div>
                        )}

                        {record.patient_friendly_summary && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                              AI Summary
                            </h5>
                            <div className="text-sm text-gray-700 bg-blue-50 p-4 rounded-lg border border-blue-100 prose prose-sm max-w-none">
                              {record.patient_friendly_summary.split('\n').map((line, idx) => (
                                <p key={idx} className="mb-2 last:mb-0">{line}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Column */}
                      <div>
                        {record.prescription_notes ? (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                              <Pill className="h-4 w-4 mr-2 text-emerald-600" />
                              Prescription & Doctor's Notes
                            </h5>
                            <div className="text-sm text-gray-700 bg-white p-4 rounded-lg border border-emerald-100 shadow-inner whitespace-pre-wrap">
                              <p>{record.prescription_notes}</p>
                              {(() => {
                                let meds = record.medications;
                                if (typeof meds === 'string') {
                                  try { meds = JSON.parse(meds); } catch { meds = []; }
                                }
                                if (meds && Array.isArray(meds) && meds.length > 0 && meds[0] !== null) {
                                  return (
                                    <div className="mt-4 border-t border-emerald-100 pt-4">
                                      <h6 className="font-semibold text-emerald-800 mb-2">Prescribed Medications:</h6>
                                      <ul className="list-disc pl-5 space-y-1">
                                        {meds.filter(med => med !== null).map((med, idx) => (
                                          <li key={idx}>
                                            <span className="font-medium">{med.medication_name}</span> - {med.dosage}, {med.frequency} (for {med.duration_days} days)
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic bg-white p-4 rounded border border-gray-200 border-dashed">
                            No prescription notes available for this visit.
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AppointmentHistory;
