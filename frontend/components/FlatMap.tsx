'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3-geo';
import * as topojson from 'topojson-client';

interface FlatMapProps {
  events: any[];
}

export default function FlatMap({ events }: FlatMapProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Fetch detailed Ethiopia regions TopoJSON
    fetch('https://raw.githubusercontent.com/org-scn-design-studio-community/sdkcommunitymaps/master/geojson/Africa/Ethiopia-regions.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(topology => {
        // Convert TopoJSON to GeoJSON features
        if (topology.type === 'Topology' && topology.objects.ETH_adm1) {
          const geojson = topojson.feature(topology, topology.objects.ETH_adm1);
          setGeoData(geojson);
        } else {
          setGeoData(topology); // Fallback for standard GeoJSON
        }
      })
      .catch(err => console.error("Error loading Ethiopia Map:", err));
  }, []);

  // Projection setup centered on Ethiopia
  const projection = useMemo(() => {
    return d3.geoMercator()
      .center([40.489, 9.145]) // Ethiopia center
      .scale(dimensions.width * 2.5) // Adjust scale based on container width
      .translate([dimensions.width / 2, dimensions.height / 2]);
  }, [dimensions]);

  const pathGenerator = useMemo(() => d3.geoPath().projection(projection), [projection]);

  const mapPaths = useMemo(() => {
    if (!geoData || !geoData.features) return null;
    return geoData.features.map((feature: any, i: number) => (
      <path
        key={i}
        d={pathGenerator(feature) || ''}
        className="fill-radar-panel/40 stroke-radar-red/40 hover:fill-radar-red/20 transition-colors duration-500"
        strokeWidth="1.5"
      />
    ));
  }, [geoData, pathGenerator]);

  const indicators = useMemo(() => {
    return events.map((event, i) => {
      const coords = projection([event.longitude, event.latitude]);
      if (!coords) return null;
      const [x, y] = coords;

      const heat = Math.max(0.4, Math.min((event.current_score || 5) / 10, 1.0));
      const color = event.category === 'Kinetic' ? 'rgb(225, 29, 72)' 
                  : event.category === 'Tactical' ? 'rgb(245, 158, 11)' 
                  : 'rgb(34, 197, 94)';

      return (
        <g key={event.id || i}>
          {/* Static Point */}
          <circle cx={x} cy={y} r="3" fill={color} />
          
          {/* Pulse Effect */}
          <circle cx={x} cy={y} r="3" fill="none" stroke={color} strokeWidth="2">
            <animate
              attributeName="r"
              from="3"
              to="20"
              dur="2s"
              begin="0s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              from={heat}
              to="0"
              dur="2s"
              begin="0s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      );
    });
  }, [events, projection]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#050505] cursor-default pointer-events-none">
      {!geoData ? (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-mono text-[10px] uppercase tracking-widest">
          Registering Regional Boundaries...
        </div>
      ) : (
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="w-full h-full"
        >
          {/* Background Grid Lines (Optional radar look) */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          <g className="map-layer">
            {mapPaths}
          </g>
          
          <g className="indicator-layer">
            {indicators}
          </g>
        </svg>
      )}
    </div>
  );
}
