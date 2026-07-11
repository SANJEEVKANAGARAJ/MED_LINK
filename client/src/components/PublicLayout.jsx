import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PublicLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };
  
  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'doctor') return '/doctor/dashboard';
    return '/patient/dashboard';
  };

  return (
    <div className="bg-slate-50 text-slate-900 font-sans min-h-screen selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden flex flex-col">
      <nav className="bg-white/80 backdrop-blur-xl w-full top-0 sticky shadow-sm z-50">
        <div className="flex justify-between items-center w-full px-6 md:px-12 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-bold text-xl shadow-lg">
              HM
            </div>
            <span className="font-bold text-xl text-emerald-800">Healthcare Manager</span>
          </div>
          
          <div className="hidden lg:flex items-center gap-6">
            <Link className="text-slate-600 hover:text-emerald-600 transition-colors font-medium text-sm" to="/product">Product</Link>
            <Link className="text-slate-600 hover:text-emerald-600 transition-colors font-medium text-sm" to="/features">Features</Link>
            <Link className="text-slate-600 hover:text-emerald-600 transition-colors font-medium text-sm" to="/security">Security</Link>
            <Link className="text-slate-600 hover:text-emerald-600 transition-colors font-medium text-sm" to="/privacy">Privacy Policy</Link>
            <Link className="text-slate-600 hover:text-emerald-600 transition-colors font-medium text-sm" to="/terms">Terms of Service</Link>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link to={getDashboardLink()} className="font-semibold text-slate-600 hover:text-emerald-600 transition-colors px-3 py-2">
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="font-semibold bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="font-semibold text-slate-600 hover:text-emerald-600 transition-colors px-3 py-2">
                  Login
                </Link>
                <Link to="/register" className="font-semibold bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                  Register
                </Link>
              </>
            )}
          </div>

          <button 
            className="lg:hidden p-2 text-slate-600 hover:text-emerald-600 transition-colors" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              )}
            </svg>
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 absolute w-full shadow-lg left-0 top-full">
            <div className="flex flex-col px-6 py-4 space-y-4">
              <Link className="text-slate-600 hover:text-emerald-600 font-medium" to="/product" onClick={() => setIsMobileMenuOpen(false)}>Product</Link>
              <Link className="text-slate-600 hover:text-emerald-600 font-medium" to="/features" onClick={() => setIsMobileMenuOpen(false)}>Features</Link>
              <Link className="text-slate-600 hover:text-emerald-600 font-medium" to="/security" onClick={() => setIsMobileMenuOpen(false)}>Security</Link>
              <Link className="text-slate-600 hover:text-emerald-600 font-medium" to="/privacy" onClick={() => setIsMobileMenuOpen(false)}>Privacy Policy</Link>
              <Link className="text-slate-600 hover:text-emerald-600 font-medium" to="/terms" onClick={() => setIsMobileMenuOpen(false)}>Terms of Service</Link>
              
              <hr className="border-slate-100 my-2" />
              
              {isAuthenticated ? (
                <>
                  <Link to={getDashboardLink()} className="font-semibold text-slate-600 hover:text-emerald-600" onClick={() => setIsMobileMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <button onClick={handleLogout} className="font-semibold text-emerald-600 hover:text-emerald-700 text-left w-full">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="font-semibold text-slate-600 hover:text-emerald-600" onClick={() => setIsMobileMenuOpen(false)}>
                    Login
                  </Link>
                  <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700" onClick={() => setIsMobileMenuOpen(false)}>
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <div className="flex-1">
        <Outlet />
      </div>

      <footer className="bg-white border-t border-slate-200 w-full py-12 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
             <div className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-bold text-xs shadow-sm">
              HM
            </div>
            <span className="font-bold text-lg text-emerald-800">Healthcare Manager</span>
          </div>
          
          <p className="text-sm text-slate-400">
            © 2026 Healthcare Manager. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
