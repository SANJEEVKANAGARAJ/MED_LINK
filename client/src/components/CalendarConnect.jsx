import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Calendar, CheckCircle, XCircle } from 'lucide-react';
import { calendarApi } from '../api/calendar';

const CalendarConnect = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const syncStatus = searchParams.get('calendarSync');
    if (syncStatus) {
      if (syncStatus === 'success') {
        toast.success('Google Calendar connected successfully!');
      } else {
        toast.error('Failed to connect Google Calendar. Please try again.');
      }
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('calendarSync');
      setSearchParams(newParams, { replace: true });
    }

    checkStatus();
  }, [searchParams, setSearchParams]);

  const checkStatus = async () => {
    try {
      setIsLoading(true);
      const res = await calendarApi.getStatus();
      setIsConnected(res.data?.connected || false);
    } catch (error) {
      console.error('Failed to check calendar status', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await calendarApi.getAuthUrl();
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch {
      toast.error('Failed to generate connection URL');
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Google Calendar? Future appointments will not be synced.')) {
      return;
    }
    
    try {
      setIsLoading(true);
      await calendarApi.disconnect();
      setIsConnected(false);
      toast.success('Google Calendar disconnected');
    } catch {
      toast.error('Failed to disconnect calendar');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg h-10 w-48"></div>
    );
  }

  return (
    <div className="flex items-center">
      {isConnected ? (
        <div className="flex items-center space-x-3">
          <div className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200">
            <CheckCircle className="h-4 w-4 mr-2" />
            Calendar Connected
          </div>
          <button
            onClick={handleDisconnect}
            className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline flex items-center transition-colors"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Calendar className="h-4 w-4 mr-2 text-blue-600" />
          Connect Google Calendar
        </button>
      )}
    </div>
  );
};

export default CalendarConnect;
