import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Video, PhoneOff, ArrowLeft, Loader2, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { patientApi } from '../../api/patient';
import { doctorApi } from '../../api/doctor';

const TelehealthRoom = () => {
  const { appointmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [jitsiLoaded, setJitsiLoaded] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [statusAllowed, setStatusAllowed] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  
  const containerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  // Exit back to appropriate dashboard based on user role
  const handleExit = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
    }
    
    if (user?.role === 'doctor') {
      navigate('/doctor/dashboard');
    } else {
      navigate('/patient/dashboard');
    }
  };

  // 1. Fetch telehealth approval & timing window status on mount
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
        console.error('Telehealth access verification failed:', err);
        setBlockReason(err.response?.data?.message || 'Failed to verify session details. Please try again.');
      } finally {
        setCheckingStatus(false);
      }
    };

    if (user && appointmentId) {
      verifyStatus();
    }
  }, [user, appointmentId]);

  // 2. Dynamically load Jitsi External API script
  useEffect(() => {
    const scriptId = 'jitsi-external-api';
    if (window.JitsiMeetExternalAPI) {
      setJitsiLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => setJitsiLoaded(true);
    script.onerror = () => {
      toast.error('Failed to load video conferencing library. Please check your internet connection.');
    };
    document.body.appendChild(script);

    return () => {
      // Clean up script on unmount if it fails or isn't used
      const existingScript = document.getElementById(scriptId);
      if (existingScript && !window.JitsiMeetExternalAPI) {
        existingScript.remove();
      }
    };
  }, []);

  // 3. Initialize Jitsi Meet Iframe (only if approved and within window)
  useEffect(() => {
    if (!jitsiLoaded || !user || !appointmentId || !containerRef.current || checkingStatus || !statusAllowed) return;

    const domain = 'meet.jit.si';
    const displayName = user.role === 'doctor'
      ? `Dr. ${user.first_name || ''} ${user.last_name || ''}`
      : `${user.first_name || ''} ${user.last_name || ''}`;

    const roomName = `healthcare-appt-consultation-${appointmentId}`;

    const options = {
      roomName: roomName,
      width: '100%',
      height: '100%',
      parentNode: containerRef.current,
      userInfo: {
        displayName: displayName,
        email: user.email || ''
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        notificationPlaylists: {
          // Keep it quiet
        }
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_BACKGROUND: '#0f172a', // Slate 900
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'desktop', 'fullscreen', 'factions', 
          'hangup', 'chat', 'raisehand', 'videoquality', 'tileview', 
          'videobackgroundblur', 'settings', 'shortcuts'
        ]
      }
    };

    try {
      const api = new window.JitsiMeetExternalAPI(domain, options);
      jitsiApiRef.current = api;

      // Listen for exit events inside the Jitsi UI
      api.addEventListener('videoConferenceLeft', () => {
        handleExit();
      });

      api.addEventListener('readyToClose', () => {
        handleExit();
      });
    } catch (err) {
      console.error('Failed to initialize Jitsi Meet iframe', err);
      toast.error('Unable to establish video connection room.');
    }

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [jitsiLoaded, user, appointmentId, checkingStatus, statusAllowed]);

  // Loading Screen
  if (checkingStatus) {
    return (
      <div className="flex flex-col h-screen w-screen bg-slate-950 text-white items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
        <p className="text-sm font-medium text-slate-400">Verifying session permissions...</p>
      </div>
    );
  }

  // Access Denied Screen (Strict timing and approval checks)
  if (!statusAllowed) {
    return (
      <div className="flex flex-col h-screen w-screen bg-slate-950 text-white items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center">
            <Video className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Access Denied</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {blockReason}
            </p>
          </div>
          <button
            onClick={handleExit}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Authorized Video Consultation Frame
  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-white overflow-hidden">
      {/* Header bar */}
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

      {/* Embedded Video Area */}
      <main className="flex-1 relative bg-slate-950 flex items-center justify-center">
        {!jitsiLoaded && (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
            <p className="text-sm font-medium text-slate-400">Setting up secure media channels...</p>
          </div>
        )}
        <div 
          ref={containerRef} 
          id="jitsi-container"
          className="absolute inset-0 h-full w-full"
        />
      </main>
    </div>
  );
};

export default TelehealthRoom;
