import React from 'react';

export default function Features() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold text-slate-900 mb-8">Platform Features</h1>
      
      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-bold text-emerald-700 border-b border-slate-200 pb-2 mb-4">Slot Booking System (Critical Path)</h2>
          <p className="text-slate-600 mb-4">Our booking engine is engineered for high-concurrency environments to absolutely prevent scheduling conflicts.</p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li><strong>Double-Booking Prevention:</strong> Enforced by strict database unique constraints on doctor, date, and slot time.</li>
            <li><strong>Race Condition Protection:</strong> Utilizes pessimistic row locking during the booking transaction.</li>
            <li><strong>Temporary Slot Holds:</strong> When a patient selects a slot, it is temporarily locked with an expiry timestamp.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-emerald-700 border-b border-slate-200 pb-2 mb-4">AI / LLM Integration</h2>
          <p className="text-slate-600 mb-4">We leverage advanced Large Language Models to improve communication between doctors and patients.</p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li><strong>Pre-Visit Summary:</strong> Analyzes patient-submitted symptoms to determine urgency (Low/Medium/High), chief complaint, and suggested questions for the doctor.</li>
            <li><strong>Post-Visit Summary:</strong> Translates complex clinical notes into patient-friendly explanations with clear schedules.</li>
            <li><strong>Resilience:</strong> Implements exponential backoff and retry logic to ensure app never crashes due to LLM API timeouts.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-emerald-700 border-b border-slate-200 pb-2 mb-4">Smart Leave Management</h2>
          <p className="text-slate-600 mb-4">When a doctor is marked unavailable, the system automatically detects conflicting appointments, initiates cancellations, and immediately notifies affected patients via email.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-emerald-700 border-b border-slate-200 pb-2 mb-4">Google Calendar Integration</h2>
          <p className="text-slate-600 mb-4">Supports OAuth 2.0 flow for seamless integration with user calendars.</p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Automatically creates calendar events for both parties upon booking.</li>
            <li>Updates events dynamically upon rescheduling.</li>
            <li>Removes events upon appointment cancellation.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-emerald-700 border-b border-slate-200 pb-2 mb-4">Medication Reminders & Notifications</h2>
          <p className="text-slate-600 mb-4">Dedicated background workers process prescription frequencies to generate and send timely medication reminders. The email system includes robust retry queues and dead-letter handling for permanent failures.</p>
        </section>
      </div>
    </div>
  );
}
