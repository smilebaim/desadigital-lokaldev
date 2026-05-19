
'use client';

import React, { useState } from 'react';
import { Search, MapPin, Compass } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function SearchNav() {
  const [query, setQuery] = useState('');

  return (
    <div className="fixed top-8 left-8 z-50 flex items-center gap-4">
      <div className="flex items-center gap-3 px-4 h-12 glass-panel rounded-full min-w-[320px]">
        <Search className="w-5 h-5 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Search island, city, or landmark..." 
          className="bg-transparent border-none outline-none text-sm w-full font-body placeholder:text-muted-foreground/60"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 text-[10px] font-headline tracking-tighter text-muted-foreground uppercase border border-white/10">
          <span className="opacity-50">CMD</span>
          <span>K</span>
        </div>
      </div>
      
      <Button variant="outline" size="icon" className="h-12 w-12 rounded-full glass-panel border-white/10 hover:bg-primary/20">
        <Compass className="w-5 h-5" />
      </Button>
    </div>
  );
}
