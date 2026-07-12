import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { patientApi } from '../../api/patient';
import { toast } from 'react-hot-toast';
import {
  Pill, ShoppingCart, Package, Truck, CircleCheck, Clock,
  ChevronDown, ChevronUp, ExternalLink, MapPin, Phone,
  CheckCircle, AlertCircle, Loader2,
} from 'lucide-react';

// ── Delivery Timeline ──────────────────────────────────────────────────────
const TIMELINE_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'dispatched', label: 'Dispatched', icon: Package },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CircleCheck },
];

const statusIndex = (s) => TIMELINE_STEPS.findIndex(t => t.key === s);

const DeliveryTimeline = ({ order }) => {
  const current = statusIndex(order.delivery_status);
  return (
    <div className="mt-4 pt-4 border-t border-gray-150">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Delivery Tracking</p>
      <div className="relative flex items-start gap-0">
        {TIMELINE_STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = i <= current;
          const active = i === current;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {/* connector line */}
              {i < TIMELINE_STEPS.length - 1 && (
                <div className={`absolute top-4 left-1/2 w-full h-0.5 ${done ? 'bg-emerald-500' : 'bg-gray-200'} transition-all`} />
              )}
              <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                done
                  ? 'bg-emerald-600 shadow-lg shadow-emerald-500/30'
                  : 'bg-white border border-gray-300'
              }`}>
                <Icon className={`h-4 w-4 ${done ? 'text-white' : 'text-gray-400'}`} />
              </div>
              <p className={`text-xs mt-2 text-center font-medium ${active ? 'text-emerald-600 animate-pulse' : done ? 'text-gray-800' : 'text-gray-400'}`}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
      {order.tracking_updates?.length > 0 && (
        <div className="mt-4 space-y-1">
          {[...order.tracking_updates].reverse().map((t, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
              <span className="text-emerald-500 mt-0.5">•</span>
              <span>{t.message}</span>
              <span className="ml-auto text-gray-400 whitespace-nowrap">
                {new Date(t.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Address modal ─────────────────────────────────────────────────────────
const AddressModal = ({ medicine, pharmacy, prescriptionId, onClose }) => {
  const [address, setAddress] = useState('');
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    if (!address.trim()) { toast.error('Please enter your delivery address.'); return; }
    setLoading(true);
    try {
      const res = await patientApi.createPharmacyOrderSession({
        pharmacy_id: pharmacy.pharmacy_id,
        medicine_id: pharmacy.medicine_id,
        medicine_name: medicine.medicine_name,
        price_usd: pharmacy.price_usd,
        qty,
        shipping_address: address,
        prescription_id: prescriptionId || '',
      });
      window.location.href = res.data.data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Complete Your Order</h2>
        <p className="text-sm text-gray-500 mb-5">
          {medicine.medicine_name} from <span className="text-emerald-600 font-semibold">{pharmacy.pharmacy_name}</span>
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 border border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Unit Price</span>
            <span className="text-gray-900 font-semibold">${parseFloat(pharmacy.price_usd).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Quantity</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-7 h-7 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg text-gray-700 transition-colors font-bold">−</button>
              <span className="text-gray-900 font-bold w-5 text-center">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="w-7 h-7 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg text-gray-700 transition-colors font-bold">+</button>
            </div>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-1">
            <span className="text-gray-700 font-semibold">Total</span>
            <span className="text-emerald-600 font-extrabold text-base">${(parseFloat(pharmacy.price_usd) * qty).toFixed(2)}</span>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Delivery Address</label>
          <textarea
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Enter your full delivery address..."
            rows={3}
            className="w-full bg-white border border-gray-300 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleBuy}
            disabled={loading}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-emerald-500/20"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            Pay with Stripe
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────
const PharmacyMarketplace = () => {
  const [medicines, setMedicines] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('marketplace');
  const [expandedMed, setExpandedMed] = useState(null);
  const [orderModal, setOrderModal] = useState(null); // { medicine, pharmacy }

  const navigation = [
    { name: 'Dashboard', href: '/patient/dashboard' },
    { name: 'Search Doctors', href: '/patient/doctors' },
    { name: 'Appointment History', href: '/patient/history' },
    { name: 'Pharmacy', href: '/patient/pharmacy' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, oRes] = await Promise.all([
        patientApi.getMarketplace(),
        patientApi.getMyOrders(),
      ]);
      setMedicines(mRes.data.data || []);
      setMyOrders(oRes.data.data || []);
    } catch {
      toast.error('Failed to load marketplace data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-expand matched medicine from doctor's prescription dashboard redirect
  useEffect(() => {
    if (medicines.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const buyMedName = params.get('buy');
      if (buyMedName) {
        const matched = medicines.find(
          m => m.medicine_name.toLowerCase().includes(buyMedName.toLowerCase())
        );
        if (matched) {
          setExpandedMed(matched.medicine_name);
        }
      }
    }
  }, [medicines]);

  // Verify order on redirect from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId) {
      patientApi.verifyPharmacyOrder(sessionId).then(() => {
        toast.success('Payment confirmed! Your order is placed. 🎉');
        window.history.replaceState({}, '', '/patient/pharmacy');
        fetchData();
      }).catch(() => toast.error('Could not verify payment'));
    }
  }, []);

  const statusColors = {
    pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    confirmed: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    dispatched: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    out_for_delivery: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    delivered: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <DashboardLayout title="Patient Portal" roleColor="emerald" navigation={navigation}>
      {orderModal && (
        <AddressModal
          medicine={orderModal.medicine}
          pharmacy={orderModal.pharmacy}
          prescriptionId={orderModal.prescriptionId || new URLSearchParams(window.location.search).get('prescription_id') || ''}
          onClose={() => setOrderModal(null)}
        />
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Pharmacy Marketplace</h2>
        <p className="text-sm text-gray-500 mt-1">Compare medicine prices across 5 pharmacies and order from the cheapest.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {[
          { id: 'marketplace', label: '💊 Buy Medicines' },
          { id: 'orders', label: `📦 My Orders${myOrders.length > 0 ? ` (${myOrders.length})` : ''}` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : activeTab === 'marketplace' ? (
        // ── Marketplace ──
        <div className="space-y-4">
          {medicines.map(med => {
            const cheapest = med.pharmacies[0];
            const isOpen = expandedMed === med.medicine_name;
            return (
              <div key={med.medicine_name} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Medicine header */}
                <div
                  className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedMed(isOpen ? null : med.medicine_name)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Pill className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{med.medicine_name}</h3>
                      <p className="text-xs text-gray-400">
                        {med.pharmacies.length} pharmacies · Cheapest:{' '}
                        <span className="text-emerald-600 font-semibold">${parseFloat(cheapest.price_usd).toFixed(2)}</span>
                        {' '}at {cheapest.pharmacy_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={e => { e.stopPropagation(); setOrderModal({ medicine: med, pharmacy: cheapest }); }}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Buy Cheapest
                    </button>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded pharmacy list */}
                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {med.pharmacies.map((ph, i) => (
                      <div key={ph.pharmacy_id} className={`flex items-center justify-between px-6 py-3 ${i === 0 ? 'bg-emerald-50' : ''}`}>
                        <div className="flex items-center gap-3">
                          {i === 0 && (
                            <span className="text-xs font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">CHEAPEST</span>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{ph.pharmacy_name}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />{ph.address}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`text-base font-bold ${i === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                              ${parseFloat(ph.price_usd).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-400">{ph.stock_qty} in stock</p>
                          </div>
                          <button
                            onClick={() => setOrderModal({ medicine: med, pharmacy: ph })}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                              i === 0
                                ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500'
                                : 'border-gray-300 text-gray-600 hover:border-emerald-500 hover:text-emerald-600'
                            }`}
                          >
                            Order
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // ── My Orders ──
        <div className="space-y-4">
          {myOrders.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package className="mx-auto h-12 w-12 mb-3 opacity-40" />
              <p className="font-medium">No orders yet</p>
              <p className="text-sm mt-1">Buy medicines from the Marketplace tab</p>
            </div>
          ) : (
            myOrders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{order.medicine_name}</h3>
                    <p className="text-sm text-gray-500">
                      From <span className="font-medium text-gray-700">{order.pharmacy_name}</span>
                      &nbsp;·&nbsp; Qty: {order.qty}
                      &nbsp;·&nbsp; <span className="font-semibold text-gray-900">${parseFloat(order.total_price_usd).toFixed(2)}</span>
                    </p>
                    {order.shipping_address && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{order.shipping_address}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusColors[order.delivery_status] || ''}`}>
                      {order.delivery_status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                    {order.payment_status !== 'paid' && (
                      <span className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded-full">
                        Awaiting Payment
                      </span>
                    )}
                  </div>
                </div>
                <DeliveryTimeline order={order} />
              </div>
            ))
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PharmacyMarketplace;
