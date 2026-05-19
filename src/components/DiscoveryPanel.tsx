'use client';

import React, { useState, useEffect } from 'react';
import { X, Globe, Users, Maximize2, Sparkles, Navigation, Info, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PROVINCES, Province } from '@/lib/indonesia-data';
import { aiProvinceStoryteller } from '@/ai/flows/ai-province-storyteller';
import { Skeleton } from '@/components/ui/skeleton';

interface DiscoveryPanelProps {
  provinceId: string | null;
  onClose: () => void;
}

export function DiscoveryPanel({ provinceId, onClose }: DiscoveryPanelProps) {
  const [province, setProvince] = useState<Province | null>(null);
  const [aiStory, setAiStory] = useState<string | null>(null);
  const [loadingStory, setLoadingStory] = useState(false);

  useEffect(() => {
    if (provinceId) {
      // For the demo, we map the simplified SVG IDs to our data
      // (Simplified: if 'sumatra' clicked, show 'aceh' or a summary)
      const dataMap: Record<string, string> = {
        'sumatra': 'aceh',
        'java': 'jawa-tengah',
        'bali': 'bali',
        'kalimantan': 'jawa-barat', // Just for mapping demo
        'papua': 'papua-barat',
        'sulawesi': 'sulawesi-selatan'
      };
      
      const targetId = dataMap[provinceId] || 'aceh';
      const found = PROVINCES.find(p => p.id === targetId);
      setProvince(found || null);
      
      if (found) {
        generateStory(found.name);
      }
    } else {
      setProvince(null);
      setAiStory(null);
    }
  }, [provinceId]);

  const generateStory = async (name: string) => {
    setLoadingStory(true);
    try {
      const result = await aiProvinceStoryteller({ provinceName: name });
      setAiStory(result.summary);
    } catch (error) {
      console.error("AI Generation failed", error);
    } finally {
      setLoadingStory(false);
    }
  };

  if (!provinceId) return null;

  return (
    <div className={`fixed inset-y-8 right-8 w-[450px] z-50 transition-all duration-700 ease-out transform ${province ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <div className="h-full flex flex-col glass-panel rounded-3xl overflow-hidden border border-white/5">
        {/* Header Image */}
        <div className="relative h-64 w-full">
          <img 
            src={`https://picsum.photos/seed/${province?.id || 'indonesia'}/800/600`} 
            alt={province?.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white hover:bg-black/40"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
          
          <div className="absolute bottom-6 left-6">
            <Badge className="mb-2 bg-primary/20 text-accent border-accent/20 font-headline uppercase tracking-widest text-[10px]">
              {province?.island || 'Island Group'}
            </Badge>
            <h2 className="text-4xl font-headline font-bold text-white tracking-tight">
              {province?.name || 'Exploring...'}
            </h2>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-8">
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-[10px] font-headline uppercase tracking-wider">Population</span>
                </div>
                <div className="text-xl font-headline font-semibold">{province?.population}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Maximize2 className="w-4 h-4" />
                  <span className="text-[10px] font-headline uppercase tracking-wider">Area</span>
                </div>
                <div className="text-xl font-headline font-semibold">{province?.area}</div>
              </div>
            </div>

            {/* AI Storyteller */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <h3 className="text-sm font-headline font-bold uppercase tracking-widest">Cultural Narrative</h3>
                </div>
                {loadingStory && <span className="text-[10px] text-accent animate-pulse">Syncing with AI...</span>}
              </div>
              
              <div className="relative p-6 rounded-2xl bg-primary/5 border border-primary/20">
                {loadingStory ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full bg-white/5" />
                    <Skeleton className="h-4 w-[90%] bg-white/5" />
                    <Skeleton className="h-4 w-[95%] bg-white/5" />
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-foreground/80 font-body">
                    {aiStory || province?.description}
                  </p>
                )}
                <div className="absolute -bottom-2 -right-2 bg-background border border-primary/20 p-2 rounded-lg">
                  <Globe className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>

            {/* Key Highlights */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-headline font-bold uppercase tracking-widest">Iconic Landmarks</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {province?.highlights.map((item) => (
                  <div 
                    key={item}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-white/5 text-xs font-medium hover:border-accent/30 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3 h-3 text-accent" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/80 text-white font-headline font-bold uppercase tracking-widest group">
              Plan Voyage
              <Navigation className="ml-2 w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Button>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
