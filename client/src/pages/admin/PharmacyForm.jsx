import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { adminApi } from '../../api/admin';
import { AlertCircle, ArrowLeft, Pill, Edit2, Check, X, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PharmacyForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [activeTab, setActiveTab] = useState('details');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Pharmacy details state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    phone: '',
  });

  // Medicines state
  const [medicines, setMedicines] = useState([]);
  const [editingMedId, setEditingMedId] = useState(null);
  const [editMedForm, setEditMedForm] = useState({ price_usd: 0, stock_qty: 0 });

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard' },
    { name: 'Manage Doctors', href: '/admin/doctors' },
    { name: 'Manage Pharmacies', href: '/admin/pharmacies' },
    { name: 'Leave Management', href: '/admin/leave' },
  ];

  useEffect(() => {
    if (isEditing) {
      fetchPharmacyDetails();
    }
  }, [id]);

  const fetchPharmacyDetails = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getAllPharmacies();
      const current = res.data?.data?.find(p => String(p.id) === String(id));
      if (current) {
        setFormData({
          name: current.name || '',
          email: current.email || '',
          address: current.address || '',
          phone: current.phone || '',
        });
      } else {
        setError('Pharmacy not found');
      }

      // Fetch medicines for inventory tab
      const medsRes = await adminApi.getPharmacyMedicines(id);
      setMedicines(medsRes.data?.data || []);
    } catch (err) {
      setError('Failed to fetch details');
      toast.error('Failed to load pharmacy details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('Name and Email are required');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing) {
        await adminApi.updatePharmacy(id, formData);
        toast.success('Pharmacy details updated successfully');
      } else {
        await adminApi.createPharmacy(formData);
        toast.success('Pharmacy registered successfully (with 10 seeded medicines)');
        navigate('/admin/pharmacies');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Operation failed';
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditMed = (med) => {
    setEditingMedId(med.id);
    setEditMedForm({ price_usd: med.price_usd, stock_qty: med.stock_qty });
  };

  const cancelEditMed = () => {
    setEditingMedId(null);
  };

  const handleSaveMed = async (medId) => {
    try {
      const priceVal = parseFloat(editMedForm.price_usd);
      const stockVal = parseInt(editMedForm.stock_qty, 10);

      if (isNaN(priceVal) || priceVal < 0) {
        toast.error('Please enter a valid price');
        return;
      }
      if (isNaN(stockVal) || stockVal < 0) {
        toast.error('Please enter a valid stock level');
        return;
      }

      await adminApi.updatePharmacyMedicine(id, medId, {
        price_usd: priceVal.toFixed(2),
        stock_qty: stockVal,
      });

      toast.success('Medicine inventory updated');
      setEditingMedId(null);
      
      // Reload medicines
      const medsRes = await adminApi.getPharmacyMedicines(id);
      setMedicines(medsRes.data?.data || []);
    } catch {
      toast.error('Failed to update medicine inventory');
    }
  };

  return (
    <DashboardLayout title="Admin Portal" roleColor="indigo" navigation={navigation}>
      <div className="mb-6 flex items-center gap-4">
        <Link to="/admin/pharmacies" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? `Manage Pharmacy: ${formData.name}` : 'Register New Pharmacy'}
          </h2>
          <p className="text-sm text-gray-500">
            {isEditing ? 'Update credentials and fine-tune medicine inventory pricing.' : 'Add a new location. 10 core medicines will be auto-seeded.'}
          </p>
        </div>
      </div>

      {isEditing && (
        <div className="flex gap-2 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'details'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Store Details
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'inventory'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Medicine Inventory
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 flex">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="ml-3 text-sm text-red-700">{error}</p>
        </div>
      )}

      {activeTab === 'details' ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-2xl">
          <form onSubmit={handleSaveDetails} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Pharmacy Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Wellness Pharmacy"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. info@wellness.com"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="e.g. +91 98765 43210"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g. 10 Main Road, Coimbatore"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {!isEditing && (
              <div className="bg-emerald-50 rounded-xl p-4 flex gap-3 border border-emerald-100">
                <Pill className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-800">
                  <span className="font-bold">Auto-Seed:</span> Registering a new pharmacy will automatically populate it with 10 standard medicines (Amoxicillin, Paracetamol, Ibuprofen, etc.) so patients can buy them immediately.
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-150">
              <Link
                to="/admin/pharmacies"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Manage Medicine Inventory</h3>
            <p className="text-sm text-gray-500">Edit the pricing (USD) and available stock quantities for the medicines stocked at this pharmacy.</p>
          </div>

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">Medicine Name</th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Price (USD)</th>
                <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-gray-900">In Stock</th>
                <th scope="col" className="relative py-3 pl-3 pr-6 text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {medicines.map((med) => {
                const isMedEditing = editingMedId === med.id;
                return (
                  <tr key={med.id}>
                    <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Pill className="h-4 w-4 text-emerald-500" />
                        <span>{med.medicine_name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {isMedEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editMedForm.price_usd}
                            onChange={(e) => setEditMedForm(prev => ({ ...prev, price_usd: e.target.value }))}
                            className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ) : (
                        <span className="font-semibold text-gray-900">${parseFloat(med.price_usd).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {isMedEditing ? (
                        <input
                          type="number"
                          value={editMedForm.stock_qty}
                          onChange={(e) => setEditMedForm(prev => ({ ...prev, stock_qty: e.target.value }))}
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                        />
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${med.stock_qty > 10 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {med.stock_qty} available
                        </span>
                      )}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                      {isMedEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSaveMed(med.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded transition-colors"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEditMed}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-1 rounded transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditMed(med)}
                          className="text-indigo-600 hover:text-indigo-900 inline-flex items-center gap-1 text-xs"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit Stock / Price</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PharmacyForm;
