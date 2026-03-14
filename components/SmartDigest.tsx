import { Newspaper, ArrowRight } from 'lucide-react';

export function SmartDigest() {
  return (
    <footer className="h-24 border-t border-radar-border bg-radar-panel/80 backdrop-blur-xl flex items-stretch z-30 shrink-0">
      <div className="w-64 border-r border-radar-border flex items-center px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Newspaper className="text-radar-accent w-5 h-5" />
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white leading-none">Smart Digest</h3>
            <p className="text-[10px] text-gray-500 mt-1 uppercase">Unified Intelligence</p>
          </div>
        </div>
      </div>
      <div className="flex-1 px-8 flex items-center overflow-hidden">
        <p className="text-sm text-gray-300 leading-relaxed italic truncate">
          "Regional tensions remain high in the northern clusters with a 14% increase in troop density near Tigray borders. Economic indicators show severe pressure on the ETB due to logistics bottlenecks in the Djibouti corridor. Displacement trends suggest a southern movement pattern towards central Oromia."
        </p>
      </div>
      <div className="px-6 flex items-center shrink-0">
        <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
          <div className="flex flex-col items-end">
            <span>SAT-LINK: ACTIVE</span>
            <span>LATENCY: 42MS</span>
          </div>
          <div className="w-8 h-8 rounded-full border border-radar-accent/30 flex items-center justify-center text-radar-accent hover:bg-radar-accent hover:text-white transition-all cursor-pointer">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </footer>
  );
}
