import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Video, ArrowLeft, Loader2, Star, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { patientApi } from '../../api/patient';
import { doctorApi } from '../../api/doctor';

// ── Star Rating Modal ──────────────────────────────────────────────────────
const RatingModal = ({ appointmentId, onClose }) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { toast.error('Please select a star rating.'); return; }
    setSubmitting(true);
    try {
      await patientApi.submitReview({ appointment_id: appointmentId, rating, comment });
      toast.success('Thank you for your feedback!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Rate Your Consultation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-6">
          How was your video consultation experience? Your feedback helps improve care quality.
        </p>

        {/* Star Rating */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`h-10 w-10 transition-colors ${
                  star <= (hovered || rating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-slate-600'
                }`}
              />
            </button>
          ))}
        </div>
        <p className="text-center text-sm font-medium text-slate-300 mb-6 h-5">
          {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : rating === 5 ? 'Excellent!' : ''}
        </p>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share any additional comments (optional)..."
          rows={3}
          className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-6"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-700 rounded-xl text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit Review
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main TelehealthRoom ────────────────────────────────────────────────────
const TelehealthRoom = () => {
  const { appointmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [jitsiLoaded, setJitsiLoaded] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [statusAllowed, setStatusAllowed] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);

  const containerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  const exitAndNavigate = () => {
    if (user?.role === 'patient') {
      setShowRatingModal(true); // Show rating modal before leaving
    } else {
      navigate('/doctor/dashboard');
    }
  };

  const handleExit = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    exitAndNavigate();
  };

  const handleRatingClose = () => {
    setShowRatingModal(false);
    navigate('/patient/dashboard');
  };

  // 1. Verify telehealth status on mount
  useEffect(() => {
    const verifyStatus = async () => {
      try {
        const api = user?.role === 'doctor' ? doctorApi : patientApi;
        const res = await api.getTelehealthStatus(appointmentId);
        if (res.data?.data?.allowed) {
          setStatusAllowed(true);
        } else {
          setBlockReason(res.data?.data?.reason || 'Access to this room is not allowed at this time.');
        }
      } catch (err) {
        setBlockReason(err.response?.data?.message || 'Failed to verify session details. Please try again.');
      } finally {
        setCheckingStatus(false);
      }
    };
    if (user && appointmentId) verifyStatus();
  }, [user, appointmentId]);

  // 2. Load Jitsi script
  useEffect(() => {
    if (window.JitsiMeetExternalAPI) { setJitsiLoaded(true); return; }
    const script = document.createElement('script');
    script.id = 'jitsi-external-api';
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => setJitsiLoaded(true);
    script.onerror = () => toast.error('Failed to load video conferencing library.');
    document.body.appendChild(script);
    return () => {
      const s = document.getElementById('jitsi-external-api');
      if (s && !window.JitsiMeetExternalAPI) s.remove();
    };
  }, []);

  // 3. Initialize Jitsi
  useEffect(() => {
    if (!jitsiLoaded || !user || !appointmentId || !containerRef.current || checkingStatus || !statusAllowed) return;

    const domain = 'meet.jit.si';
    const displayName = user.role === 'doctor'
      ? `Dr. ${user.first_name || ''} ${user.last_name || ''}`
      : `${user.first_name || ''} ${user.last_name || ''}`;

    try {
      const api = new window.JitsiMeetExternalAPI(domain, {
        roomName: `healthcare-appt-consultation-${appointmentId}`,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        userInfo: { displayName, email: user.email || '' },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#0f172a',
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'desktop', 'fullscreen',
            'hangup', 'chat', 'raisehand', 'videoquality', 'tileview',
            'videobackgroundblur', 'settings', 'shortcuts',
          ],
        },
      });
      jitsiApiRef.current = api;
      api.addEventListener('videoConferenceLeft', handleExit);
      api.addEventListener('readyToClose', handleExit);
    } catch (err) {
      console.error('Jitsi init error', err);
      toast.error('Unable to establish video connection room.');
    }

    return () => {
      if (jitsiApiRef.current) { jitsiApiRef.current.dispose(); jitsiApiRef.current = null; }
    };
  }, [jitsiLoaded, user, appointmentId, checkingStatus, statusAllowed]);

  if (checkingStatus) {
    return (
      <div className="flex flex-col h-screen w-screen bg-slate-950 text-white items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
        <p className="text-sm font-medium text-slate-400">Verifying session permissions...</p>
      </div>
    );
  }

  if (!statusAllowed) {
    return (
      <div className="flex flex-col h-screen w-screen bg-slate-950 text-white items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center">
            <Video className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Access Denied</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{blockReason}</p>
          </div>
          <button
            onClick={() => navigate(user?.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard')}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Rating Modal (patient only, shown after call ends) */}
      {showRatingModal && user?.role === 'patient' && (
        <RatingModal appointmentId={appointmentId} onClose={handleRatingClose} />
      )}

      <div className="flex flex-col h-screen w-screen bg-slate-950 text-white overflow-hidden">
        <header className="flex-none flex justify-between items-center px-6 py-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm md:text-base">Telehealth Consultation Room</h1>
              <p className="text-xs text-slate-400">Secure WebRTC peer-to-peer connection</p>
            </div>
          </div>
          <button
            onClick={handleExit}
            className="inline-flex items-center px-4 py-2 border border-slate-700 rounded-md text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Exit Room
          </button>
        </header>

        <main className="flex-1 relative bg-slate-950 flex items-center justify-center">
          {!jitsiLoaded && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
              <p className="text-sm font-medium text-slate-400">Setting up secure media channels...</p>
            </div>
          )}
          <div ref={containerRef} id="jitsi-container" className="absolute inset-0 h-full w-full" />
        </main>
      </div>
    </>
  );
};

export default TelehealthRoom;
