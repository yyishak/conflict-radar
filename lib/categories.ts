import {
  Swords, Flame, CloudRain, Plane, Scale, Satellite, Zap,
  Waves, Mountain, Wind,
  type LucideIcon,
} from 'lucide-react';

export const CATEGORY_CONFIG = {
  War: {
    color: '#e11d48',
    bgColor: 'rgba(225,29,72,0.14)',
    label: 'War',
    Icon: Swords,
    desc: 'Armed conflict & battlefield violence',
  },
  Missile: {
    color: '#f97316',
    bgColor: 'rgba(249,115,22,0.14)',
    label: 'Missiles',
    Icon: Flame,
    desc: 'Airstrikes, missile & explosive events',
  },
  Drought: {
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.14)',
    label: 'Drought / Famine',
    Icon: CloudRain,
    desc: 'Drought, famine & humanitarian crises',
  },
  Earthquake: {
    color: '#ea580c',
    bgColor: 'rgba(234,88,12,0.14)',
    label: 'Earthquake',
    Icon: Mountain,
    desc: 'Seismic activity & ground rupture events',
  },
  Flood: {
    color: '#2563eb',
    bgColor: 'rgba(37,99,235,0.14)',
    label: 'Flood',
    Icon: Waves,
    desc: 'Flash floods, river floods & inundation',
  },
  Wildfire: {
    color: '#dc2626',
    bgColor: 'rgba(220,38,38,0.14)',
    label: 'Wildfire',
    Icon: Wind,
    desc: 'Active wildfires & burn detections',
  },
  Flight: {
    color: '#06b6d4',
    bgColor: 'rgba(6,182,212,0.14)',
    label: 'Flight Radar',
    Icon: Plane,
    desc: 'Aviation, drone & airspace activity',
  },
  Political: {
    color: '#22c55e',
    bgColor: 'rgba(34,197,94,0.14)',
    label: 'Political',
    Icon: Scale,
    desc: 'Protests, coups & diplomatic events',
  },
  Satellite: {
    color: '#38bdf8',
    bgColor: 'rgba(56,189,248,0.14)',
    label: 'Satellite',
    Icon: Satellite,
    desc: 'Sentinel-2 burn scar, flood & change detections',
  },
  General: {
    color: '#a78bfa',
    bgColor: 'rgba(167,139,250,0.14)',
    label: 'General',
    Icon: Zap,
    desc: 'Unclassified incidents',
  },
} as const;

export type EventCategory = keyof typeof CATEGORY_CONFIG;
export type CategoryConfig = typeof CATEGORY_CONFIG[EventCategory];

// Re-export LucideIcon type for consumers
export type { LucideIcon };

export const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG) as EventCategory[];

/**
 * Map a raw event type + source to a display category.
 * Source-based rules run first (most reliable), then type keyword fallbacks.
 */
export function classifyEvent(
  type: string | null | undefined,
  source?: string | null,
): EventCategory {
  const t = (type   ?? '').toLowerCase();
  const s = (source ?? '').toLowerCase();

  // ── Source-based rules (authoritative) ──────────────────────────────────────
  if (s.includes('opensky') || s.includes('airlabs'))           return 'Flight';
  if (s.includes('acled'))                                       return 'War';
  if (s.includes('usgs'))                                        return 'Earthquake';
  if (s.includes('eonet') || s.includes('nasa eonet')) {
    if (t.includes('wildfire') || t.includes('fire'))            return 'Wildfire';
    if (t.includes('flood') || t.includes('storm surge'))        return 'Flood';
    if (t.includes('earthquake') || t.includes('seismic') || t.includes('volcano')) return 'Earthquake';
    return 'Drought';
  }
  if (s.includes('gdacs')) {
    if (t.includes('flood'))                                     return 'Flood';
    if (t.includes('earthquake') || t.includes('volcano'))       return 'Earthquake';
    if (t.includes('fire') || t.includes('wildfire'))            return 'Wildfire';
    return 'Drought';
  }
  if (s.includes('reliefweb') || s.includes('hdx'))             return 'Drought';

  // ── ACLED canonical type strings ─────────────────────────────────────────────
  if (
    t.includes('battle') || t.includes('violence against') ||
    t.includes('strategic development') || t.includes('riots') ||
    t.includes('remote violence')
  ) return 'War';

  if (
    t.includes('explosions') || t.includes('missile') || t.includes('airstrike') ||
    t.includes('air strike') || t.includes('bomb') || t.includes('rocket') ||
    t.includes('shelling') || t.includes('artillery')
  ) return 'Missile';

  // ── Specific disaster type strings ───────────────────────────────────────────
  if (t.includes('earthquake') || t.includes('seismic') || t.includes('tremor'))
    return 'Earthquake';
  if (t.includes('flood') || t.includes('inundation') || t.includes('storm surge'))
    return 'Flood';
  if (t.includes('wildfire') || (t.includes('fire') && !t.includes('gunfire')))
    return 'Wildfire';

  // ── General disaster / hazard fallback ───────────────────────────────────────
  if (
    t.includes('cyclone') || t.includes('volcano') || t.includes('drought') ||
    t.includes('famine') || t.includes('disaster') || t.includes('hazard') ||
    t.includes('locust') || t.includes('disease') || t.includes('epidemic')
  ) return 'Drought';

  // ── Flight / aviation ────────────────────────────────────────────────────────
  if (
    t.includes('flight') || t.includes('aviation') || t.includes('aircraft') ||
    t.includes('drone') || t.includes('uav') || t.includes('airspace')
  ) return 'Flight';

  // ── Political / governance ───────────────────────────────────────────────────
  if (
    t.includes('political') || t.includes('protest') || t.includes('election') ||
    t.includes('diplomatic') || t.includes('coup') || t.includes('government') ||
    t.includes('rally') || t.includes('demonstration')
  ) return 'Political';

  // ── Conflict keyword fallback ────────────────────────────────────────────────
  if (
    t.includes('conflict') || t.includes('violence') || t.includes('fight') ||
    t.includes('war') || t.includes('clash') || t.includes('attack') ||
    t.includes('killing') || t.includes('death') || t.includes('armed') ||
    t.includes('militia') || t.includes('ambush') || t.includes('troops') ||
    t.includes('military')
  ) return 'War';

  // ── Satellite / EO ───────────────────────────────────────────────────────────
  if (
    t.includes('satellite') || t.includes('sentinel') || t.includes('burn scar') ||
    t.includes('burn area') || t.includes('satellite detection') ||
    t.includes('ndvi') || t.includes('earth observation')
  ) return 'Satellite';

  return 'General';
}
