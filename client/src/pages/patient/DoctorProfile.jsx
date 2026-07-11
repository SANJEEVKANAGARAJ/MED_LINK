import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { patientApi } from '../../api/patient';
import { User, Star, MapPin, Clock, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SkeletonCard } from '../../components/ui/Skeleton';

const DoctorProfile = () => {
  const { doctorId } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const navigation = [
    { name: 'Dashboard', href: '/patient/dashboard' },
    { name: 'Search Doctors', href: '/patient/doctors' },
    { name: 'Appointment History', href: '/patient/history' },
  ];

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const res = await patientApi.getDoctorById(doctorId);
        setDoctor(res.data.data);
      } catch {
        setError('Failed to load doctor profile');
        toast.error('Failed to load doctor profile');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoctor();
  }, [doctorId]);

  return (
    <DashboardLayout title="Patient Portal" roleColor="emerald" navigation={navigation}>
      <div className="mb-6">
        <Link 
          to="/patient/doctors"
          className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Search
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-32 bg-emerald-600"></div>
          <div className="px-6 sm:px-10 pb-10">
            <div className="relative flex justify-between items-end -mt-16 mb-6">
              <div className="rounded-full border-4 border-white bg-white shadow-md">
                {doctor.profile_image_url ? (
                  <img src={doctor.profile_image_url} alt="" className="h-32 w-32 rounded-full object-cover" />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-emerald-100 flex items-center justify-center">
                    <User className="h-16 w-16 text-emerald-600" />
                  </div>
                )}
              </div>
              <div>
                <Link
                  to={`/patient/book/${doctor.id}`}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Book Appointment
                </Link>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900">Dr. {doctor.first_name} {doctor.last_name}</h1>
            <p className="text-lg font-medium text-emerald-600 mt-1">{doctor.specialisation}</p>

            <div className="flex flex-wrap items-center mt-4 gap-6 text-sm text-gray-600">
              <span className="flex items-center">
                <Star className="h-5 w-5 text-amber-400 mr-2" fill="currentColor" />
                <span className="font-semibold text-gray-900 mr-1">4.8</span>
                (120 reviews)
              </span>
              <span className="flex items-center">
                <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                Main Clinic Building
              </span>
              <span className="flex items-center">
                <Clock className="h-5 w-5 text-gray-400 mr-2" />
                {doctor.slot_duration_minutes} min consultations
              </span>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">About Dr. {doctor.last_name}</h3>
              <p className="text-gray-600 leading-relaxed">
                Dr. {doctor.first_name} {doctor.last_name} is a highly experienced specialist in {doctor.specialisation}. 
                Dedicated to providing compassionate and comprehensive care, Dr. {doctor.last_name} focuses on evidence-based 
                treatments to ensure the best outcomes for all patients.
              </p>
              
              <div className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-100">
                <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                <p className="text-sm text-gray-600"><strong>Email:</strong> {doctor.email}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DoctorProfile;
