
import { IntelligenceBriefing } from './IntelligenceBriefing';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function TopNav() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <header className="h-14 border-b border-radar-border flex items-center justify-between px-5 bg-radar-dark/95 backdrop-blur-md z-50 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 bg-radar-red rounded flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h1 className="font-black text-lg tracking-tighter uppercase leading-tight">
            Conflict <span className="text-radar-red">Radar</span>{' '}
            <span className="text-[10px] font-normal ml-0.5" style={{ color: 'var(--foreground)', opacity: 0.4 }}>ETHIOPIA v2.4</span>
          </h1>
          <p className="text-[9px] uppercase tracking-[0.18em] opacity-50" style={{ color: 'var(--foreground)' }}>
            Live conflict &amp; macro risk — Ethiopia
          </p>
        </div>
      </div>

      {/* Centre: intel briefing */}
      <div className="flex items-center gap-6">
        <IntelligenceBriefing />

        {/* Live status pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 border border-radar-red/30 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-radar-red animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-radar-red">War · Active</span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-radar-border bg-radar-panel text-[10px] font-mono uppercase tracking-widest hover:border-radar-red transition-colors"
          aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
          style={{ color: 'var(--foreground)' }}
        >
          <span className="flex items-center justify-center w-4 h-4">
            {isLight ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
          </span>
          <span>{isLight ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </header>
  );
}
