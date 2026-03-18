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

// ── Base palette ──────────────────────────────────────────────────────────────
const RED = '#e11d48';

// ── Pre-parse category colours once at module load ───────────────────────────
const CAT_COLOR: Record<string, string> = {};
for (const [id, cfg] of Object.entries(CATEGORY_CONFIG)) {
  CAT_COLOR[id] = cfg.color;
}
const FALLBACK_COLOR = CATEGORY_CONFIG.General.color;

// ── Stable module-level constants ─────────────────────────────────────────────
const POLY_SIDE_COLOR  = () => 'rgba(225,29,72,0.04)';
const LABEL_DOT_ORIENT = () => 'bottom' as const;
const POINT_ALTITUDE   = 0.008;
const POINT_RADIUS     = 0.42;
const RING_PROPAGATION = 1.8;
const RING_PERIOD      = 1400;
const RING_ALT         = 0.0;

// Camera altitude per view preset
const VIEW_CAMERA = {
  ethiopia: { lat: 9.145,  lng: 40.489, altitude: 1.6 },
  horn:     { lat: 10.0,   lng: 42.0,   altitude: 2.2 },
  global:   { lat: 20.0,   lng: 15.0,   altitude: 3.5 },
};

function polyCapColor(f: any) {
  return f.properties?.ADMIN === 'Ethiopia'
    ? 'rgba(14,20,38,0.97)'
    : 'rgba(6,9,18,0.92)';
}
function polyStrokeColor(f: any) {
  return f.properties?.ADMIN === 'Ethiopia'
    ? RED
    : 'rgba(225,29,72,0.18)';
}
function polyAltitude(f: any) {
  return f.properties?.ADMIN === 'Ethiopia' ? 0.003 : 0.001;
}
function labelColor(d: any) {
  return d.count >= 5 ? RED : 'rgba(255,255,255,0.70)';
}
function labelDotRadius(d: any) { return d.count >= 5 ? 0.45 : 0.28; }
function labelSize(d: any)      { return Math.max(0.28, Math.min(0.7, 0.28 + d.count * 0.04)); }
function ringMaxRadius(d: any)  {
  return Math.max(1.5, Math.min((d.current_score || 4) * 0.55, 7));
}
function pointColor(d: any) {
  return CAT_COLOR[d.category] ?? FALLBACK_COLOR;
}
function ringColor(d: any) {
  const hex = (CAT_COLOR[d.category] ?? FALLBACK_COLOR).replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (t: number) => `rgba(${r},${g},${b},${Math.max(0, 1 - t)})`;
}

