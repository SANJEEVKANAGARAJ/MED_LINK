import React from 'react';

export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
      
      <div className="prose prose-slate lg:prose-lg">
        <p className="text-slate-600">Last updated: July 2026</p>
        
        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Data Collection and Storage</h2>
        <p className="text-slate-600 mb-4">
          We collect essential profile data, appointment history, and clinical notes to facilitate your healthcare experience. All data is stored in our secure, normalized relational database with strict access controls enforcing tenant and role isolation.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. AI and LLM Processing</h2>
        <p className="text-slate-600 mb-4">
          To provide enhanced pre-visit and post-visit summaries, symptom data and clinical notes are processed using advanced Large Language Models (LLMs). This data is transmitted securely and is strictly utilized for the purpose of generating summaries. Fallback mechanisms ensure service continuity without compromising data integrity during processing.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. Google Calendar Integration</h2>
        <p className="text-slate-600 mb-4">
          We offer optional Google Calendar synchronization. If authorized, we use OAuth 2.0 to obtain tokens, which are stored securely. We only request permissions necessary to create, update, and delete appointment events on your calendar. You may disconnect your calendar and revoke these tokens at any time via your dashboard.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Communications</h2>
        <p className="text-slate-600 mb-4">
          Your email address is used exclusively for crucial system notifications, including booking confirmations, cancellation alerts, doctor leave notifications, and medication reminders.
        </p>
      </div>
    </div>
  );
}
