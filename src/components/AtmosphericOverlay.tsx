
'use client';

import React, { useEffect, useState } from 'react';

export function AtmosphericOverlay() {
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'day' | 'evening' | 'night'>('night');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) setTimeOfDay('morning');
    else if (hour >= 10 && hour < 17) setTimeOfDay('day');
    else if (hour >= 17 && hour < 20) setTimeOfDay('evening');
    else setTimeOfDay('night');
  }, []);

  const themeStyles = {
    morning: 'bg-gradient-to-tr from-orange-500/5 via-primary/5 to-transparent',
    day: 'bg-gradient-to-tr from-accent/5 via-primary/5 to-transparent',
    evening: 'bg-gradient-to-tr from-red-500/5 via-purple-500/10 to-transparent',
    night: 'bg-gradient-to-tr from-blue-900/10 via-background to-transparent',
  };

  return (
    <div className={`fixed inset-0 pointer-events-none z-10 transition-colors duration-[3000ms] ${themeStyles[timeOfDay]}`}>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(10,12,20,0.4)_100%)]" />
      
      {/* Dynamic Scanlines / Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '50px 50px' }} 
      />
    </div>
  );
}
