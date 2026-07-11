import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { patientApi } from '../../api/patient';
import { Search, User, Filter, Star, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SkeletonCard } from '../../components/ui/Skeleton';

const SearchDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialisation, setSelectedSpecialisation] = useState('All');

  const navigation = [
    { name: 'Dashboard', href: '/patient/dashboard' },
    { name: 'Search Doctors', href: '/patient/doctors' },
    { name: 'Appointment History', href: '/patient/history' },
  ];

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await patientApi.getDoctors();
        setDoctors(res.data?.data?.data || []);
      } catch {
        toast.error('Failed to load doctors list');
        setError('Failed to load doctors list');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  const specialisations = useMemo(() => {
    const specs = new Set(doctors.map(d => d.specialisation));
    return ['All', ...Array.from(specs).sort()];
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter(doc => {
      const matchesSearch = `${doc.first_name} ${doc.last_name} ${doc.specialisation}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesSpec = selectedSpecialisation === 'All' || doc.specialisation === selectedSpecialisation;
      return matchesSearch && matchesSpec;
    });
  }, [doctors, searchQuery, selectedSpecialisation]);

  return (
    <DashboardLayout title="Patient Portal" roleColor="emerald" navigation={navigation}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Find a Doctor</h2>
        <p className="mt-1 text-sm text-gray-500">
          Search by name or specialisation to book an appointment.
        </p>
      </div>

      <div className="mb-8 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm shadow-sm transition-colors"
            placeholder="Search doctors by name or specialisation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          <select
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm shadow-sm transition-colors appearance-none"
            value={selectedSpecialisation}
            onChange={(e) => setSelectedSpecialisation(e.target.value)}
          >
            {specialisations.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>
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
      ) : filteredDoctors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
          <User className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No doctors found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {filteredDoctors.map(doctor => (
            <div key={doctor.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {doctor.profile_image_url ? (
                      <img className="h-16 w-16 rounded-full object-cover border-2 border-emerald-100" src={doctor.profile_image_url} alt="" />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-200">
                        <User className="h-8 w-8 text-emerald-600" />
                      </div>
                    )}
                  </div>
                  <div className="ml-5 w-full">
                    <h3 className="text-xl font-bold text-gray-900">Dr. {doctor.first_name} {doctor.last_name}</h3>
                    <p className="text-sm font-medium text-emerald-600 mb-1">{doctor.specialisation}</p>
                    
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <Star className="flex-shrink-0 mr-1.5 h-4 w-4 text-amber-400" fill="currentColor" />
                      <span>4.8 (120 reviews)</span>
                      <span className="mx-2">&bull;</span>
                      <MapPin className="flex-shrink-0 mr-1 h-4 w-4 text-gray-400" />
                      <span>Main Clinic</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <Link
                    to={`/patient/book/${doctor.id}`}
                    className="flex-1 text-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    Book Appointment
                  </Link>
                  <Link
                    to={`/patient/doctors/${doctor.id}`}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default SearchDoctors;
