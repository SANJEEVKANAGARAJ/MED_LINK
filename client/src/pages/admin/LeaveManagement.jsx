import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api/admin';
import { AlertCircle, Trash2, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SkeletonRow } from '../../components/ui/Skeleton';

const LeaveManagement = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [leaveDate, setLeaveDate] = useState('');
  const [leaves, setLeaves] = useState([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard' },
    { name: 'Manage Doctors', href: '/admin/doctors' },
    { name: 'Leave Management', href: '/admin/leave' },
  ];

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await adminApi.getAllDoctors();
        setDoctors(res.data.data?.data || []);
      } catch {
        toast.error('Failed to load doctors list');
        setError('Failed to load doctors list');
      } finally {
        setIsLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctorId) {
      fetchLeaves(selectedDoctorId);
    } else {
      setLeaves([]);
    }
  }, [selectedDoctorId]);

  const fetchLeaves = async (doctorId) => {
    setIsLoadingLeaves(true);
    setError('');
    try {
      const res = await adminApi.getDoctorLeave(doctorId);
      setLeaves(res.data.data);
    } catch {
      toast.error('Failed to fetch doctor leaves');
      setError('Failed to fetch doctor leaves');
    } finally {
      setIsLoadingLeaves(false);
    }
  };

  const handleAddLeave = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId || !leaveDate) return;

    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
      await adminApi.addDoctorLeave(selectedDoctorId, { leave_date: leaveDate });
      toast.success('Leave marked successfully');
      setLeaveDate('');
      fetchLeaves(selectedDoctorId);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add leave';
      toast.error(msg);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveLeave = async (date) => {
    if (!window.confirm('Are you sure you want to remove this leave date?')) return;
    
    setError('');
    setMessage('');
    try {
      const isoDate = new Date(date).toISOString().split('T')[0];
      await adminApi.removeDoctorLeave(selectedDoctorId, isoDate);
      toast.success('Leave removed successfully');
      fetchLeaves(selectedDoctorId);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove leave';
      toast.error(msg);
      setError(msg);
    }
  };

  return (
    <DashboardLayout title="Admin Portal" roleColor="indigo" navigation={navigation}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
        <p className="mt-1 text-sm text-gray-500">
          Mark leave dates for doctors. This will automatically cancel any existing appointments on that date.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-green-700">{message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6 col-span-1">
          <form onSubmit={handleAddLeave} className="space-y-4">
            <div>
              <label htmlFor="doctor" className="block text-sm font-medium text-gray-700">Select Doctor</label>
              <select
                id="doctor"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                disabled={isLoadingDoctors}
              >
                <option value="">-- Choose a doctor --</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    Dr. {doctor.first_name} {doctor.last_name} ({doctor.specialisation})
                  </option>
                ))}
              </select>
            </div>

            {selectedDoctorId && (
              <div>
                <label htmlFor="leaveDate" className="block text-sm font-medium text-gray-700">Leave Date</label>
                <input
                  type="date"
                  id="leaveDate"
                  value={leaveDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                  required
                />
              </div>
            )}

            {selectedDoctorId && (
              <button
                type="submit"
                disabled={isSubmitting || !leaveDate}
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'Mark Leave'}
              </button>
            )}
          </form>
        </div>

        {/* Leaves List Section */}
        <div className="bg-white shadow sm:rounded-lg col-span-2 overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Upcoming Leave Dates</h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            {!selectedDoctorId ? (
              <p className="text-sm text-gray-500 text-center py-4">Select a doctor to view their leave schedule.</p>
            ) : isLoadingLeaves ? (
              <table className="min-w-full">
                <tbody>
                  <tr>
                    <td colSpan="2" className="p-0">
                      <SkeletonRow columns={2} />
                      <SkeletonRow columns={2} />
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : leaves.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No leave dates found for this doctor.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {leaves.map((leave) => {
                  const leaveDateStr = new Date(leave.leave_date).toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  });
                  return (
                    <li key={leave.id} className="py-4 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {leaveDateStr}
                      </span>
                      <button 
                        onClick={() => handleRemoveLeave(leave.leave_date)}
                        className="text-red-600 hover:text-red-900 flex items-center text-sm"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LeaveManagement;