export default function GlobeMap({ events, onEventClick, view, liteMode = false }: GlobeMapProps) {
  const globeRef     = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims]         = useState({ w: 800, h: 500 });
  const [countries, setCountries] = useState<any>({ features: [] });
  const [ready, setReady]       = useState(false);
  const [motionFactor, setMotionFactor] = useState(1);

  // ── Debounced resize ──────────────────────────────────────────────────────
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

  // ── Fetch country boundaries once ────────────────────────────────────────
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(r => r.json())
      .then(data => setCountries(data))
      .catch(() => {});
  }, []);

  // ── Globe ready ───────────────────────────────────────────────────────────
  const onGlobeReady = useCallback(() => {
    const g = globeRef.current;
    if (!g) return;

    const cam = VIEW_CAMERA[view] ?? VIEW_CAMERA.ethiopia;
    g.pointOfView(cam, 1400);

    const renderer = g.renderer?.();
    if (renderer) renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const ctrl = g.controls();
    ctrl.autoRotate    = false;
    ctrl.enableRotate  = true;
    ctrl.enablePan     = false;
    ctrl.enableZoom    = true;
    ctrl.zoomSpeed     = 0.6;
    ctrl.rotateSpeed   = 0.5;
    ctrl.enableDamping = true;
    ctrl.dampingFactor = 0.12;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setMotionFactor(0.5);
    }

    setReady(true);
  }, [view]);

  // ── Camera preset on view change ──────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const g = globeRef.current;
    if (!g) return;
    const cam = VIEW_CAMERA[view] ?? VIEW_CAMERA.ethiopia;
    g.pointOfView(cam, 900);
  }, [view, ready]);

  // ── Enrich events ─────────────────────────────────────────────────────────
  const enriched = useMemo(() =>
    events.map(ev => ({
      ...ev,
      _c: CAT_COLOR[ev.category] ?? FALLBACK_COLOR,
    })),
    [events],
  );

  // ── Seismic multi-ring layers ─────────────────────────────────────────────
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

  // ── Dynamic location labels from live events ──────────────────────────────
  const locationLabels = useMemo(() => {
    const map = new Map<string, { name: string; lat: number; lng: number; count: number }>();
    for (const ev of events) {
      if (!ev.latitude || !ev.longitude || !ev.location) continue;
      const key = ev.location.trim();
      if (map.has(key)) {
        map.get(key)!.count += 1;
      } else {
        map.set(key, { name: key, lat: ev.latitude, lng: ev.longitude, count: 1 });
      }
    }
    return [...map.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [events]);

  // ── Legend: only categories present in current events ────────────────────
  const activeCategoryIds = useMemo(
    () => [...new Set(events.map(e => e.category as EventCategory))],
    [events],
  );

  const polyFeatures = useMemo(() => countries.features, [countries.features]);

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

        globeImageUrl={liteMode ? '/earth-dark.jpg' : '/earth-night.jpg'}
        bumpImageUrl={undefined}
        backgroundImageUrl={undefined}

        showAtmosphere={!liteMode}
        atmosphereColor="#c0142a"
        atmosphereAltitude={0.08}

        polygonsData={polyFeatures}
        polygonCapColor={polyCapColor}
        polygonSideColor={POLY_SIDE_COLOR}
        polygonStrokeColor={polyStrokeColor}
        polygonAltitude={polyAltitude}
        polygonsTransitionDuration={0}

        ringsData={ringLayers}
        ringLat="latitude"
        ringLng="longitude"
        ringColor={ringColor}
        ringMaxRadius={(d: any) => ringMaxRadius(d) * (d._ringScale ?? 1)}
        ringPropagationSpeed={RING_PROPAGATION * motionFactor * (liteMode ? 0.8 : 1)}
        ringRepeatPeriod={RING_PERIOD}
        ringAltitude={RING_ALT}

        pointsData={enriched}
        pointLat="latitude"
        pointLng="longitude"
        pointColor={pointColor}
        pointAltitude={POINT_ALTITUDE}
        pointRadius={POINT_RADIUS}
        pointsMerge={false}
        onPointClick={handlePointClick}

        labelsData={locationLabels}
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

      {/* Active event count — top left */}
      {events.length > 0 && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 border border-radar-border rounded px-2 py-1 pointer-events-none backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-radar-red animate-pulse" />
          <span className="text-[9px] font-mono text-radar-red uppercase tracking-widest">
            {events.length} signals
          </span>
        </div>
      )}

      {/* Dynamic legend — only categories with live events */}
      {activeCategoryIds.length > 0 && (
        <div className="absolute bottom-3 left-3 flex flex-col gap-1 bg-black/70 border border-radar-border rounded px-2.5 py-2 backdrop-blur-sm pointer-events-none">
          <span className="text-[8px] text-gray-600 font-mono uppercase tracking-widest mb-0.5">Layer</span>
          {activeCategoryIds.map(id => {
            const cfg = CATEGORY_CONFIG[id];
            if (!cfg) return null;
            return (
              <div key={id} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: cfg.color, boxShadow: `0 0 4px ${cfg.color}90` }}
                />
                <span className="text-[8px] text-gray-400 font-mono">{cfg.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Loading overlay */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#020407] pointer-events-none z-10">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest animate-pulse">
            Initialising Globe...
          </span>
        </div>
      )}
    </div>
  );
}
