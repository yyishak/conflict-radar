'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Globe from 'react-globe.gl';
import { CATEGORY_CONFIG, type EventCategory } from '@/lib/categories';

interface GlobeMapProps {
  events: any[];
  onEventClick: (event: any) => void;
}

// ─── Static data — defined at module level so they're never recreated ──────────

const ETHIOPIA_CITIES = [
  { name: 'Addis Ababa ★', lat: 9.03,  lng: 38.74, size: 0.7,  capital: true  },
  { name: "Mek'ele",        lat: 13.50, lng: 39.48, size: 0.45, capital: false },
  { name: 'Gondar',         lat: 12.61, lng: 37.46, size: 0.45, capital: false },
  { name: 'Bahir Dar',      lat: 11.59, lng: 37.39, size: 0.45, capital: false },
  { name: 'Dire Dawa',      lat: 9.59,  lng: 41.86, size: 0.45, capital: false },
  { name: 'Hawassa',        lat: 7.06,  lng: 38.47, size: 0.45, capital: false },
  { name: 'Adama',          lat: 8.54,  lng: 39.27, size: 0.35, capital: false },
  { name: 'Jimma',          lat: 7.67,  lng: 36.83, size: 0.35, capital: false },
  { name: 'Jijiga',         lat: 9.35,  lng: 42.80, size: 0.35, capital: false },
  { name: 'Dessie',         lat: 11.13, lng: 39.64, size: 0.35, capital: false },
  { name: 'Harar',          lat: 9.31,  lng: 42.12, size: 0.35, capital: false },
  { name: 'Nekemte',        lat: 9.09,  lng: 36.55, size: 0.30, capital: false },
  { name: 'Arba Minch',     lat: 6.04,  lng: 37.55, size: 0.30, capital: false },
  { name: 'Axum',           lat: 14.12, lng: 38.72, size: 0.30, capital: false },
  { name: 'Assosa',         lat: 10.07, lng: 34.53, size: 0.28, capital: false },
  { name: 'Gambela',        lat: 8.25,  lng: 34.59, size: 0.28, capital: false },
  { name: 'Semera',         lat: 11.79, lng: 41.02, size: 0.28, capital: false },
  { name: 'Woldia',         lat: 11.83, lng: 39.60, size: 0.28, capital: false },
  { name: 'Bishoftu',       lat: 8.75,  lng: 38.98, size: 0.28, capital: false },
  { name: 'Debre Markos',   lat: 10.34, lng: 37.73, size: 0.28, capital: false },
];

