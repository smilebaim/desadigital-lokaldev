
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import './dashboard.css';

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState('dampak');
  const [bencana, setBencana] = useState<any>(null);
  const [jaringan, setJaringan] = useState<any>(null);
  const [cluster, setCluster] = useState<any>(null);
  const [faskes, setFaskes] = useState<any>({ pkm: [], rsud: [], v2: [] });
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const mapInstance = useRef<any>(null);
  const chartInstance = useRef<any>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resBnc, resJrg, resCls, resPkm, resRsud, resV2] = await Promise.all([
        fetch('/api/realtime/bencana').then(r => r.json()),
        fetch('/api/realtime/jaringan').then(r => r.json()),
        fetch('/api/supabase/cluster').then(r => r.json()),
        fetch('/api/realtime/puskesmas').then(r => r.json()),
        fetch('/api/realtime/rsud').then(r => r.json()),
        fetch('/api/realtime/v2').then(r => r.json()),
      ]);

      setBencana(resBnc);
      setJaringan(resJrg);
      setCluster(resCls);
      setFaskes({ pkm: resPkm.data || [], rsud: resRsud.data || [], v2: resV2.data || [] });
      
      if (resBnc?.updated_at) {
        setLastUpdate(new Date(resBnc.updated_at).toLocaleTimeString());
      }
    } catch (error) {
      console.error('Gagal mengambil data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchData();
    const interval = setInterval(fetchData, 300000); // Refresh setiap 5 menit
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle Map Resizing when tab changes
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => {
        mapInstance.current.invalidateSize();
      }, 200);
    }
  }, [activeTab]);

  // Inisialisasi Peta
  useEffect(() => {
    if (!mounted || loading || !bencana || typeof window === 'undefined') return;

    const L = (window as any).L;
    if (!L) return;
    
    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map('map').setView([4.6, 96.5], 7);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapInstance.current);
    }

    // Clear existing markers
    mapInstance.current.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) mapInstance.current.removeLayer(layer);
    });

    // Add Bencana Markers
    if (bencana.data && Array.isArray(bencana.data)) {
      bencana.data.forEach((item: any) => {
        const color = item.status === 'critical' ? '#ef4444' : item.status === 'warning' ? '#f59e0b' : '#10b981';
        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="marker-icon" style="background-color: ${color}"><i class="fas fa-exclamation-triangle"></i></div>`,
          iconSize: [24, 24]
        });
        L.marker([item.lat, item.lng], { icon })
          .bindPopup(`<strong>${item.desa}</strong><br>${item.jenis_bencana}<br>Status: ${item.status}`)
          .addTo(mapInstance.current);
      });
    }

    // Force resize on mount/data load
    setTimeout(() => mapInstance.current?.invalidateSize(), 100);

  }, [mounted, loading, bencana, activeTab]);

  // Inisialisasi Grafik
  useEffect(() => {
    if (!mounted || loading || !bencana || typeof window === 'undefined') return;

    const Chart = (window as any).Chart;
    if (!Chart) return;

    const ctx = document.getElementById('chartStatusDampak') as HTMLCanvasElement;
    if (!ctx) return;

    if (chartInstance.current) chartInstance.current.destroy();

    const dataPoints = [
      bencana.data?.filter((d: any) => d.status === 'critical').length || 0,
      bencana.data?.filter((d: any) => d.status === 'warning').length || 0,
      bencana.data?.filter((d: any) => d.status === 'normal').length || 0,
    ];

    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Critical', 'Warning', 'Normal'],
        datasets: [{
          data: dataPoints,
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { 
            position: 'bottom',
            labels: { boxWidth: 12, padding: 10, font: { size: 10 } }
          } 
        }
      }
    });
  }, [mounted, loading, bencana, activeTab]);

  const toggleMobileMenu = () => setIsMenuOpen(!isMenuOpen);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <div id="toastContainer" />
      
      {/* Mobile Menu Overlay */}
      <div 
        className={`mobile-menu-overlay ${isMenuOpen ? 'active' : ''}`} 
        onClick={toggleMobileMenu} 
      />

      {/* Mobile Menu Drawer */}
      <div className={`mobile-menu-drawer ${isMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-drawer-header">
          <span className="font-semibold">Menu</span>
          <button onClick={toggleMobileMenu} className="p-1 hover:bg-white/20 rounded">
            <i className="fas fa-times text-lg" />
          </button>
        </div>
        <div className="mobile-menu-drawer-body">
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 px-1">Navigasi</p>
            {['dampak', 'peta-operasi', 'pengungsi', 'bantuan'].map(tab => (
              <div 
                key={tab}
                className={`mobile-menu-item ${activeTab === tab ? 'active' : ''}`} 
                onClick={() => { setActiveTab(tab); setIsMenuOpen(false); }}
              >
                <i className={`fas fa-${tab === 'dampak' ? 'exclamation-triangle' : tab === 'peta-operasi' ? 'map-marked-alt' : tab === 'pengungsi' ? 'users' : 'truck'}`} />
                <span className="capitalize">{tab.replace('-', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <header className="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-700 text-white shadow-lg sticky top-0 z-50">
        <div className="container-fluid px-2 md:px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <div className="bg-white/20 p-1.5 md:p-2 rounded-lg flex-shrink-0">
                <i className="fas fa-shield-alt text-lg md:text-2xl" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm md:text-lg font-bold truncate">Dashboard Monitoring</h1>
                <p className="text-xs text-primary-200 hidden md:block">Hidrometeorologi Aceh</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              <a href="/kontrol" title="Dashboard Kontrol" className="bg-white/20 hover:bg-white/30 p-1.5 md:p-2 rounded-lg transition">
                <i className="fas fa-sliders-h text-sm md:text-base" />
              </a>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-primary-200">Update Terakhir</p>
                <p className="text-xs md:text-sm font-medium">{lastUpdate || '-'}</p>
              </div>
              <button onClick={fetchData} className="bg-white/20 hover:bg-white/30 p-1.5 md:p-2 rounded-lg transition">
                <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={toggleMobileMenu} className="md:hidden bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition">
                <i className="fas fa-bars text-lg" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white shadow-sm border-b sticky top-14 md:top-16 z-40">
        <div className="container-fluid px-2 md:px-4">
          <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-hide">
            {[
              { id: 'dampak', icon: 'fa-exclamation-triangle', label: 'Dampak' },
              { id: 'peta-operasi', icon: 'fa-map-marked-alt', label: 'Peta Operasi' },
              { id: 'pengungsi', icon: 'fa-users', label: 'Pengungsi' },
              { id: 'bantuan', icon: 'fa-truck', label: 'Bantuan' },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)} 
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''} px-4 py-3 text-sm font-medium whitespace-nowrap`}
              >
                <i className={`fas ${tab.icon} mr-2`} />{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 container-fluid px-2 md:px-4 py-4">
        {loading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
            <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4">
              <div className="spinner" />
              <p className="text-gray-700 font-medium">Memuat Data...</p>
            </div>
          </div>
        )}

        {/* TAB: Dampak */}
        {activeTab === 'dampak' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <KPIItem label="Total Korban" value={bencana?.total_jiwa} icon="fa-user-injured" color="primary" />
              <KPIItem label="Pengungsi" value={bencana?.total_pengungsi} icon="fa-campground" color="orange" />
              <KPIItem label="Titik Pengungsian" value={bencana?.total_titik_pengungsian} icon="fa-map-pin" color="blue" />
              <KPIItem label="Rumah Rusak" value={bencana?.total_rumah} icon="fa-home" color="red" />
              <KPIItem label="Sawah (Ha)" value={bencana?.total_sawah?.toFixed(1)} icon="fa-seedling" color="green" />
              <KPIItem label="Kabupaten Terdampak" value={bencana?.data ? new Set(bencana.data.map((d:any) => d.kabkota)).size : 0} icon="fa-city" color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-1 space-y-4">
                <div className="panel p-4 h-[250px]">
                  <h3 className="text-sm font-semibold mb-3"><i className="fas fa-chart-pie text-primary-500 mr-2" />Status Wilayah</h3>
                  <div className="h-[180px]"><canvas id="chartStatusDampak" /></div>
                </div>
                <div className="panel p-4">
                  <h3 className="text-sm font-semibold mb-3"><i className="fas fa-info-circle text-primary-500 mr-2" />Ringkasan Kerusakan</h3>
                  <div className="space-y-1">
                    <StatRow label="Fasum Rusak" value={bencana?.total_fasum} />
                    <StatRow label="Kebun (Ha)" value={bencana?.total_kebun?.toFixed(1)} />
                    <StatRow label="Tambak (Ha)" value={bencana?.total_tambak?.toFixed(1)} last />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 panel h-[520px]">
                <div id="map" className="h-full w-full" />
              </div>
              <div className="lg:col-span-1 panel p-4 overflow-auto">
                <h3 className="text-sm font-semibold mb-3"><i className="fas fa-layer-group text-primary-500 mr-2" />Rekap Cluster</h3>
                <div className="space-y-1">
                   {cluster?.cluster6?.slice(0, 8).map((c: any, i: number) => (
                     <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 text-xs">
                        <span className="text-gray-500 truncate mr-2">{c.sektor} - {c.kabupaten_kota}</span>
                        <span className="font-semibold text-primary-600">Rp {(c.nilai_kerusakan/1e6).toFixed(1)}M</span>
                     </div>
                   ))}
                   {(!cluster?.cluster6 || cluster.cluster6.length === 0) && !loading && <p className="text-xs text-gray-400 text-center py-4">Tidak ada data cluster</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Peta Operasi */}
        {activeTab === 'peta-operasi' && (
          <div className="map-fullscreen-container panel">
            <div id="mapOperasi" className="h-full w-full bg-gray-100 flex items-center justify-center">
               <p className="text-gray-400">Pilih lapisan data untuk ditampilkan pada peta operasi</p>
            </div>
            <div className="map-overlay-right">
              <div className="map-overlay-card">
                <h3><i className="fas fa-hospital text-green-500 mr-1" />Faskes</h3>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <div className="text-center p-1 bg-green-50 rounded"><div>PKM</div><div className="font-bold">{faskes.pkm.length}</div></div>
                  <div className="text-center p-1 bg-blue-50 rounded"><div>RSUD</div><div className="font-bold">{faskes.rsud.length}</div></div>
                  <div className="text-center p-1 bg-purple-50 rounded"><div>V2</div><div className="font-bold">{faskes.v2.length}</div></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-200 text-gray-600 py-6 mt-auto">
        <div className="container-fluid px-4 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <i className="fas fa-shield-alt text-primary-600" />
            <span className="text-sm font-semibold">Monitoring Bencana Hidrometeorologi Aceh</span>
          </div>
          <p className="text-xs">© 2026 Spatial Research Team</p>
        </div>
      </footer>
    </div>
  );
}

function KPIItem({ label, value, icon, color }: any) {
  const colors: any = {
    primary: 'bg-primary-100 text-primary-600',
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="kpi-card flex items-center justify-between">
      <div>
        <p className="text-[10px] md:text-xs text-gray-500 uppercase font-medium">{label}</p>
        <p className="text-lg md:text-xl font-bold text-gray-800">{value !== undefined && value !== null ? value : '-'}</p>
      </div>
      <div className={`${colors[color] || 'bg-gray-100 text-gray-600'} p-2 md:p-3 rounded-full`}>
        <i className={`fas ${icon} text-sm md:text-base`} />
      </div>
    </div>
  );
}

function StatRow({ label, value, color = 'text-gray-800', last = false }: any) {
  return (
    <div className={`flex justify-between items-center py-2 ${!last ? 'border-b border-gray-100' : ''}`}>
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-semibold ${color}`}>{value !== undefined && value !== null ? value : '-'}</span>
    </div>
  );
}
