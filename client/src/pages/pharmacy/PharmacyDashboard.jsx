import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pharmacyApi } from '../../api/pharmacy';
import { toast } from 'react-hot-toast';
import {
  Pill, ShoppingBag, PackageCheck, LogOut, Edit2, Check, X,
  Truck, Clock, CircleCheck, Package, ChevronRight,
} from 'lucide-react';

const DELIVERY_STATUSES = ['pending', 'confirmed', 'dispatched', 'out_for_delivery', 'delivered'];

const statusColors = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  confirmed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  dispatched: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  out_for_delivery: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  delivered: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const statusLabel = (s) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const PharmacyDashboard = () => {
  const navigate = useNavigate();
  const [pharmacy, setPharmacy] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('medicines');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [updatingOrder, setUpdatingOrder] = useState(null);

  useEffect(() => {
    const user = localStorage.getItem('pharmacyUser');
    if (!user || !localStorage.getItem('pharmacyToken')) {
      navigate('/pharmacy/login');
      return;
    }
    setPharmacy(JSON.parse(user));
    loadMedicines();
    loadOrders();
  }, []);

  const loadMedicines = async () => {
    try {
      const res = await pharmacyApi.getMedicines();
      setMedicines(res.data.data || []);
    } catch { toast.error('Failed to load medicines'); }
  };

  const loadOrders = async () => {
    try {
      const res = await pharmacyApi.getOrders();
      setOrders(res.data.data || []);
    } catch { toast.error('Failed to load orders'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('pharmacyToken');
    localStorage.removeItem('pharmacyRefreshToken');
    localStorage.removeItem('pharmacyUser');
    navigate('/pharmacy/login');
  };

  const startEdit = (med) => {
    setEditingId(med.id);
    setEditForm({ price_usd: med.price_usd, stock_qty: med.stock_qty });
  };

  const saveEdit = async (id) => {
    try {
      await pharmacyApi.updateMedicine(id, editForm);
      toast.success('Medicine updated!');
      setEditingId(null);
      loadMedicines();
    } catch { toast.error('Update failed'); }
  };

  const updateDelivery = async (orderId, status) => {
    setUpdatingOrder(orderId);
    try {
      await pharmacyApi.updateOrderStatus(orderId, status);
      toast.success('Delivery status updated!');
      loadOrders();
    } catch { toast.error('Update failed'); }
    finally { setUpdatingOrder(null); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950 text-white">
      {/* Sidebar + Header */}
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/80 border-r border-slate-800 flex flex-col">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
                <Pill className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm text-white truncate max-w-[140px]">{pharmacy?.name}</p>
                <p className="text-xs text-slate-400">Pharmacy Portal</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {[
              { id: 'medicines', label: 'Medicines', icon: Pill },
              { id: 'orders', label: 'Orders', icon: ShoppingBag },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === id
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {id === 'orders' && orders.filter(o => o.delivery_status === 'pending').length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {orders.filter(o => o.delivery_status === 'pending').length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="text-xs text-slate-500 mb-2 px-2">{pharmacy?.address}</div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* ── Medicines Tab ── */}
            {activeTab === 'medicines' && (
              <div>
                <h1 className="text-2xl font-bold mb-2">Medicine Inventory</h1>
                <p className="text-slate-400 text-sm mb-6">Edit prices and stock quantities for your medicines.</p>

                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">Medicine</th>
                        <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">Price (USD)</th>
                        <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">Stock</th>
                        <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {medicines.map((med) => (
                        <tr key={med.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
                                <Pill className="h-4 w-4 text-violet-400" />
                              </div>
                              <span className="font-medium text-sm">{med.medicine_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {editingId === med.id ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.price_usd}
                                onChange={e => setEditForm(p => ({ ...p, price_usd: e.target.value }))}
                                className="bg-slate-800 border border-violet-500 text-white rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none"
                              />
                            ) : (
                              <span className="text-emerald-400 font-semibold">${parseFloat(med.price_usd).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingId === med.id ? (
                              <input
                                type="number"
                                value={editForm.stock_qty}
                                onChange={e => setEditForm(p => ({ ...p, stock_qty: e.target.value }))}
                                className="bg-slate-800 border border-violet-500 text-white rounded-lg px-3 py-1.5 text-sm w-20 focus:outline-none"
                              />
                            ) : (
                              <span className={`text-sm font-medium ${med.stock_qty < 10 ? 'text-red-400' : 'text-slate-300'}`}>
                                {med.stock_qty} units
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {editingId === med.id ? (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => saveEdit(med.id)} className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors">
                                  <Check className="h-4 w-4" />
                                </button>
                                <button onClick={() => setEditingId(null)} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => startEdit(med)} className="p-2 text-slate-400 hover:text-violet-400 hover:bg-slate-800 rounded-lg transition-colors">
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Orders Tab ── */}
            {activeTab === 'orders' && (
              <div>
                <h1 className="text-2xl font-bold mb-2">Customer Orders</h1>
                <p className="text-slate-400 text-sm mb-6">Update delivery status for each order.</p>

                {orders.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <Package className="mx-auto h-12 w-12 mb-3 opacity-40" />
                    <p>No orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map(order => (
                      <div key={order.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-white">{order.medicine_name}</span>
                              <span className="text-xs text-slate-400">× {order.qty}</span>
                            </div>
                            <p className="text-sm text-slate-400">
                              Patient: <span className="text-slate-300">{order.patient_name}</span>
                              &nbsp;·&nbsp; ${parseFloat(order.total_price_usd).toFixed(2)}
                            </p>
                            {order.shipping_address && (
                              <p className="text-xs text-slate-500 mt-1">📍 {order.shipping_address}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusColors[order.delivery_status] || ''}`}>
                              {statusLabel(order.delivery_status)}
                            </span>
                            {order.payment_status === 'paid' && order.delivery_status !== 'delivered' && (
                              <select
                                value={order.delivery_status}
                                onChange={e => updateDelivery(order.id, e.target.value)}
                                disabled={updatingOrder === order.id}
                                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                              >
                                {DELIVERY_STATUSES.map(s => (
                                  <option key={s} value={s}>{statusLabel(s)}</option>
                                ))}
                              </select>
                            )}
                            {order.payment_status !== 'paid' && (
                              <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-full">
                                Awaiting Payment
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PharmacyDashboard;
