import React from 'react';

export default function Product() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold text-slate-900 mb-8">Healthcare Appointment Manager</h1>
      <div className="prose prose-slate lg:prose-lg">
        <p className="lead text-xl text-slate-600 mb-8">
          A comprehensive platform designed to streamline medical practice operations, seamlessly connecting patients, doctors, and administrators through a unified interface.
        </p>
        
        <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">Three Dedicated Portals</h2>
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-emerald-700 mb-2">Patient Portal</h3>
            <p className="text-slate-600">Empowers patients to easily search for doctors by specialization, view available time slots, and securely book appointments. Includes a symptom reporting tool that helps prepare doctors before the visit.</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-blue-700 mb-2">Doctor Portal</h3>
            <p className="text-slate-600">Provides doctors with an intuitive dashboard to manage their daily schedule, review AI-generated pre-visit summaries, and submit clinical notes and prescriptions post-visit.</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Admin Portal</h3>
            <p className="text-slate-600">Offers full administrative control over the clinic. Manage doctor profiles, configure working hours and slot durations, and handle doctor leave days with automatic conflict resolution.</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">Core Capabilities</h2>
        <ul className="list-disc pl-6 text-slate-600 space-y-3">
          <li><strong>Intelligent Scheduling:</strong> A robust booking engine that prevents double-booking through database locking.</li>
          <li><strong>AI Integration:</strong> Automatically translates clinical notes into patient-friendly summaries using Large Language Models.</li>
          <li><strong>Automated Communications:</strong> Keeps everyone informed via automated email confirmations, and reminders.</li>
        </ul>
      </div>
    </div>
  );
}
