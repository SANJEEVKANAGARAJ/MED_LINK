import React from 'react';

export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold text-slate-900 mb-8">Terms of Service</h1>
      
      <div className="prose prose-slate lg:prose-lg text-slate-600">
        <p className="mb-4">By accessing or using the Healthcare Appointment Manager, you agree to be bound by these Terms of Service.</p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Appointment Booking & Holds</h2>
        <p className="mb-4">
          When you initiate a booking, the selected time slot is temporarily held to prevent concurrent bookings. If the booking is not confirmed within the timeout period, the hold will automatically expire and the slot will be released back.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Cancellations and Rescheduling</h2>
        <p className="mb-4">
          Appointments may be cancelled or rescheduled via the platform. If a doctor marks a day as unavailable (Leave), any conflicting appointments will be subject to our automated cancellation/rescheduling protocol, and you will be notified.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. Medical Disclaimer</h2>
        <p className="mb-4">
          The AI-generated pre-visit and post-visit summaries are intended to assist communication and should not be construed as definitive medical diagnoses. Always consult your healthcare provider for medical advice.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Account Responsibilities</h2>
        <p className="mb-4">
          You are responsible for maintaining the confidentiality of your account credentials. You must immediately notify us of any unauthorized use of your account.
        </p>
      </div>
    </div>
  );
}
