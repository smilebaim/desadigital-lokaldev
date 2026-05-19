"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_KONTROL_SETTINGS,
  KONTROL_ENDPOINTS,
  KONTROL_SETTINGS_KEY,
  type KontrolEndpoint,
  type KontrolSettings,
  type LayerKey,
} from "@/lib/kontrol-endpoints";
import "./kontrol.css";

type SectionId = "ringkasan" | "api" | "pengaturan" | "log";

interface EndpointHealth {
  endpoint: KontrolEndpoint;
  status: "pending" | "ok" | "error";
  latencyMs: number | null;
  recordCount: number | null;
  message: string;
  checkedAt: string | null;
}

const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
  { id: "ringkasan", label: "Ringkasan", icon: "fa-gauge-high" },
  { id: "api", label: "API & Data", icon: "fa-database" },
  { id: "pengaturan", label: "Pengaturan", icon: "fa-sliders" },
  { id: "log", label: "Log Aktivitas", icon: "fa-clock-rotate-left" },
];

function loadSettings(): KontrolSettings {
  if (typeof window === "undefined") return DEFAULT_KONTROL_SETTINGS;
  try {
    const raw = localStorage.getItem(KONTROL_SETTINGS_KEY);
    if (!raw) return DEFAULT_KONTROL_SETTINGS;
    return { ...DEFAULT_KONTROL_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_KONTROL_SETTINGS;
  }
}

function extractRecordCount(payload: any): number | null {
  if (!payload || typeof payload !== "object") return null;
  if (typeof payload.total === "number") return payload.total;
  if (Array.isArray(payload.data)) return payload.data.length;
  if (payload.summary && typeof payload.summary.total === "number") return payload.summary.total;
  return null;
}

export default function KontrolClient() {
  const [section, setSection] = useState<SectionId>("ringkasan");
  const [settings, setSettings] = useState<KontrolSettings>(DEFAULT_KONTROL_SETTINGS);
  const [health, setHealth] = useState<EndpointHealth[]>([]);
  const [checking, setChecking] = useState(false);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setSettings(loadSettings());
    setHealth(KONTROL_ENDPOINTS.map(e => ({
      endpoint: e, status: "pending", latencyMs: null, recordCount: null, message: "Belum diperiksa", checkedAt: null
    })));
  }, []);

  const pushLog = useCallback((text: string, type: "info" | "success" | "warn" = "info") => {
    setActivityLog(prev => [{ id: Date.now(), time: new Date().toISOString(), text, type }, ...prev.slice(0, 20)]);
  }, []);

  const checkEndpoints = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    pushLog("Memeriksa status API...", "info");

    const results = await Promise.all(KONTROL_ENDPOINTS.map(async (endpoint) => {
      const start = performance.now();
      try {
        const res = await fetch(endpoint.path, { cache: 'no-store' });
        const latency = Math.round(performance.now() - start);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return {
          endpoint, status: "ok" as const, latencyMs: latency,
          recordCount: extractRecordCount(data), message: "Normal", checkedAt: new Date().toISOString()
        };
      } catch (e: any) {
        return {
          endpoint, status: "error" as const, latencyMs: null,
          recordCount: null, message: e.message, checkedAt: new Date().toISOString()
        };
      }
    }));

    setHealth(results);
    setChecking(false);
    pushLog("Pemeriksaan selesai.", "success");
  }, [checking, pushLog]);

  useEffect(() => {
    if (hydrated) checkEndpoints();
  }, [hydrated]);

  const stats = useMemo(() => {
    const ok = health.filter(h => h.status === "ok").length;
    return { ok, total: health.length, avgLatency: Math.round(health.reduce((a,b)=>a+(b.latencyMs||0),0) / (ok || 1)) };
  }, [health]);

  if (!hydrated) return null;

  return (
    <div className="kontrol-root flex min-h-screen">
      <aside className="w-64 bg-green-900 text-white flex flex-col p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <i className="fas fa-sliders-h text-xl" />
          <span className="font-bold">Panel Kontrol</span>
        </div>
        <nav className="flex-1 space-y-1">
          {SECTIONS.map(s => (
            <button 
              key={s.id} 
              onClick={() => setSection(s.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition ${section === s.id ? 'bg-white/20 font-bold' : 'hover:bg-white/10'}`}
            >
              <i className={`fas ${s.icon} w-5`} />{s.label}
            </button>
          ))}
        </nav>
        <Link href="/" className="mt-auto flex items-center justify-center gap-2 bg-white/10 p-3 rounded-lg hover:bg-white/20 text-sm">
          <i className="fas fa-arrow-left" /> Kembali ke Publik
        </Link>
      </aside>

      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
        <header className="bg-white border-b p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-800">{SECTIONS.find(s=>s.id===section)?.label}</h1>
          <button 
            disabled={checking} 
            onClick={checkEndpoints} 
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
          >
            <i className={`fas fa-sync-alt ${checking ? 'animate-spin' : ''}`} /> Periksa API
          </button>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {section === "ringkasan" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">API Aktif</p>
                <p className="text-3xl font-bold text-green-600">{stats.ok} / {stats.total}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Avg Latency</p>
                <p className="text-3xl font-bold text-blue-600">{stats.avgLatency} ms</p>
              </div>
              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Refresh Rate</p>
                <p className="text-3xl font-bold text-purple-600">{settings.autoRefreshMinutes} m</p>
              </div>
            </div>
          )}

          {section === "api" && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Nama Endpoint</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Latensi</th>
                    <th className="px-4 py-3">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {health.map(h => (
                    <tr key={h.endpoint.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{h.endpoint.label}</div>
                        <code className="text-[10px] text-slate-400">{h.endpoint.path}</code>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${h.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {h.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{h.latencyMs ? `${h.latencyMs}ms` : '-'}</td>
                      <td className="px-4 py-3 font-bold">{h.recordCount ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
