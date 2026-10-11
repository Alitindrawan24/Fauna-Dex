'use client';

import { useEffect, useState } from 'react';

export default function StatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-sm bg-black/40 border border-white/10">
      <span
        className={`w-2 h-2 rounded-full ${
          isOnline ? 'bg-green-400 animate-pulse-dot' : 'bg-red-500'
        }`}
      />
      <span
        className={`text-[9px] font-pixel tracking-widest uppercase ${
          isOnline ? 'text-green-400' : 'text-red-400'
        }`}
      >
        {isOnline ? 'ONLINE' : 'OFFLINE'}
      </span>
    </div>
  );
}
