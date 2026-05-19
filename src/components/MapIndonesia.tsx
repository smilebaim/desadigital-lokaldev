
'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { PROVINCES } from '@/lib/indonesia-data';

interface MapIndonesiaProps {
  onProvinceSelect: (provinceId: string) => void;
  selectedProvinceId: string | null;
}

export function MapIndonesia({ onProvinceSelect, selectedProvinceId }: MapIndonesiaProps) {
  // We use a simplified SVG for the map paths. 
  // In a real production app, this would be a detailed topojson or a set of complex SVG paths.
  // For this demo, we'll represent the major island groups as clickable polygons.
  
  const regions = [
    { id: 'sumatra', name: 'Sumatra', path: "M50,150 L150,250 L200,350 L100,450 Z" },
    { id: 'java', name: 'Java', path: "M220,400 L450,420 L450,450 L220,430 Z" },
    { id: 'kalimantan', name: 'Kalimantan', path: "M250,150 L400,130 L450,250 L350,320 L240,280 Z" },
    { id: 'sulawesi', name: 'Sulawesi', path: "M480,180 L520,180 L540,250 L580,250 L580,280 L520,320 L480,250 Z" },
    { id: 'nusatenggara', name: 'Nusa Tenggara', path: "M460,430 L650,450 L650,470 L460,450 Z" },
    { id: 'maluku', name: 'Maluku', path: "M600,200 L650,220 L680,350 L620,380 Z" },
    { id: 'papua', name: 'Papua', path: "M700,220 L850,250 L880,420 L720,400 Z" },
  ];

  return (
    <div className="w-full h-full flex items-center justify-center p-12 select-none">
      <svg 
        viewBox="0 0 1000 600" 
        className="w-full h-auto drop-shadow-[0_0_30px_rgba(47,97,255,0.15)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Simplified Background Map */}
        <g className="opacity-80">
          {regions.map((region) => (
            <path
              key={region.id}
              d={region.path}
              className={cn(
                "province-path cursor-pointer outline-none transition-all duration-500",
                selectedProvinceId === region.id ? "province-active" : "fill-white/5"
              )}
              onClick={() => onProvinceSelect(region.id)}
            >
              <title>{region.name}</title>
            </path>
          ))}
        </g>
        
        {/* Floating Decorative Elements */}
        <circle cx="120" cy="120" r="1" className="fill-accent animate-pulse-subtle" />
        <circle cx="800" cy="500" r="1" className="fill-accent animate-pulse-subtle" />
        <circle cx="500" cy="100" r="2" className="fill-primary/20" />
      </svg>
    </div>
  );
}
