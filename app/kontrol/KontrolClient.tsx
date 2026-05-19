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

const LAYER_LABELS: Record<LayerKey, string> = {
  faskes: "Faskes",
  banlog: "Bantuan Logistik",
  jaringan: "Jaringan",
  cluster6: "Rehab & Rekon",
  posko: "Posko",
  tenda: "Lokasi Tenda",
  faspublik: "Fasilitas Publik",
  polygon: "Polygon Wilayah",
};

function loadSettings(): KontrolSettings {
  if (typeof window === "undefined") return DEFAULT_KONTROL_SETTINGS;
  try {
    const raw = localStorage.getItem(KONTROL_SETTINGS_KEY);
    if (!raw) return DEFAULT_KONTROL_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<KontrolSettings>;
    return {
      ...DEFAULT_KONTROL_SETTINGS,
      ...parsed,
      layers: { ...DEFAULT_KONTROL_SETTINGS.layers, ...parsed.layers },
    };
  } catch {
    return DEFAULT_KONTROL_SETTINGS;
  }
}

function formatTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractRecordCount(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.total === "number") return obj.total;
  if (Array.isArray(obj.data)) return obj.data.length;
  if (Array.isArray(obj.features)) return obj.features.length;
  if (Array.isArray(obj.levels)) return obj.levels.length;
  return null;
}