// ── Pre-parse category colours to { r, g, b } once at module load ─────────────
const CAT_RGB: Record<string, { r: number; g: number; b: number }> = {};
for (const [id, cfg] of Object.entries(CATEGORY_CONFIG)) {
  const hex = cfg.color.replace('#', '');
  CAT_RGB[id] = {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}
// Fallback (General)
const fallbackRgb = CAT_RGB['General'];

// ── Stable module-level callbacks (never cause re-renders) ────────────────────
const POLY_SIDE_COLOR    = () => 'rgba(225,29,72,0.06)';
const LABEL_DOT_ORIENT   = () => 'bottom' as const;
const POINT_ALTITUDE     = 0.008;
const POINT_RADIUS       = 0.38;
const RING_PROPAGATION   = 1.8;
const RING_PERIOD        = 1400;
const RING_ALT           = 0.0;

function polyCapColor(f: any) {
  return f.properties?.ADMIN === 'Ethiopia'
    ? 'rgba(12,18,32,0.92)'
    : 'rgba(6,8,14,0.88)';
}
function polyStrokeColor(f: any) {
  return f.properties?.ADMIN === 'Ethiopia' ? '#e11d48' : 'rgba(225,29,72,0.22)';
}
function polyAltitude(f: any) {
  return f.properties?.ADMIN === 'Ethiopia' ? 0.003 : 0.001;
}
function labelColor(d: any) {
  return d.capital ? '#e11d48' : 'rgba(255,255,255,0.72)';
}
function labelDotRadius(d: any) {
  return d.capital ? 0.45 : 0.28;
}
function labelSize(d: any) { return d.size; }
function ringMaxRadius(d: any) {
  return Math.max(1.5, Math.min((d.current_score || 4) * 0.55, 7));
}
function pointColor(d: any) { return d._c; }

// Ring colour: use pre-parsed RGB stored on the data object — no hex work per frame
function ringColor(d: any) {
  return (t: number) => `rgba(${d._r},${d._g},${d._b},${Math.max(0, 1 - t)})`;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function GlobeMap({ events, onEventClick }: GlobeMapProps) {
  const globeRef   = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims]       = useState({ w: 800, h: 500 });
  const [countries, setCountries] = useState<any>({ features: [] });
  const [ready, setReady]     = useState(false);

  // ── Debounced resize — prevents rebuilding Three.js renderer on every px ───
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(
        () => setDims({ w: el.clientWidth, h: el.clientHeight }),
        120,
      );
    });
    ro.observe(el);
    setDims({ w: el.clientWidth, h: el.clientHeight });
    return () => { ro.disconnect(); clearTimeout(timer); };
  }, []);

  // ── Fetch country boundaries once ─────────────────────────────────────────
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(r => r.json())
      .then(data => setCountries(data))
      .catch(() => {});
  }, []);

  // ── Globe ready handler ───────────────────────────────────────────────────
  const onGlobeReady = useCallback(() => {
    const g = globeRef.current;
    if (!g) return;

    g.pointOfView({ lat: 9.145, lng: 40.489, altitude: 1.6 }, 1400);

    // Cap pixel ratio to avoid 4× workload on Retina/HiDPI displays
    const renderer = g.renderer?.();
    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }

    const ctrl = g.controls();
    ctrl.autoRotate    = false;
    ctrl.enableRotate  = true;
    ctrl.enablePan     = false;
    ctrl.enableZoom    = true;
    ctrl.minDistance   = 120;
    ctrl.maxDistance   = 600;
    ctrl.zoomSpeed     = 0.6;
    ctrl.rotateSpeed   = 0.5;
    ctrl.enableDamping = true;
    ctrl.dampingFactor = 0.12;

    setReady(true);
  }, []);

  // ── Enrich events: inject precomputed RGB + colour string ─────────────────
  // Only runs when `events` reference changes (controlled by parent useMemo)
  const enriched = useMemo(() =>
    events.map(ev => {
      const rgb = CAT_RGB[ev.category] ?? fallbackRgb;
      return {
        ...ev,
        _c: CATEGORY_CONFIG[ev.category as EventCategory]?.color ?? CATEGORY_CONFIG.General.color,
        _r: rgb.r,
        _g: rgb.g,
        _b: rgb.b,
      };
    }),
    [events],
  );

  // ── Stable polygon features array ─────────────────────────────────────────
  const polyFeatures = useMemo(() => countries.features, [countries.features]);

  // ── Stable point click handler — doesn't change between renders ───────────
  const handlePointClick = useCallback(
    (point: any) => onEventClick(point),
    [onEventClick],
  );

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#020407]">
      <Globe
        ref={globeRef}
        width={dims.w}
        height={dims.h}
        onGlobeReady={onGlobeReady}

        // Textures
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"

        // Atmosphere
        showAtmosphere
        atmosphereColor="#c0142a"
        atmosphereAltitude={0.14}

        // Country polygons
        polygonsData={polyFeatures}
        polygonCapColor={polyCapColor}
        polygonSideColor={POLY_SIDE_COLOR}
        polygonStrokeColor={polyStrokeColor}
        polygonAltitude={polyAltitude}
        polygonsTransitionDuration={0}

        // Event pulse rings
        ringsData={enriched}
        ringLat="latitude"
        ringLng="longitude"
        ringColor={ringColor}
        ringMaxRadius={ringMaxRadius}
        ringPropagationSpeed={RING_PROPAGATION}
        ringRepeatPeriod={RING_PERIOD}
        ringAltitude={RING_ALT}

        // Event core points — merged into one mesh for GPU efficiency
        // pointsMerge disabled to keep individual click detection
        pointsData={enriched}
        pointLat="latitude"
        pointLng="longitude"
        pointColor={pointColor}
        pointRadius={POINT_RADIUS}
        pointAltitude={POINT_ALTITUDE}
        pointsMerge={false}
        onPointClick={handlePointClick}

        // City labels
        labelsData={ETHIOPIA_CITIES}
        labelLat="lat"
        labelLng="lng"
        labelText="name"
        labelSize={labelSize}
        labelColor={labelColor}
        labelDotRadius={labelDotRadius}
        labelDotOrientation={LABEL_DOT_ORIENT}
        labelAltitude={0.003}
        labelResolution={2}
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 bg-black/75 border border-radar-border rounded px-3 py-2.5 backdrop-blur-sm pointer-events-none">
        <span className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.18em] mb-0.5">Event Layer</span>
        {(Object.entries(CATEGORY_CONFIG) as [EventCategory, typeof CATEGORY_CONFIG[EventCategory]][]).map(([id, cfg]) => (
          <div key={id} className="flex items-center gap-2">
            <span className="text-[10px] leading-none">{cfg.icon}</span>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color, boxShadow: `0 0 5px ${cfg.color}80` }} />
            <span className="text-[9px] text-gray-400 font-mono uppercase tracking-wide">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Active count badge */}
      {events.length > 0 && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/75 border border-radar-border rounded px-2.5 py-1.5 pointer-events-none backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-radar-red animate-pulse" />
          <span className="text-[9px] font-mono text-radar-red uppercase tracking-widest">
            {events.length} active pulse{events.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Hint */}
      {ready && (
        <div className="absolute bottom-4 right-4 pointer-events-none text-right">
          <div className="text-[8px] text-gray-600 font-mono uppercase tracking-widest">Scroll · Drag</div>
          <div className="text-[8px] text-gray-700 font-mono">Click event for intel</div>
        </div>
      )}

      {/* Loading overlay */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#020407] pointer-events-none z-10">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest animate-pulse">
            Initialising Globe Renderer...
          </span>
        </div>
      )}
    </div>
  );
}
