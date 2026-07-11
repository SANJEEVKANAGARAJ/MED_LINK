import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams, Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api/admin';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

const baseSchema = z.object({
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  specialisation: z.string().min(2, 'Specialisation is required'),
  slot_duration_minutes: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().int().positive().min(5, 'Minimum 5 minutes')
  )
});

const createSchema = baseSchema.extend({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const updateSchema = baseSchema;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DoctorForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditing);

  const [schedules, setSchedules] = useState(
    DAYS.map((day, index) => ({
      day_of_week: index,
      active: index > 0 && index < 6,
      start_time: '09:00:00',
      end_time: '17:00:00',
    }))
  );

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard' },
    { name: 'Manage Doctors', href: '/admin/doctors' },
    { name: 'Leave Management', href: '/admin/leave' },
  ];

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isEditing ? updateSchema : createSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (isEditing) {
      const fetchDoctorAndAvailability = async () => {
        try {
          const [doctorRes, availRes] = await Promise.all([
            adminApi.getDoctorById(id),
            adminApi.getDoctorAvailability(id)
          ]);
          
          const doctor = doctorRes.data.data;
          setValue('first_name', doctor.first_name);
          setValue('last_name', doctor.last_name);
          setValue('specialisation', doctor.specialisation);
          setValue('slot_duration_minutes', doctor.slot_duration_minutes.toString());

          const fetchedSchedules = availRes.data.data || [];
          setSchedules(prev => prev.map(p => {
            const found = fetchedSchedules.find(f => f.day_of_week === p.day_of_week);
            if (found) {
              return { ...p, active: true, start_time: found.start_time, end_time: found.end_time };
            }
            return { ...p, active: false };
          }));

        } catch {
          toast.error('Failed to load doctor details');
          setApiError('Failed to load doctor details.');
        } finally {
          setIsFetching(false);
        }
      };
      fetchDoctorAndAvailability();
    }
  }, [id, isEditing, setValue]);

  const handleScheduleChange = (index, field, value) => {
    setSchedules(prev => {
      const newSchedules = [...prev];
      newSchedules[index] = { ...newSchedules[index], [field]: value };
      return newSchedules;
    });
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    setApiError('');
    try {
      const finalSchedules = schedules
        .filter(s => s.active)
        .map(s => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time.length === 5 ? s.start_time + ':00' : s.start_time,
          end_time: s.end_time.length === 5 ? s.end_time + ':00' : s.end_time
        }));

      if (finalSchedules.length === 0) {
        setApiError('Doctor must have at least one active working day.');
        setIsLoading(false);
        return;
      }

      let doctorId = id;

      if (isEditing) {
        const updateData = {
          first_name: data.first_name,
          last_name: data.last_name,
          specialisation: data.specialisation,
          slot_duration_minutes: data.slot_duration_minutes,
        };
        await adminApi.updateDoctor(id, updateData);
        toast.success('Doctor updated successfully!');
      } else {
        const newDoctor = await adminApi.createDoctor(data);
        doctorId = newDoctor.data.data.id;
        toast.success('Doctor created successfully!');
      }

      await adminApi.setDoctorAvailability(doctorId, finalSchedules);
      
      navigate('/admin/doctors');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save doctor');
      setApiError(err.response?.data?.message || 'Failed to save doctor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout title="Admin Portal" roleColor="indigo" navigation={navigation}>
      <div className="mb-6 flex items-center">
        <Link to="/admin/doctors" className="mr-4 text-gray-500 hover:text-gray-700 transition">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Doctor' : 'Add New Doctor'}
        </h2>
      </div>

      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6 max-w-4xl mx-auto">
        {isFetching ? (
          <p className="text-gray-500">Loading doctor details...</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {apiError && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{apiError}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">First Name</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="first_name"
                      className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 border px-3 ${errors.first_name ? 'border-red-300' : ''}`}
                      {...register('first_name')}
                    />
                    {errors.first_name && <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">Last Name</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="last_name"
                      className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 border px-3 ${errors.last_name ? 'border-red-300' : ''}`}
                      {...register('last_name')}
                    />
                    {errors.last_name && <p className="mt-1 text-xs text-red-600">{errors.last_name.message}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="specialisation" className="block text-sm font-medium text-gray-700">Specialisation</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="specialisation"
                      className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 border px-3 ${errors.specialisation ? 'border-red-300' : ''}`}
                      {...register('specialisation')}
                    />
                    {errors.specialisation && <p className="mt-1 text-xs text-red-600">{errors.specialisation.message}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="slot_duration_minutes" className="block text-sm font-medium text-gray-700">Slot Duration (Minutes)</label>
                  <div className="mt-1">
                    <input
                      type="number"
                      id="slot_duration_minutes"
                      defaultValue={30}
                      className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 border px-3 ${errors.slot_duration_minutes ? 'border-red-300' : ''}`}
                      {...register('slot_duration_minutes')}
                    />
                    {errors.slot_duration_minutes && <p className="mt-1 text-xs text-red-600">{errors.slot_duration_minutes.message}</p>}
                  </div>
                </div>

                {!isEditing && (
                  <>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                      <div className="mt-1">
                        <input
                          type="email"
                          id="email"
                          className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 border px-3 ${errors.email ? 'border-red-300' : ''}`}
                          {...register('email')}
                        />
                        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                      <div className="mt-1">
                        <input
                          type="password"
                          id="password"
                          className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 border px-3 ${errors.password ? 'border-red-300' : ''}`}
                          {...register('password')}
                        />
                        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Working Hours</h3>
              <div className="space-y-4">
                {schedules.map((schedule, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="flex items-center w-32">
                      <input
                        type="checkbox"
                        id={`day-${index}`}
                        checked={schedule.active}
                        onChange={(e) => handleScheduleChange(index, 'active', e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`day-${index}`} className="ml-2 block text-sm font-medium text-gray-700">
                        {DAYS[index]}
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="time"
                        disabled={!schedule.active}
                        value={schedule.start_time.substring(0, 5)}
                        onChange={(e) => handleScheduleChange(index, 'start_time', e.target.value)}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm border-gray-300 rounded-md py-2 border px-3 disabled:opacity-50"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        disabled={!schedule.active}
                        value={schedule.end_time.substring(0, 5)}
                        onChange={(e) => handleScheduleChange(index, 'end_time', e.target.value)}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm border-gray-300 rounded-md py-2 border px-3 disabled:opacity-50"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-5 border-t border-gray-200">
              <div className="flex justify-end">
                <Link
                  to="/admin/doctors"
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DoctorForm;
