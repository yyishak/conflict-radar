import React, { useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';
import { Activity, ShieldAlert, Zap, Globe2 } from 'lucide-react';

const WEBSOCKET_URL = "ws://localhost:4000";

function App() {
  const globeRef = useRef();
  const [gtiScore, setGtiScore] = useState("0.00");
  const [activeEvents, setActiveEvents] = useState([]);
  const [countries, setCountries] = useState({ features: [] });
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch GeoJSON for the outlined map
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(data => setCountries(data));
  }, []);

  // Setup WebSocket
  useEffect(() => {
    const ws = new WebSocket(WEBSOCKET_URL);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'gti_update') {
        setGtiScore(data.global_gti);
        setActiveEvents(data.active_events);
      }
    };

    return () => ws.close();
  }, []);

  // Initial Globe Spin
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 1.0;
      globeRef.current.pointOfView({ altitude: 2 });
    }
  }, []);

  const getEventColor = (category, current_score) => {
    const heat = Math.max(0.4, Math.min(current_score / 10, 1.0));
    
    if (category === 'Kinetic') return `rgba(255, 59, 48, ${heat})`;
    if (category === 'Tactical') return `rgba(255, 159, 10, ${heat})`;
    if (category === 'Political') return `rgba(48, 209, 88, ${heat})`;
    return `rgba(255, 255, 255, ${heat})`;
  };

  const parsedScore = parseFloat(gtiScore);
  const tempClass = parsedScore > 50 ? 'hot' : parsedScore > 20 ? 'warm' : 'cool';

  return (
    <>
      {/* 3D Background */}
      <div className="globe-container">
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          
          // Disable default textures for an outlined look
          globeImageUrl={null}
          bumpImageUrl={null}
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          showAtmosphere={true}
          atmosphereColor="#1a1a2e"
          atmosphereAltitude={0.15}
          
          // Vector Map (Outlines)
          polygonsData={countries.features}
          polygonCapColor={() => 'rgba(10, 10, 20, 0.7)'} // Dark fill
          polygonSideColor={() => 'rgba(0, 0, 0, 0.2)'}
          polygonStrokeColor={() => '#30d158'} // Neon green outlines
          polygonsTransitionDuration={300}

          // Animated Spot Circles (Ping/Ripple effect)
          ringsData={activeEvents}
          ringLat="latitude"
          ringLng="longitude"
          ringColor={(d) => getEventColor(d.category, d.current_score)}
          ringMaxRadius={(d) => Math.min(d.current_score / 3, 5.0) + 1.0}
          ringPropagationSpeed={() => 1.5}
          ringRepeatPeriod={() => 800} // Milliseconds between pulses
        />
      </div>

      {/* HUD Layer */}
      <div className="hud-container">
        <header className="header">
          <div className="logo">
            <Globe2 color="#30d158" size={32} />
            <span>Antigravity</span>
          </div>

          <div className="gti-score">
            <span className="gti-label">Global Tension Index</span>
            <span className={`gti-value ${tempClass}`}>{gtiScore}</span>
          </div>
        </header>

        {activeEvents.length > 0 && (
          <aside className="sidebar">
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
              <Activity size={14} className="pulse-icon" />
              <span>Active Escalations ({activeEvents.length})</span>
            </div>
            
            <div className="events-list">
              {activeEvents.map(ev => (
                <div key={ev.id} className="event-card">
                  <div className="event-header">
                    <span className={`event-category category-${ev.category}`}>
                        {ev.category === 'Kinetic' && <Zap size={10} style={{marginRight: 4, display:'inline'}} />}
                        {ev.category === 'Tactical' && <ShieldAlert size={10} style={{marginRight: 4, display:'inline'}} />}
                        {ev.category}
                    </span>
                    <span className="event-score">{(ev.current_score || 0).toFixed(2)}</span>
                  </div>
                  <div className="event-text">
                    {ev.text}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.2rem' }}>
                    {ev.latitude.toFixed(4)}, {ev.longitude.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      <style>{`
        .pulse-icon {
          animation: pulseOpacity 2s infinite;
        }
        @keyframes pulseOpacity {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
      `}</style>
    </>
  );
}

export default App;
