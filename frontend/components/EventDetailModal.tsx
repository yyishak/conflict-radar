'use client';

import React from 'react';
import { X, Shield, AlertTriangle, MapPin, Clock, Info } from 'lucide-react';

interface Event {
  id: string | number;
  latitude: number;
  longitude: number;
  current_score: number;
  category: string;
  text: string;
  source?: string;
  description?: string;
  created_at?: string;
}

interface EventDetailModalProps {
  event: Event | null;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-radar-dark border border-radar-border w-full max-w-lg overflow-hidden shadow-2xl shadow-radar-red/10 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-4 border-b border-radar-border flex justify-between items-center bg-radar-panel/50">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${event.category === 'Kinetic' ? 'bg-radar-red' : 'bg-radar-orange'}`}></div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Event Intelligence Report</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">
                {event.text}
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                <MapPin className="w-3 h-3 text-radar-red" />
                Coord: {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
              </div>
            </div>
            <div className="bg-radar-panel p-3 border border-radar-border text-center min-w-[80px]">
              <div className="text-[8px] text-gray-500 font-bold uppercase mb-1">Risk Index</div>
              <div className="text-2xl font-black text-radar-red">{event.current_score.toFixed(1)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-radar-panel/30 border border-radar-border p-3 space-y-2">
              <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                <Shield className="w-3 h-3" /> Classification
              </div>
              <p className="text-xs font-bold text-white uppercase">{event.category} Operation</p>
            </div>
            <div className="bg-radar-panel/30 border border-radar-border p-3 space-y-2">
              <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                <Clock className="w-3 h-3" /> Timestamp
              </div>
              <p className="text-xs font-bold text-white uppercase">
                {event.created_at ? new Date(event.created_at).toLocaleString() : 'Recent Activity'}
              </p>
            </div>
          </div>

          <div className="bg-radar-panel/20 border border-radar-border p-4 space-y-3">
            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              <Info className="w-3 h-3" /> Intelligence Brief
            </div>
            <p className="text-sm text-gray-300 leading-relaxed italic">
              "{event.description || 'Intelligence verifying satellite data. Early reports indicate localized tension in the primary observation zone. Security posture adjusted to elevated (Level 4).'}"
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 text-[10px] font-black uppercase tracking-widest bg-white text-black hover:bg-radar-red hover:text-white transition-all cursor-pointer"
            >
              Acknowledge
            </button>
          </div>
        </div>
        
        {/* Footer Scanline */}
        <div className="h-1 bg-radar-red/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-radar-red w-1/3 animate-scan"></div>
        </div>
      </div>
    </div>
  );
}
