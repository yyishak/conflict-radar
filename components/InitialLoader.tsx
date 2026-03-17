'use client';

import { useEffect, useState } from 'react';

export function InitialLoader({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Simple splash: hide after a short delay
    const timeout = setTimeout(() => setShow(false), 1500);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      {children}
      {show && (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-radar-dark">
          <div className="text-center mb-6 space-y-2">
            <p className="text-[11px] text-gray-500 font-mono uppercase tracking-[0.3em]">
              INITIALISING
            </p>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">
              Conflict <span className="text-radar-red">Radar</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em]">
              Installing dashboard modules...
            </p>
          </div>
          <div className="w-64 h-1.5 bg-radar-panel border border-radar-border overflow-hidden rounded-full relative">
            <div className="absolute inset-y-0 w-1/3 bg-radar-red animate-loader-bar" />
          </div>
          <p className="mt-4 text-[9px] text-gray-600 font-mono uppercase tracking-[0.2em]">
            Loading situational feeds · Air activity · Economic intel
          </p>
        </div>
      )}
    </>
  );
}

