'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Globe from 'react-globe.gl';
import { CATEGORY_CONFIG, type EventCategory } from '@/lib/categories';

interface GlobeMapProps {
  events: any[];
  onEventClick: (event: any) => void;
  view: 'ethiopia' | 'horn' | 'global';
  liteMode?: boolean;
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

// ── Base palette (globe chrome) ───────────────────────────────────────────────
const RED = '#e11d48'; // Ethiopia border + rings

// ── Pre-parse category colours to hex string once at module load ─────────────
const CAT_COLOR: Record<string, string> = {};
for (const [id, cfg] of Object.entries(CATEGORY_CONFIG)) {
  CAT_COLOR[id] = cfg.color;
}
const FALLBACK_COLOR = CATEGORY_CONFIG.General.color;

// ── Stable module-level callbacks (never cause re-renders) ────────────────────
const POLY_SIDE_COLOR    = () => 'rgba(225,29,72,0.04)';
const LABEL_DOT_ORIENT   = () => 'bottom' as const;
const POINT_ALTITUDE     = 0.008;
const POINT_RADIUS       = 0.42;
const RING_PROPAGATION   = 1.8;
const RING_PERIOD        = 1400;
const RING_ALT           = 0.0;

// Land: very dark navy. Ethiopia: slightly elevated + brighter border.
function polyCapColor(f: any) {
  return f.properties?.ADMIN === 'Ethiopia'
    ? 'rgba(14,20,38,0.97)'   // Ethiopia — dark blue-navy
    : 'rgba(6,9,18,0.92)';    // rest of world — near-black navy
}
function polyStrokeColor(f: any) {
  return f.properties?.ADMIN === 'Ethiopia'
    ? RED                      // Ethiopia border — vivid red
    : 'rgba(225,29,72,0.18)'; // other borders — faint red trace
}
function polyAltitude(f: any) {
  return f.properties?.ADMIN === 'Ethiopia' ? 0.003 : 0.001;
}
// Labels: capital in red, others in soft white
function labelColor(d: any) {
  return d.capital ? RED : 'rgba(255,255,255,0.65)';
}
function labelDotRadius(d: any) { return d.capital ? 0.45 : 0.28; }
function labelSize(d: any)      { return d.size; }
function ringMaxRadius(d: any)  {
  return Math.max(1.5, Math.min((d.current_score || 4) * 0.55, 7));
}
// Event dot: colour by category
function pointColor(d: any) {
  return CAT_COLOR[d.category] ?? FALLBACK_COLOR;
}

// Ring colour: uses each event's category colour, fades outward (seismic-style)
function ringColor(d: any) {
  const hex = (CAT_COLOR[d.category] ?? FALLBACK_COLOR).replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (t: number) => `rgba(${r},${g},${b},${Math.max(0, 1 - t)})`;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function GlobeMap({ events, onEventClick, view, liteMode = false }: GlobeMapProps) {
  const globeRef   = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims]       = useState({ w: 800, h: 500 });
  const [countries, setCountries] = useState<any>({ features: [] });
  const [ready, setReady]     = useState(false);
  const [satLayer, setSatLayer] = useState(false);

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

  const [motionFactor, setMotionFactor] = useState(1);

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
    // Allow closer inspection of Ethiopia and surrounding region
    ctrl.minDistance   = 60;
    ctrl.maxDistance   = 500;
    ctrl.zoomSpeed     = 0.6;
    ctrl.rotateSpeed   = 0.5;
    ctrl.enableDamping = true;
    ctrl.dampingFactor = 0.12;

    // Respect prefers-reduced-motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMotionFactor(0.5);
    } else {
      setMotionFactor(1);
    }

