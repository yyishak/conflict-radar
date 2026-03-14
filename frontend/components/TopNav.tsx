

export function TopNav() {
  return (
    <header className="h-16 border-b border-radar-border flex items-center justify-between px-6 bg-radar-dark/90 backdrop-blur-md z-50 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-radar-cyan rounded flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </div>
          <h1 className="font-black text-xl tracking-tighter uppercase">Conflict <span className="text-radar-cyan">Radar</span> <span className="text-xs text-gray-500 font-normal ml-2">ETHIOPIA v2.4</span></h1>
        </div>
      </div>
      <div className="flex items-center gap-12">
        <div className="text-center group cursor-help">
          <div className="text-2xl font-black text-radar-red leading-none animate-pulse">WAR</div>
          <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Status: Active</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-radar-cyan leading-none">24</div>
          <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Active Incidents</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-radar-teal leading-none">68.2</div>
          <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Tension Index</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex bg-radar-panel rounded border border-radar-border p-1">
          <button className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest bg-radar-cyan text-white">Unified Dashboard</button>
        </div>
        <button className="px-4 py-2 bg-radar-border text-xs font-bold uppercase tracking-widest hover:bg-radar-cyan transition-colors duration-300">Export Report</button>
      </div>
    </header>
  );
}
