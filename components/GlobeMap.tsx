'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';

interface GlobeMapProps {
  events: any[];
  onEventClick: (event: any) => void;
}

export default function GlobeMap({ events, onEventClick }: GlobeMapProps) {
  const globeRef = useRef<any>(null);
  const [countries, setCountries] = useState({ features: [] });
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0
  });

  // Optimize performance by memoizing polygonal data and styles
  const memoizedPolygons = useMemo(() => countries.features, [countries.features]);
  
  const polygonCapColor = useMemo(() => () => 'rgba(18, 18, 18, 0.7)', []);
  const polygonStrokeColor = useMemo(() => () => '#e11d48', []);

  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById('globe-parent');
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(data => setCountries(data));
  }, []);

  useEffect(() => {
    if (globeRef.current) {
      // 1. Perspective locked to Ethiopia on load
      globeRef.current.pointOfView({ lat: 9.145, lng: 40.489, altitude: 2.0 }, 1000);
      
      // 2. Enable rotation and zoom to see other countries
      globeRef.current.controls().autoRotate = false;
      globeRef.current.controls().enableRotate = true;
      globeRef.current.controls().enablePan = true;
      globeRef.current.controls().enableZoom = true;
      globeRef.current.controls().minDistance = 150;
      globeRef.current.controls().maxDistance = 1000;
    }
  }, [globeRef.current]);

  const getEventColor = (category: string, current_score: number) => {
    const heat = Math.max(0.6, Math.min(current_score / 10, 1.0));
    if (category === 'Kinetic') return `rgba(225, 29, 72, ${heat})`;
    if (category === 'Tactical') return `rgba(245, 158, 11, ${heat})`;
    return `rgba(34, 197, 94, ${heat})`;
  };

  return (
    <div id="globe-parent" className="w-full h-full relative overflow-hidden bg-[#050505]">
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl={null}
        bumpImageUrl={null}
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere={true}
        atmosphereColor="#e11d48"
        atmosphereAltitude={0.1}
        polygonsData={memoizedPolygons}
        polygonCapColor={polygonCapColor}
        polygonSideColor={() => 'rgba(225, 29, 72, 0.05)'}
        polygonStrokeColor={polygonStrokeColor}
        polygonsTransitionDuration={0}
        ringsData={events}
        ringLat="latitude"
        ringLng="longitude"
        ringColor={(d: any) => getEventColor(d.category, d.current_score)}
        ringMaxRadius={(d: any) => Math.min(d.current_score / 2, 8.0)}
        ringPropagationSpeed={() => 1.0}
        ringRepeatPeriod={() => 1500}
        pointsData={events}
        pointLat="latitude"
        pointLng="longitude"
        pointColor={(d: any) => getEventColor(d.category, d.current_score)}
        pointRadius={0.5}
        onPointClick={(point) => onEventClick(point)}
      />
    </div>
  );
}
