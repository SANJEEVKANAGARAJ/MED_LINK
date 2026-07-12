import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api/admin';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Plus, AlertCircle, Pill, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SkeletonRow } from '../../components/ui/Skeleton';

const PharmacyList = () => {
  const [pharmacies, setPharmacies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard' },
    { name: 'Manage Doctors', href: '/admin/doctors' },
    { name: 'Manage Pharmacies', href: '/admin/pharmacies' },
    { name: 'Leave Management', href: '/admin/leave' },
  ];

  const fetchPharmacies = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getAllPharmacies();
      setPharmacies(res.data?.data || []);
    } catch {
      setError('Failed to fetch pharmacies list');
      toast.error('Failed to load pharmacies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPharmacies();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pharmacy? This will remove all its medicine pricing and pending orders.')) return;
    
    try {
      await adminApi.deletePharmacy(id);
      setPharmacies(pharmacies.filter(p => p.id !== id));
      toast.success('Pharmacy deleted successfully');
    } catch {
      toast.error('Failed to delete pharmacy');
    }
  };

  return (
    <DashboardLayout title="Admin Portal" roleColor="indigo" navigation={navigation}>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-xl font-semibold text-gray-900">Manage Pharmacies</h2>
          <p className="mt-2 text-sm text-gray-700">
            A list of all registered pharmacies. Admin can edit their details, manage inventory, and track delivery status.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/admin/pharmacies/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Add Pharmacy
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
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

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Address
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Email / Contact
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Medicines Stocked
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan="5" className="p-0">
                        <SkeletonRow columns={5} />
                        <SkeletonRow columns={5} />
                      </td>
                    </tr>
                  ) : pharmacies.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-center text-gray-500 sm:pl-6">
                        No pharmacies found.
                      </td>
                    </tr>
                  ) : (
                    pharmacies.map((pharmacy) => (
                      <tr key={pharmacy.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          <div className="flex items-center gap-2">
                            <Pill className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                            <span>{pharmacy.name}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1 max-w-xs truncate">
                            <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span>{pharmacy.address || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div>{pharmacy.email}</div>
                          <div className="text-xs text-gray-400">{pharmacy.phone}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            {pharmacy.medicine_count} Medicines
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <Link to={`/admin/pharmacies/${pharmacy.id}/edit`} className="text-indigo-600 hover:text-indigo-900 mr-4 inline-flex items-center gap-1">
                            <Edit className="h-4 w-4" />
                            <span>Manage / Edit</span>
                          </Link>
                          <button onClick={() => handleDelete(pharmacy.id)} className="text-red-600 hover:text-red-900 inline-flex items-center gap-1">
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PharmacyList;
