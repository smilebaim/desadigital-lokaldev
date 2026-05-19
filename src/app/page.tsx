
'use client';

import React, { useState } from 'react';
import { MapIndonesia } from '@/components/MapIndonesia';
import { DiscoveryPanel } from '@/components/DiscoveryPanel';
import { SearchNav } from '@/components/SearchNav';
import { AtmosphericOverlay } from '@/components/AtmosphericOverlay';
import { Info, Map as MapIcon, Layers, Anchor } from 'lucide-react';

export default function Home() {
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-background">
      {/* Background Visual Layer */}
      <AtmosphericOverlay />
      
      {/* Global Navigation */}
      <SearchNav />

      {/* Main Interactive Map Canvas */}
      <div className="map-container z-20 flex items-center justify-center">
        <MapIndonesia 
          onProvinceSelect={setSelectedProvinceId}
          selectedProvinceId={selectedProvinceId}
        />
      </div>

      {/* Discovery Panel Overlay */}
      <DiscoveryPanel 
        provinceId={selectedProvinceId} 
        onClose={() => setSelectedProvinceId(null)}
      />

      {/* Navigation UI Overlays (Corners) */}
      <div className="fixed bottom-8 left-8 z-50 flex items-center gap-3">
        <div className="flex flex-col gap-2">
          <button className="h-12 w-12 glass-panel rounded-2xl flex items-center justify-center hover:bg-primary/20 transition-all active:scale-95 group">
            <Layers className="w-5 h-5 text-muted-foreground group-hover:text-accent" />
          </button>
          <button className="h-12 w-12 glass-panel rounded-2xl flex items-center justify-center hover:bg-primary/20 transition-all active:scale-95 group">
            <MapIcon className="w-5 h-5 text-muted-foreground group-hover:text-accent" />
          </button>
        </div>
        
        <div className="h-24 px-6 glass-panel rounded-3xl flex flex-col justify-center gap-1 min-w-[200px]">
          <span className="text-[10px] font-headline font-bold text-accent uppercase tracking-[0.2em]">Archipelago Data</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-headline font-bold text-white">17,508</span>
            <span className="text-[10px] text-muted-foreground font-body">ISLANDS</span>
          </div>
          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
            <div className="bg-primary h-full w-2/3 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 right-8 z-50 flex items-center gap-4">
         <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-headline font-medium text-muted-foreground tracking-widest uppercase">Maritime Heritage</span>
            <h1 className="text-xl font-headline font-black text-white tracking-tighter uppercase italic flex items-center gap-2">
              Nusantara <Anchor className="w-5 h-5 text-primary" /> Canvas
            </h1>
         </div>
         <button className="h-14 w-14 glass-panel rounded-full flex items-center justify-center border-white/10 text-white hover:bg-white/10 transition-all">
            <Info className="w-6 h-6" />
         </button>
      </div>

      {/* Decorative Branding / Vignette */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
    </main>
  );
}
