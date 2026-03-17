export const CATEGORY_CONFIG = {
  War: {
    color: '#e11d48',
    bgColor: 'rgba(225,29,72,0.14)',
    label: 'War',
    icon: '⚔',
    desc: 'Armed conflict & battlefield violence',
  },
  Missile: {
    color: '#f97316',
    bgColor: 'rgba(249,115,22,0.14)',
    label: 'Missiles',
    icon: '🚀',
    desc: 'Airstrikes, missile & explosive events',
  },
  Drought: {
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.14)',
    label: 'Drought',
    icon: '☁',
    desc: 'Natural hazards & humanitarian crises',
  },
  Flight: {
    color: '#06b6d4',
    bgColor: 'rgba(6,182,212,0.14)',
    label: 'Flight Radar',
    icon: '✈',
    desc: 'Aviation, drone & airspace activity',
  },
  Political: {
    color: '#22c55e',
    bgColor: 'rgba(34,197,94,0.14)',
    label: 'Political',
    icon: '⚖',
    desc: 'Protests, coups & diplomatic events',
  },
  General: {
    color: '#a78bfa',
    bgColor: 'rgba(167,139,250,0.14)',
    label: 'General',
    icon: '⚡',
    desc: 'Unclassified incidents',
  },
} as const;

export type EventCategory = keyof typeof CATEGORY_CONFIG;

export const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG) as EventCategory[];

/** Map a raw event `type` string to a display category. */
export function classifyEvent(type: string | null | undefined): EventCategory {
  const t = (type ?? '').toLowerCase();

  if (
    t.includes('missile') || t.includes('airstrike') || t.includes('air strike') ||
    t.includes('bomb') || t.includes('explosion') || t.includes('rocket') ||
    t.includes('shelling') || t.includes('ihl') || t.includes('artillery')
  ) return 'Missile';

  if (
    t.includes('drought') || t.includes('flood') || t.includes('famine') ||
    t.includes('disaster') || t.includes('hazard') || t.includes('earthquake') ||
    t.includes('locust') || t.includes('hunger') || t.includes('health') ||
    t.includes('disease') || t.includes('epidemic')
  ) return 'Drought';

  if (
    t.includes('flight') || t.includes('aviation') || t.includes('aircraft') ||
    t.includes('drone') || t.includes('uav') || t.includes('airspace')
  ) return 'Flight';

  if (
    t.includes('political') || t.includes('protest') || t.includes('election') ||
    t.includes('diplomatic') || t.includes('coup') || t.includes('government') ||
    t.includes('rally') || t.includes('demonstration')
  ) return 'Political';

  if (
    t.includes('conflict') || t.includes('violence') || t.includes('battle') ||
    t.includes('fight') || t.includes('war') || t.includes('clash') ||
    t.includes('attack') || t.includes('killing') || t.includes('death') ||
    t.includes('armed') || t.includes('militia') || t.includes('ambush')
  ) return 'War';

  return 'General';
}
