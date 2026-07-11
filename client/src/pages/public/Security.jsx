import React from 'react';

export default function Security() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold text-slate-900 mb-8">Security Standards</h1>
      <p className="text-lg text-slate-600 mb-8">
        We prioritize the security and privacy of patient and clinic data. Our infrastructure is hardened according to industry best practices.
      </p>

      <div className="grid gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Authentication & Authorization</h3>
          <p className="text-slate-600 mb-2">We use JWT paired with refresh tokens for session persistence. Passwords are securely hashed using bcrypt.</p>
          <p className="text-slate-600">Strict Role-Based Access Control (RBAC) enforces privileges across three tiers: Admin, Doctor, and Patient.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-2">API Security</h3>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li><strong>Helmet:</strong> HTTP header hardening to protect against common web vulnerabilities.</li>
            <li><strong>CORS:</strong> Strict Cross-Origin Resource Sharing policies to whitelist only allowed origins.</li>
            <li><strong>Rate Limiting:</strong> Per-IP and per-user throttling to mitigate brute-force and DDoS attacks.</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Data Validation & Sanitization</h3>
          <p className="text-slate-600 mb-2">Every piece of incoming data is strictly validated against robust Zod schemas. Malicious content is sanitized.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Injection & XSS Prevention</h3>
          <p className="text-slate-600">We utilize parameterized queries to fundamentally eliminate SQL Injection risks. Cross-Site Scripting (XSS) is prevented through meticulous output encoding and Content Security Policy (CSP) headers.</p>
        </div>
      </div>
    </div>
  );
}
