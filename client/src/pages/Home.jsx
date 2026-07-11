import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import images from '../config/images.json';

export default function Home() {
  useEffect(() => {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-8');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    document.querySelectorAll('.entrance-anim').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const baseAnimClass = "entrance-anim opacity-0 translate-y-8 transition-all duration-700 ease-out";

  return (
    <main>
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className={`${baseAnimClass}`}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
              Modernize Your <span className="text-emerald-600">Medical Practice</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-xl">
              Effortlessly manage appointments and follow-ups with our intelligent medical management suite designed for the precision age.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register" className="bg-emerald-500 text-white font-semibold text-lg px-8 py-4 rounded-xl hover:bg-emerald-600 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2">
                Get Started
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
          </div>
          
          <div className={`${baseAnimClass} delay-150 relative lg:h-[500px]`}>

            <div className="relative rounded-[32px] overflow-hidden shadow-2xl h-full">
              <img alt="Modern Medical Clinic" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 cursor-pointer" src={images.hero_clinic_modern} />
              <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div>
                  <p className="font-bold text-slate-900">Trusted Platform</p>
                  <p className="text-sm text-slate-600">Secure & Reliable Booking</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-20 px-6 md:px-12 bg-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-16 ${baseAnimClass}`}>
            <span className="text-blue-600 font-bold uppercase tracking-widest text-sm">Capabilities</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-3">Precision Practice Management</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
            
            {/* Feature 1: Slot Booking */}
            <div className={`md:col-span-3 lg:col-span-4 bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-500 group ${baseAnimClass} delay-100`}>
              <div className="mb-8 overflow-hidden rounded-2xl aspect-video relative bg-slate-50 flex items-center justify-center">
                <img alt="Secure Booking" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" src={images.feature_security_booking} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Real-time Slot Booking</h3>
              <p className="text-slate-600">
                Transactional booking with pessimistic locking preventing double-booking and race conditions in high-volume environments.
              </p>
            </div>

            {/* Feature 2: AI Summaries */}
            <div className={`md:col-span-3 lg:col-span-8 bg-slate-900 text-white p-8 rounded-3xl hover:shadow-xl transition-all duration-500 flex flex-col md:flex-row gap-8 items-center overflow-hidden relative group ${baseAnimClass} delay-200`}>
              <div className="flex-1 z-10">
                <h3 className="text-3xl font-bold text-white mb-4">AI-Powered Clinical Summaries</h3>
                <p className="text-slate-300 text-lg max-w-md">
                  Pre-visit symptom analysis and post-visit patient-friendly summaries using advanced LLM integration for enhanced care.
                </p>
              </div>
              <div className="w-full md:w-1/2 h-48 md:h-full relative bg-slate-800 rounded-2xl overflow-hidden flex items-center justify-center">
                 <img alt="AI Summaries" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700 opacity-80 mix-blend-screen" src={images.feature_ai_summary} />
              </div>
            </div>

            {/* Feature 3: Smart Leave */}
            <div className={`md:col-span-6 lg:col-span-5 bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-500 group ${baseAnimClass} delay-300`}>
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-blue-100 transition-colors duration-300">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Leave Management</h3>
              <p className="text-slate-600">
                Automatic detection of doctor leave conflicts and proactive patient notifications via automated rescheduling logic.
              </p>
            </div>

            {/* Feature 4: Google Calendar */}
            <div className={`md:col-span-3 lg:col-span-4 bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-500 group ${baseAnimClass} delay-100 flex flex-col items-center text-center`}>
              <div className="w-24 h-24 mb-6 rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center">
                 <img alt="Google Calendar Sync" className="w-20 h-20 object-contain transition-transform group-hover:rotate-6 duration-500" src={images.feature_calendar_sync} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Google Calendar Sync</h3>
              <p className="text-slate-600">
                Seamless OAuth 2.0 integration for two-way synchronization of patient and doctor events.
              </p>
            </div>

            {/* Feature 5: Notifications */}
            <div className={`md:col-span-3 lg:col-span-3 bg-blue-600 text-white p-8 rounded-3xl hover:shadow-xl transition-all duration-500 group ${baseAnimClass} delay-200`}>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8">
                <svg className="w-8 h-8 text-white group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Reliable Notifications</h3>
              <p className="text-blue-100">
                Automated emails and medication reminders powered by robust background workers and retry queues.
              </p>
            </div>

          </div>
        </div>
      </section>

    </main>
  );
}