export default function KontrolClient() {
  const [section, setSection] = useState<SectionId>("ringkasan");
  const [settings, setSettings] = useState<KontrolSettings>(DEFAULT_KONTROL_SETTINGS);
  const [health, setHealth] = useState<EndpointHealth[]>(() =>
    KONTROL_ENDPOINTS.map((endpoint) => ({
      endpoint,
      status: "pending",
      latencyMs: null,
      recordCount: null,
      message: "Belum diperiksa",
      checkedAt: null,
    }))
  );
  const [checking, setChecking] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<
    { id: string; time: string; text: string; type: "info" | "success" | "warn" }[]
  >([]);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setSettings(loadSettings());
    setActivityLog([
      {
        id: "init",
        time: new Date().toISOString(),
        text: "Panel kontrol dibuka",
        type: "info",
      },
    ]);
  }, []);

  const pushLog = useCallback(
    (text: string, type: "info" | "success" | "warn" = "info") => {
      setActivityLog((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          time: new Date().toISOString(),
          text,
          type,
        },
        ...prev.slice(0, 49),
      ]);
    },
    []
  );

  const checkEndpoints = useCallback(async () => {
    setChecking(true);
    pushLog("Memulai pemeriksaan semua endpoint API", "info");

    const results = await Promise.all(
      KONTROL_ENDPOINTS.map(async (endpoint): Promise<EndpointHealth> => {
        const started = performance.now();
        try {
          const res = await fetch(endpoint.path, { cache: "no-store" });
          const latencyMs = Math.round(performance.now() - started);
          const checkedAt = new Date().toISOString();

          if (!res.ok) {
            return {
              endpoint,
              status: "error",
              latencyMs,
              recordCount: null,
              message: `HTTP ${res.status}`,
              checkedAt,
            };
          }

          let recordCount: number | null = null;
          try {
            const json = await res.json();
            recordCount = extractRecordCount(json);
          } catch {
            recordCount = null;
          }

          return {
            endpoint,
            status: "ok",
            latencyMs,
            recordCount,
            message: "Berhasil",
            checkedAt,
          };
        } catch (err) {
          return {
            endpoint,
            status: "error",
            latencyMs: Math.round(performance.now() - started),
            recordCount: null,
            message: err instanceof Error ? err.message : "Gagal terhubung",
            checkedAt: new Date().toISOString(),
          };
        }
      })
    );

    setHealth(results);
    setChecking(false);

    const ok = results.filter((r) => r.status === "ok").length;
    const fail = results.length - ok;
    pushLog(
      `Pemeriksaan selesai: ${ok} aktif, ${fail} bermasalah`,
      fail > 0 ? "warn" : "success"
    );
  }, [pushLog]);

  useEffect(() => {
    if (!hydrated) return;
    void checkEndpoints();
  }, [hydrated, checkEndpoints]);

  const stats = useMemo(() => {
    const ok = health.filter((h) => h.status === "ok").length;
    const error = health.filter((h) => h.status === "error").length;
    const pending = health.filter((h) => h.status === "pending").length;
    const avgLatency =
      health.filter((h) => h.latencyMs != null).reduce((s, h) => s + (h.latencyMs ?? 0), 0) /
        Math.max(health.filter((h) => h.latencyMs != null).length, 1) || 0;
    const lastCheck = health
      .map((h) => h.checkedAt)
      .filter(Boolean)
      .sort()
      .reverse()[0];
    return { ok, error, pending, avgLatency: Math.round(avgLatency), lastCheck };
  }, [health]);

  const groupedHealth = useMemo(() => {
    const groups: Record<string, EndpointHealth[]> = {};
    for (const item of health) {
      const key = item.endpoint.group;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [health]);

  const saveSettings = () => {
    localStorage.setItem(KONTROL_SETTINGS_KEY, JSON.stringify(settings));
    setSavedAt(new Date().toISOString());
    pushLog("Pengaturan dashboard disimpan ke peramban lokal", "success");
  };

  const resetSettings = () => {
    setSettings(DEFAULT_KONTROL_SETTINGS);
    localStorage.removeItem(KONTROL_SETTINGS_KEY);
    setSavedAt(new Date().toISOString());
    pushLog("Pengaturan dikembalikan ke default", "warn");
  };

  const updateLayer = (key: LayerKey, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      layers: { ...prev.layers, [key]: value },
    }));
  };

  return (
    <div className="kontrol-root flex min-h-screen">
      <aside className="kontrol-sidebar hidden w-64 flex-shrink-0 flex-col text-white md:flex">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/20 p-2">
              <i className="fas fa-sliders-h text-lg" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">Dashboard Kontrol</p>
              <p className="text-xs text-green-200">Panel Administrasi</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`kontrol-nav-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
                section === item.id ? "active font-semibold" : "text-green-100"
              }`}
            >
              <i className={`fas ${item.icon} w-5 text-center`} aria-hidden />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-lg bg-white/15 px-3 py-2.5 text-sm font-medium transition hover:bg-white/25"
          >
            <i className="fas fa-external-link-alt" aria-hidden />
            Buka Dashboard Publik
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
            <div>
              <h1 className="text-lg font-bold text-slate-800 md:text-xl">
                {SECTIONS.find((s) => s.id === section)?.label}
              </h1>
              <p className="text-xs text-slate-500 md:text-sm">
                Monitoring Bencana Hidrometeorologi — Aceh
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-lg border border-slate-200 px-2 py-2 text-sm md:hidden"
                value={section}
                onChange={(e) => setSection(e.target.value as SectionId)}
                aria-label="Navigasi section"
              >
                {SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void checkEndpoints()}
                disabled={checking}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                <i
                  className={`fas fa-sync-alt ${checking ? "kontrol-checking" : ""}`}
                  aria-hidden
                />
                {checking ? "Memeriksa..." : "Periksa API"}
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 md:hidden"
              >
                <i className="fas fa-chart-line" aria-hidden />
                Publik
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {section === "ringkasan" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                <SummaryCard
                  label="API Aktif"
                  value={String(stats.ok)}
                  sub={`dari ${health.length} endpoint`}
                  tone="green"
                  icon="fa-circle-check"
                />
                <SummaryCard
                  label="API Bermasalah"
                  value={String(stats.error)}
                  sub={stats.error > 0 ? "Perlu ditinjau" : "Semua normal"}
                  tone={stats.error > 0 ? "red" : "slate"}
                  icon="fa-triangle-exclamation"
                />
                <SummaryCard
                  label="Rata-rata Latensi"
                  value={stats.avgLatency ? `${stats.avgLatency} ms` : "-"}
                  sub="Respons server lokal"
                  tone="blue"
                  icon="fa-bolt"
                />
                <SummaryCard
                  label="Auto-refresh"
                  value={`${settings.autoRefreshMinutes} mnt`}
                  sub={`Tab default: ${settings.defaultPublicTab}`}
                  tone="purple"
                  icon="fa-clock"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="kontrol-card p-4 xl:col-span-2">
                  <h2 className="mb-3 text-sm font-semibold text-slate-700">
                    <i className="fas fa-heart-pulse mr-2 text-green-500" aria-hidden />
                    Status Sistem
                  </h2>
                  <ul className="space-y-2 text-sm">
                    <StatusRow
                      label="Server Next.js"
                      ok
                      detail="Development mode — localhost:3000"
                    />
                    <StatusRow
                      label="Endpoint Realtime"
                      ok={health.filter((h) => h.endpoint.group === "Realtime" && h.status === "ok").length >= 4}
                      detail={`${health.filter((h) => h.endpoint.group === "Realtime" && h.status === "ok").length}/6 aktif`}
                    />
                    <StatusRow
                      label="Endpoint Supabase"
                      ok={health.filter((h) => h.endpoint.group === "Supabase" && h.status === "ok").length >= 6}
                      detail={`${health.filter((h) => h.endpoint.group === "Supabase" && h.status === "ok").length}/8 aktif`}
                    />
                    <StatusRow
                      label="Data Wilayah (Polygon)"
                      ok={health.some((h) => h.endpoint.id === "polygon-geojson" && h.status === "ok")}
                      detail="GeoJSON batas administratif"
                    />
                    <StatusRow
                      label="Pemeriksaan Terakhir"
                      ok={!!stats.lastCheck}
                      detail={formatTime(stats.lastCheck ?? null)}
                    />
                  </ul>
                </div>

                <div className="kontrol-card p-4">
                  <h2 className="mb-3 text-sm font-semibold text-slate-700">
                    <i className="fas fa-link mr-2 text-green-500" aria-hidden />
                    Tautan Cepat
                  </h2>
                  <div className="space-y-2">
                    <QuickLink href="/" label="Dashboard Publik" icon="fa-tv" />
                    <QuickLink href="/kontrol" label="Panel Kontrol (ini)" icon="fa-sliders-h" />
                    <QuickLink
                      href="/api/realtime/bencana"
                      label="API Bencana (JSON)"
                      icon="fa-code"
                      external
                    />
                  </div>
                  {savedAt && (
                    <p className="mt-4 text-xs text-slate-500">
                      Pengaturan disimpan: {formatTime(savedAt)}
                    </p>
                  )}
                </div>
              </div>

              <div className="kontrol-card overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-700">Ringkasan Endpoint</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Layanan</th>
                        <th className="px-4 py-3">Grup</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Latensi</th>
                        <th className="px-4 py-3">Records</th>
                      </tr>
                    </thead>
                    <tbody>
                      {health.slice(0, 8).map((row) => (
                        <tr key={row.endpoint.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium">{row.endpoint.label}</td>
                          <td className="px-4 py-3 text-slate-500">{row.endpoint.group}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {row.latencyMs != null ? `${row.latencyMs} ms` : "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {row.recordCount ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-slate-100 px-4 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => setSection("api")}
                    className="text-xs font-medium text-green-600 hover:text-green-700"
                  >
                    Lihat semua endpoint →
                  </button>
                </div>
              </div>
            </div>
          )}

          {section === "api" && (
            <div className="space-y-6">
              {Object.entries(groupedHealth).map(([group, items]) => (
                <div key={group} className="kontrol-card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <h2 className="text-sm font-semibold text-slate-700">{group}</h2>
                    <span className="text-xs text-slate-500">
                      {items.filter((i) => i.status === "ok").length}/{items.length} aktif
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-2">Nama</th>
                          <th className="px-4 py-2">Path</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Latensi</th>
                          <th className="px-4 py-2">Data</th>
                          <th className="px-4 py-2">Diperiksa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((row) => (
                          <tr key={row.endpoint.id} className="border-t border-slate-100">
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800">{row.endpoint.label}</p>
                              <p className="text-xs text-slate-500">{row.endpoint.description}</p>
                            </td>
                            <td className="px-4 py-3">
                              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                                {row.endpoint.path}
                              </code>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={row.status} message={row.message} />
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {row.latencyMs != null ? `${row.latencyMs} ms` : "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {row.recordCount ?? "-"}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {formatTime(row.checkedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {section === "pengaturan" && (
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="kontrol-card p-5">
                <h2 className="mb-4 text-sm font-semibold text-slate-700">
                  <i className="fas fa-display mr-2 text-green-500" aria-hidden />
                  Tampilan Dashboard Publik
                </h2>
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">
                      Tab default saat dibuka
                    </span>
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={settings.defaultPublicTab}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          defaultPublicTab: e.target.value as KontrolSettings["defaultPublicTab"],
                        }))
                      }
                    >
                      <option value="dampak">Dampak</option>
                      <option value="peta-operasi">Peta Operasi</option>
                      <option value="pengungsi">Pengungsi</option>
                      <option value="bantuan">Bantuan</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">
                      Interval auto-refresh data (menit)
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={settings.autoRefreshMinutes}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          autoRefreshMinutes: Math.min(
                            60,
                            Math.max(1, Number(e.target.value) || 5)
                          ),
                        }))
                      }
                    />
                  </label>

                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-green-600"
                      checked={settings.showLoadingOverlay}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          showLoadingOverlay: e.target.checked,
                        }))
                      }
                    />
                    <span>Tampilkan overlay &quot;Memuat Data&quot; saat refresh</span>
                  </label>
                </div>
              </div>

              <div className="kontrol-card p-5">
                <h2 className="mb-1 text-sm font-semibold text-slate-700">
                  <i className="fas fa-layer-group mr-2 text-green-500" aria-hidden />
                  Layer Peta Default
                </h2>
                <p className="mb-4 text-xs text-slate-500">
                  Preferensi layer disimpan lokal. Integrasi penuh ke dashboard publik dapat
                  ditambahkan pada tahap berikutnya.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(Object.keys(LAYER_LABELS) as LayerKey[]).map((key) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-green-600"
                        checked={settings.layers[key]}
                        onChange={(e) => updateLayer(key, e.target.checked)}
                      />
                      {LAYER_LABELS[key]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveSettings}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Simpan Pengaturan
                </button>
                <button
                  type="button"
                  onClick={resetSettings}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Reset Default
                </button>
              </div>
            </div>
          )}

          {section === "log" && (
            <div className="kontrol-card mx-auto max-w-3xl">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-700">Log Aktivitas Sesi</h2>
                <p className="text-xs text-slate-500">Riwayat aksi pada panel kontrol ini</p>
              </div>
              <ul className="max-h-[480px] divide-y divide-slate-100 overflow-y-auto">
                {activityLog.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-slate-400">
                    Belum ada aktivitas
                  </li>
                )}
                {activityLog.map((entry) => (
                  <li key={entry.id} className="flex gap-3 px-4 py-3 text-sm">
                    <span
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                        entry.type === "success"
                          ? "bg-emerald-500"
                          : entry.type === "warn"
                            ? "bg-amber-500"
                            : "bg-slate-400"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-800">{entry.text}</p>
                      <p className="text-xs text-slate-500">{formatTime(entry.time)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "green" | "red" | "blue" | "purple" | "slate";
  icon: string;
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="kontrol-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{sub}</p>
        </div>
        <div className={`rounded-full p-2.5 ${tones[tone]}`}>
          <i className={`fas ${icon}`} aria-hidden />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  message,
}: {
  status: EndpointHealth["status"];
  message?: string;
}) {
  if (status === "pending") {
    return (
      <span className="kontrol-status-pending inline-flex rounded-full px-2 py-0.5 text-xs font-medium">
        Memeriksa
      </span>
    );
  }
  if (status === "ok") {
    return (
      <span className="kontrol-status-ok inline-flex rounded-full px-2 py-0.5 text-xs font-medium">
        Aktif
      </span>
    );
  }
  return (
    <span
      className="kontrol-status-error inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
      title={message}
    >
      Error
    </span>
  );
}

function StatusRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`}
        />
        <span className="font-medium text-slate-700">{label}</span>
      </div>
      <span className="text-xs text-slate-500">{detail}</span>
    </li>
  );
}

function QuickLink({
  href,
  label,
  icon,
  external,
}: {
  href: string;
  label: string;
  icon: string;
  external?: boolean;
}) {
  const className =
    "flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-700 transition hover:border-green-200 hover:bg-green-50 hover:text-green-700";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        <i className={`fas ${icon} w-4 text-green-500`} aria-hidden />
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      <i className={`fas ${icon} w-4 text-green-500`} aria-hidden />
      {label}
    </Link>
  );
}
