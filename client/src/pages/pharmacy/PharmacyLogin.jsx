import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { pharmacyApi } from '../../api/pharmacy';
import { toast } from 'react-hot-toast';
import { Pill, Loader2, Eye, EyeOff, ShoppingBag } from 'lucide-react';

const PharmacyLogin = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await pharmacyApi.login(form);
      const { accessToken, refreshToken, pharmacy } = res.data.data;
      localStorage.setItem('pharmacyToken', accessToken);
      localStorage.setItem('pharmacyRefreshToken', refreshToken);
      localStorage.setItem('pharmacyUser', JSON.stringify(pharmacy));
      toast.success(`Welcome, ${pharmacy.name}!`);
      navigate('/pharmacy/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-600 rounded-2xl shadow-lg shadow-violet-500/30 mb-4">
            <Pill className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Pharmacy Portal</h1>
          <p className="text-slate-400 mt-2">Sign in to manage your medicines & orders</p>
        </div>

        {/* Demo credentials box */}
        <div className="bg-violet-900/30 border border-violet-700/50 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-violet-300 uppercase tracking-wider mb-2">Demo Credentials</p>
          <div className="space-y-1 text-xs text-slate-300">
            <p>📧 medicare@pharmacy.com &nbsp;|&nbsp; 🔐 pharmacy123</p>
            <p>📧 apollo@pharmacy.com &nbsp;|&nbsp; 🔐 pharmacy123</p>
            <p>📧 lifecare@pharmacy.com &nbsp;|&nbsp; 🔐 pharmacy123</p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="pharmacy@example.com"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBag className="h-5 w-5" />}
              {loading ? 'Signing in...' : 'Sign In to Portal'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Are you a patient?{' '}
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
            Patient Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default PharmacyLogin;
