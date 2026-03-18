'use client';

import React from 'react';
import { X, Shield, MapPin, Clock, Info } from 'lucide-react';
import { CATEGORY_CONFIG, type EventCategory } from '@/lib/categories';

interface Event {
  id: string | number;
  latitude: number;
  longitude: number;
  current_score: number;
  category: string;
  text: string;
  source?: string;
  description?: string;
  location?: string;
  created_at?: string;
}

interface EventDetailModalProps {
  event: Event | null;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  if (!event) return null;

  const cfg = CATEGORY_CONFIG[event.category as EventCategory] ?? CATEGORY_CONFIG.General;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-radar-dark border w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
        style={{ borderColor: `${cfg.color}50`, boxShadow: `0 0 40px ${cfg.color}18` }}
      >
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: `${cfg.color}30`, background: `${cfg.color}0d` }}>
          <div className="flex items-center gap-2">
            <cfg.Icon className="w-4 h-4" style={{ color: cfg.color }} />
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }}
            />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Event Intelligence Report</h3>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ml-1"
              style={{ background: `${cfg.color}25`, color: cfg.color, border: `1px solid ${cfg.color}40` }}
            >
              {cfg.label}
            </span>
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
            <div className="p-3 border text-center min-w-[80px]" style={{ borderColor: `${cfg.color}40`, background: `${cfg.color}0d` }}>
              <div className="text-[8px] text-gray-500 font-bold uppercase mb-1">Risk Index</div>
              <div className="text-2xl font-black" style={{ color: cfg.color }}>{(event.current_score ?? 0).toFixed(1)}</div>
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

          <div className="p-4 space-y-3 border" style={{ borderColor: `${cfg.color}20`, background: `${cfg.color}07` }}>
            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              <Info className="w-3 h-3" /> Intelligence Brief
            </div>
            <p className="text-sm text-gray-300 leading-relaxed italic">
              &ldquo;{event.description || 'Intelligence verifying satellite data. Early reports indicate localized tension in the primary observation zone. Security posture adjusted to elevated (Level 4).'}&rdquo;
            </p>
          </div>

          {/* Location map pin */}
          <div className="flex items-center gap-2 px-1 text-[10px] text-gray-500">
            <MapPin className="w-3 h-3" style={{ color: cfg.color }} />
            <span>
              {event.location || 'Ethiopia'} &nbsp;·&nbsp;
              {typeof event.latitude === 'number' ? event.latitude.toFixed(4) : '—'},&nbsp;
              {typeof event.longitude === 'number' ? event.longitude.toFixed(4) : '—'}
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
              style={{ background: cfg.color, color: 'white' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Acknowledge
            </button>
          </div>
        </div>

        {/* Footer accent line */}
        <div className="h-0.5 relative overflow-hidden" style={{ background: `${cfg.color}30` }}>
          <div className="absolute inset-0 w-1/3 animate-scan" style={{ background: cfg.color }} />
        </div>
      </div>
    </div>
  );
}
