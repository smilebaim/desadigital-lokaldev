export type EndpointGroup = "Realtime" | "Supabase" | "Wilayah";

export interface KontrolEndpoint {
  id: string;
  label: string;
  path: string;
  group: EndpointGroup;
  description: string;
}

export const KONTROL_ENDPOINTS: KontrolEndpoint[] = [
  {
    id: "bencana",
    label: "Data Bencana",
    path: "/api/realtime/bencana",
    group: "Realtime",
    description: "KPI dampak, korban, dan kerusakan wilayah",
  },
  {
    id: "jaringan",
    label: "Status Jaringan",
    path: "/api/realtime/jaringan",
    group: "Realtime",
    description: "Tower dan konektivitas telekomunikasi",
  },
  {
    id: "puskesmas",
    label: "Puskesmas",
    path: "/api/realtime/puskesmas",
    group: "Realtime",
    description: "Fasilitas kesehatan tingkat puskesmas",
  },
  {
    id: "rsud",
    label: "RSUD",
    path: "/api/realtime/rsud",
    group: "Realtime",
    description: "Rumah sakit umum daerah",
  },
  {
    id: "v2",
    label: "Fasyankes V2",
    path: "/api/realtime/v2",
    group: "Realtime",
    description: "Data fasilitas kesehatan versi 2",
  },
  {
    id: "bantuan-logistik",
    label: "Bantuan Logistik",
    path: "/realtime/bantuan-logistik",
    group: "Realtime",
    description: "Distribusi bantuan per desa",
  },
  {
    id: "cluster",
    label: "Cluster Kerusakan",
    path: "/api/supabase/cluster",
    group: "Supabase",
    description: "Rekap cluster rehab & rekon",
  },
  {
    id: "posko",
    label: "Posko Pengungsian",
    path: "/api/supabase/posko",
    group: "Supabase",
    description: "Lokasi dan kapasitas posko",
  },
  {
    id: "penduduk",
    label: "Penduduk & Pengungsi",
    path: "/api/supabase/penduduk",
    group: "Supabase",
    description: "Data penduduk terdampak",
  },
  {
    id: "pertanian",
    label: "Kerusakan Pertanian",
    path: "/api/supabase/pertanian",
    group: "Supabase",
    description: "Sawah, kebun, dan tambak",
  },
  {
    id: "orang-hilang",
    label: "Orang Hilang",
    path: "/api/supabase/orang-hilang",
    group: "Supabase",
    description: "Status pencarian korban hilang",
  },
  {
    id: "lokasi-tenda",
    label: "Lokasi Tenda",
    path: "/api/supabase/lokasi-tenda",
    group: "Supabase",
    description: "Titik pengungsian tenda",
  },
  {
    id: "fasilitas-publik",
    label: "Fasilitas Publik",
    path: "/api/supabase/fasilitas-publik",
    group: "Supabase",
    description: "Fasum rusak di peta operasi",
  },
  {
    id: "village-distribution",
    label: "Distribusi Desa",
    path: "/api/supabase/village-distribution",
    group: "Supabase",
    description: "Status warna distribusi bantuan",
  },
  {
    id: "polygon-geojson",
    label: "Polygon GeoJSON",
    path: "/api/wilayah/polygon/geojson?level=2",
    group: "Wilayah",
    description: "Batas administratif untuk peta",
  },
  {
    id: "polygon-levels",
    label: "Level Wilayah",
    path: "/api/wilayah/polygon/levels",
    group: "Wilayah",
    description: "Daftar level kab/kec/desa",
  },
];

export const DEFAULT_LAYER_SETTINGS = {
  faskes: true,
  banlog: false,
  jaringan: false,
  cluster6: false,
  posko: false,
  tenda: false,
  faspublik: false,
  polygon: true,
} as const;

export type LayerKey = keyof typeof DEFAULT_LAYER_SETTINGS;

export interface KontrolSettings {
  autoRefreshMinutes: number;
  defaultPublicTab: "dampak" | "peta-operasi" | "pengungsi" | "bantuan";
  showLoadingOverlay: boolean;
  layers: Record<LayerKey, boolean>;
}

export const DEFAULT_KONTROL_SETTINGS: KontrolSettings = {
  autoRefreshMinutes: 5,
  defaultPublicTab: "dampak",
  showLoadingOverlay: true,
  layers: { ...DEFAULT_LAYER_SETTINGS },
};

export const KONTROL_SETTINGS_KEY = "desadigital-kontrol-settings";