    setReady(true);
  }, []);

  // Camera presets based on view prop
  useEffect(() => {
    if (!ready) return;
    const g = globeRef.current;
    if (!g) return;

    if (view === 'ethiopia') {
      g.pointOfView({ lat: 9.145, lng: 40.489, altitude: 1.6 }, 1000);
    } else if (view === 'horn') {
      g.pointOfView({ lat: 10, lng: 42, altitude: 2.0 }, 1000);
    } else {
      g.pointOfView({ lat: 20, lng: 15, altitude: 3.0 }, 1000);
    }
  }, [view, ready]);

  // ── Enrich events: attach resolved category colour ───────────────────────────
  const enriched = useMemo(() =>
    events.map(ev => ({
      ...ev,
      _c: CAT_COLOR[ev.category] ?? FALLBACK_COLOR,
    })),
    [events],
  );

  // Build multi-ring indicator per event (seismic-style concentric discs)
  const ringLayers = useMemo(
    () =>
      enriched.flatMap(ev =>
        [0.4, 0.7, 1].map((scale, idx) => ({
          ...ev,
          _ringLayer: idx,
          _ringScale: scale,
        })),
      ),
    [enriched],
  );

  // ── Stable polygon features array ─────────────────────────────────────────
  const polyFeatures = useMemo(() => countries.features, [countries.features]);

  // ── Stable point click handler — doesn't change between renders ───────────
  const handlePointClick = useCallback(
    (point: any) => onEventClick(point),
    [onEventClick],
  );

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#020407] z-[1]">
      <Globe
        ref={globeRef}
        width={dims.w}
        height={dims.h}
        onGlobeReady={onGlobeReady}

        // Satellite layer: NASA GIBS true-colour (free, no auth, global daily)
        // Standard layer: locally served earth textures
        globeImageUrl={
          satLayer
            ? 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&FORMAT=image/jpeg&WIDTH=2048&HEIGHT=1024&CRS=CRS:84&BBOX=-180,-90,180,90&TIME=2024-12-01'
            : liteMode ? '/earth-dark.jpg' : '/earth-night.jpg'
        }
        bumpImageUrl={undefined}
        backgroundImageUrl={undefined}

        // Atmosphere
        showAtmosphere={!liteMode}
        atmosphereColor="#c0142a"
        atmosphereAltitude={0.08}

        // Country polygons
        polygonsData={polyFeatures}
        polygonCapColor={polyCapColor}
        polygonSideColor={POLY_SIDE_COLOR}
        polygonStrokeColor={polyStrokeColor}
        polygonAltitude={polyAltitude}
        polygonsTransitionDuration={0}

        // Event pulse rings
        ringsData={ringLayers}
        ringLat="latitude"
        ringLng="longitude"
        ringColor={ringColor}
        ringMaxRadius={(d: any) => ringMaxRadius(d) * (d._ringScale ?? 1)}
        ringPropagationSpeed={RING_PROPAGATION * motionFactor * (liteMode ? 0.8 : 1)}
        ringRepeatPeriod={RING_PERIOD}
        ringAltitude={RING_ALT}

        // Core dot at centre of every ring indicator
        pointsData={enriched}
        pointLat="latitude"
        pointLng="longitude"
        pointColor={pointColor}
        pointAltitude={POINT_ALTITUDE}
        pointRadius={POINT_RADIUS}
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

      {/* Satellite layer toggle */}
      <button
        type="button"
        onClick={() => setSatLayer(s => !s)}
        className={`absolute bottom-16 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[8px] font-mono uppercase tracking-widest backdrop-blur-sm transition-all ${
          satLayer
            ? 'bg-[#38bdf8]/20 border-[#38bdf8]/60 text-[#38bdf8]'
            : 'bg-black/60 border-white/10 text-gray-400 hover:text-white'
        }`}
        aria-pressed={satLayer}
        aria-label="Toggle Sentinel-2 satellite imagery layer"
      >
        🛰 {satLayer ? 'SAT ON' : 'SAT LAYER'}
      </button>

      {/* Attribution */}
      <div className="absolute bottom-1 left-4 text-[8px] text-gray-600 font-mono uppercase tracking-[0.2em] pointer-events-none">
        {satLayer
          ? 'Satellite imagery: Sentinel Hub · Copernicus / ESA'
          : 'Flight radar: OpenSky Network · AirLabs'}
      </div>

      {/* Category legend */}
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
