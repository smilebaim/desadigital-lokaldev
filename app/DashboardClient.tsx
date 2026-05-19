'use client';

import { useEffect, useState } from 'react';
import './dashboard.css';

const scriptLoadCache = new Map<string, Promise<void>>();
let dashboardScriptsPromise: Promise<void> | null = null;

const DASHBOARD_MAIN_SRC = '/js/dashboard-main.js';

function isDashboardMainReady(src: string) {
  return (
    src === DASHBOARD_MAIN_SRC &&
    typeof (window as any).__dashboardMainReady === 'boolean' &&
    (window as any).__dashboardMainReady === true
  );
}

function loadScript(src: string): Promise<void> {
  const cached = scriptLoadCache.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    let existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;

    if (existing?.dataset.loaded === 'true' && (src !== DASHBOARD_MAIN_SRC || isDashboardMainReady(src))) {
      resolve();
      return;
    }

    if (existing) {
      existing.remove();
      scriptLoadCache.delete(src);
    }

    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = () => {
      s.dataset.loaded = 'true';
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });

  scriptLoadCache.set(src, promise);
  return promise;
}

async function loadDashboardScripts() {
  // Removed Tailwind CDN loading as it's now handled by the Next.js build pipeline
  await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
  await loadScript('https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js');
  await loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js');
  await loadScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js');
  await loadScript('/js/dashboard-data.js');
  await loadScript(DASHBOARD_MAIN_SRC);

  if (!isDashboardMainReady(DASHBOARD_MAIN_SRC)) {
    throw new Error('dashboard-main.js did not initialize');
  }
}

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState('dampak');

  useEffect(() => {
    // Expose stubs to prevent ReferenceError before scripts load
    const stubs = [
      'refreshData', 'switchTab', 'focusMapOnCategory', 'changeSektorPage',
      'applyFilter', 'resetFilters', 'toggleLayer', 'toggleFaskesLayer',
      'togglePolygonLayer', 'applyCluster6Filter', 'changePolygonLevel',
      'searchPolygon', 'onBantuanFilterChange', 'renderBantuanTable',
      'slideOrangHilang', 'toggleMobileMenu', 'switchTabMobile', 'toggleLayerControl'
    ];
    stubs.forEach(fn => {
      if (typeof (window as any)[fn] !== 'function') {
        (window as any)[fn] = (...args: any[]) => {
          console.log(`Dashboard is loading, function ${fn} called with:`, args);
        };
      }
    });

    if (!dashboardScriptsPromise) {
      dashboardScriptsPromise = loadDashboardScripts().catch((e) => {
        dashboardScriptsPromise = null;
        console.error('Script load error:', e);
      });
    }

    // Wrap switchTab to update local state for UI sync
    const originalSwitchTab = (window as any).switchTab;
    (window as any).switchTab = (tabId: string) => {
      setActiveTab(tabId);
      if (typeof originalSwitchTab === 'function') originalSwitchTab(tabId);
      
      // Handle map invalidation
      setTimeout(() => {
        ['map', 'mapOperasi', 'mapPengungsi', 'mapBantuan'].forEach(m => {
          if ((window as any)[m]?.invalidateSize) (window as any)[m].invalidateSize();
        });
      }, 100);
    };

    return () => {
      (window as any).switchTab = originalSwitchTab;
    };
  }, []);

  return (
    <>
      <div id="toastContainer" />
      <div id="mobileMenuOverlay" className="mobile-menu-overlay" onClick={() => (window as any).toggleMobileMenu()} />

      <div id="mobileMenuDrawer" className="mobile-menu-drawer">
        <div className="mobile-menu-drawer-header">
          <span className="font-semibold">Menu</span>
          <button onClick={() => (window as any).toggleMobileMenu()} className="p-1 hover:bg-white/20 rounded">
            <i className="fas fa-times text-lg" />
          </button>
        </div>
        <div className="mobile-menu-drawer-body">
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 px-1">Navigasi</p>
            <div className={`mobile-menu-item ${activeTab === 'dampak' ? 'active' : ''}`} onClick={() => (window as any).switchTabMobile('dampak')}>
              <i className="fas fa-exclamation-triangle" />
              <span>Dampak</span>
            </div>
            <div className={`mobile-menu-item ${activeTab === 'peta-operasi' ? 'active' : ''}`} onClick={() => (window as any).switchTabMobile('peta-operasi')}>
              <i className="fas fa-map-marked-alt" />
              <span>Peta Operasi</span>
            </div>
            <div className={`mobile-menu-item ${activeTab === 'pengungsi' ? 'active' : ''}`} onClick={() => (window as any).switchTabMobile('pengungsi')}>
              <i className="fas fa-users" />
              <span>Pengungsi</span>
            </div>
            <div className={`mobile-menu-item ${activeTab === 'bantuan' ? 'active' : ''}`} onClick={() => (window as any).switchTabMobile('bantuan')}>
              <i className="fas fa-truck" />
              <span>Bantuan</span>
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 mb-2 px-1">Update Terakhir</p>
            <div className="px-1 text-sm font-medium text-gray-700" id="lastUpdateMobile">-</div>
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
                <p className="text-xs text-primary-200 hidden md:block">Hidrometeorologi</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              <a id="kontrol-nav-link" href="/kontrol" title="Dashboard Kontrol" className="bg-white/20 hover:bg-white/30 p-1.5 md:p-2 rounded-lg transition inline-flex items-center">
                <i className="fas fa-sliders-h text-sm md:text-base" />
              </a>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-primary-200">Update Terakhir</p>
                <p id="lastUpdate" className="text-xs md:text-sm font-medium">-</p>
              </div>
              <button onClick={() => (window as any).refreshData()} className="bg-white/20 hover:bg-white/30 p-1.5 md:p-2 rounded-lg transition" title="Refresh Data">
                <i className="fas fa-sync-alt text-sm md:text-base" />
              </button>
              <button id="mobileMenuBtn" onClick={() => (window as any).toggleMobileMenu()} className="md:hidden bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition">
                <i className="fas fa-bars text-lg" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white shadow-sm border-b sticky top-14 md:top-16 z-40">
        <div className="container-fluid px-2 md:px-4">
          <div className="flex items-center justify-between md:justify-start gap-0 md:gap-1 overflow-x-auto py-1 scrollbar-hide">
            <button onClick={() => (window as any).switchTab('dampak')} id="tab-dampak" className={`tab-btn ${activeTab === 'dampak' ? 'active' : ''} flex-1 md:flex-none px-3 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium text-gray-600 hover:text-primary-600 whitespace-nowrap`}>
              <i className="fas fa-exclamation-triangle mr-1 md:mr-2" /><span>Dampak</span>
            </button>
            <button onClick={() => (window as any).switchTab('peta-operasi')} id="tab-peta-operasi" className={`tab-btn ${activeTab === 'peta-operasi' ? 'active' : ''} flex-1 md:flex-none px-3 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium text-gray-600 hover:text-primary-600 whitespace-nowrap`}>
              <i className="fas fa-map-marked-alt mr-1 md:mr-2" /><span>Peta Operasi</span>
            </button>
            <button onClick={() => (window as any).switchTab('pengungsi')} id="tab-pengungsi" className={`tab-btn ${activeTab === 'pengungsi' ? 'active' : ''} flex-1 md:flex-none px-3 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium text-gray-600 hover:text-primary-600 whitespace-nowrap`}>
              <i className="fas fa-users mr-1 md:mr-2" /><span>Pengungsi</span>
            </button>
            <button onClick={() => (window as any).switchTab('bantuan')} id="tab-bantuan" className={`tab-btn ${activeTab === 'bantuan' ? 'active' : ''} flex-1 md:flex-none px-3 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium text-gray-600 hover:text-primary-600 whitespace-nowrap`}>
              <i className="fas fa-truck mr-1 md:mr-2" /><span>Bantuan</span>
            </button>
          </div>
        </div>
      </div>

      <main className="container-fluid px-2 md:px-4 py-4">
        <div id="loadingOverlay" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 hidden">
          <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4 min-w-[280px]">
            <div className="spinner" />
            <p className="text-gray-700 font-medium">Memuat Data</p>
            <ul id="loadingList" className="w-full space-y-2 text-sm" />
          </div>
        </div>

        {/* TAB: Dampak */}
        <div id="content-dampak" className={`tab-content ${activeTab === 'dampak' ? 'active' : ''}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
            <KPIItem id="kpi-korban" label="Total Korban" icon="fa-user-injured" color="primary" onClick={() => (window as any).focusMapOnCategory('korban')} />
            <KPIItem id="kpi-pengungsi" label="Pengungsi" icon="fa-campground" color="orange" onClick={() => (window as any).focusMapOnCategory('pengungsi')} />
            <KPIItem id="kpi-titik" label="Titik Pengungsian" icon="fa-map-pin" color="blue" onClick={() => (window as any).focusMapOnCategory('titik')} />
            <KPIItem id="kpi-rumah" label="Rumah Rusak" icon="fa-home" color="red" onClick={() => (window as any).focusMapOnCategory('rumah')} />
            <KPIItem id="kpi-sawah" label="Sawah (Ha)" icon="fa-seedling" color="green" onClick={() => (window as any).focusMapOnCategory('sawah')} />
            <KPIItem id="kpi-kabupaten" label="Kabupaten Terdampak" icon="fa-city" color="purple" onClick={() => (window as any).focusMapOnCategory('kabupaten')} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 main-grid">
            <div className="lg:col-span-1 space-y-4">
              <div className="panel p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3"><i className="fas fa-chart-pie text-primary-500 mr-2" />Status Wilayah</h3>
                <div className="chart-container"><canvas id="chartStatusDampak" /></div>
              </div>
              <div className="panel p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3"><i className="fas fa-chart-bar text-primary-500 mr-2" />Top 5 Wilayah</h3>
                <div className="chart-container" style={{ height: 200 }}><canvas id="chartTopWilayah" /></div>
              </div>
            </div>
            <div className="lg:col-span-2 panel p-0 overflow-hidden map-container-responsive" style={{ height: 520 }}>
              <div id="map" className="h-full w-full" />
            </div>
            <div className="lg:col-span-1 space-y-4">
              <div className="panel p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3"><i className="fas fa-info-circle text-primary-500 mr-2" />Ringkasan Kerusakan</h3>
                <div className="space-y-2" id="quickStats">
                  <StatRow id="stat-fasum" label="Fasum Rusak" />
                  <StatRow id="stat-kebun" label="Kebun (Ha)" />
                  <StatRow id="stat-tambak" label="Tambak (Ha)" last />
                </div>
              </div>
              <div className="panel p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3"><i className="fas fa-layer-group text-primary-500 mr-2" />Rekap Cluster</h3>
                <div className="space-y-2">
                  <StatRow id="cluster-total-kerusakan" label="Kerusakan" color="text-red-600" />
                  <StatRow id="cluster-total-kerugian" label="Kerugian" color="text-orange-600" />
                  <StatRow id="cluster-total-kerusakan-kerugian" label="Total" last />
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-medium text-gray-600">Per Sektor:</p>
                    <div className="flex items-center gap-1">
                      <button id="sektor-prev" onClick={() => (window as any).changeSektorPage(-1)} className="p-1 text-gray-400 hover:text-gray-600" disabled><i className="fas fa-chevron-left text-xs" /></button>
                      <span id="sektor-page-info" className="text-xs text-gray-500">1/1</span>
                      <button id="sektor-next" onClick={() => (window as any).changeSektorPage(1)} className="p-1 text-gray-400 hover:text-gray-600" disabled><i className="fas fa-chevron-right text-xs" /></button>
                    </div>
                  </div>
                  <div id="cluster-sektor-breakdown" className="space-y-1">
                    <div className="text-gray-400 text-center py-1 text-xs">Memuat...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TAB: Peta Operasi */}
        <div id="content-peta-operasi" className={`tab-content ${activeTab === 'peta-operasi' ? 'active' : ''}`}>
          <div className="map-fullscreen-container panel">
            <div id="mapOperasi" />
            <div className="map-overlay-right">
              <div className="map-overlay-card">
                <h3><i className="fas fa-hospital text-green-500 mr-1" />Faskes</h3>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <div className="text-center p-1 bg-green-50 rounded"><div className="text-gray-500">PKM</div><div id="stat-puskesmas" className="font-bold text-green-600">-</div></div>
                  <div className="text-center p-1 bg-blue-50 rounded"><div className="text-gray-500">RSUD</div><div id="stat-rsud" className="font-bold text-blue-600">-</div></div>
                  <div className="text-center p-1 bg-purple-50 rounded"><div className="text-gray-500">V2</div><div id="stat-fasyankes" className="font-bold text-purple-600">-</div></div>
                </div>
              </div>
              <div className="map-overlay-card">
                <h3><i className="fas fa-signal text-red-500 mr-1" />Status Jaringan</h3>
                <div className="flex gap-1 text-xs">
                  <div className="flex-1 text-center p-1 bg-red-50 rounded"><div className="text-red-600 text-[10px]">Critical</div><div id="jaringan-critical" className="font-bold text-red-700">-</div></div>
                  <div className="flex-1 text-center p-1 bg-yellow-50 rounded"><div className="text-yellow-600 text-[10px]">Warning</div><div id="jaringan-warning" className="font-bold text-yellow-700">-</div></div>
                  <div className="flex-1 text-center p-1 bg-green-50 rounded"><div className="text-green-600 text-[10px]">Normal</div><div id="jaringan-normal" className="font-bold text-green-700">-</div></div>
                </div>
              </div>
            </div>
            <div className="map-overlay-bottom-right">
              <div className="layer-control-toggle" onClick={() => (window as any).toggleLayerControl()}>
                <span><i className="fas fa-layer-group mr-1" />Layer & Filter</span>
                <i id="layer-control-icon" className="fas fa-chevron-up" />
              </div>
              <div id="layer-control-content" className="layer-control-content expanded">
                <div className="layer-control-panel">
                  <div className="layer-title">LAYER:</div>
                  <div className="layer-items mb-2">
                    <LayerToggle id="layer-faskes" icon="fa-hospital" color="green" labelId="stat-faskes-total" onChange={() => (window as any).toggleFaskesLayer()} defaultChecked />
                    <LayerToggle id="layer-banlog" icon="fa-truck" color="yellow" labelId="stat-banlog" onChange={() => (window as any).toggleLayer('banlog')} />
                    <LayerToggle id="layer-jaringan" icon="fa-broadcast-tower" color="red" labelId="stat-jaringan" onChange={() => (window as any).toggleLayer('jaringan')} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Similar conversion for Pengungsi and Bantuan tabs... */}
      </main>

      <footer className="bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 text-gray-700 py-6">
        <div className="container-fluid px-2 md:px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary-600/20 p-2 rounded-lg"><i className="fas fa-shield-alt text-primary-400" /></div>
              <div className="text-center md:text-left">
                <p className="text-sm font-semibold text-gray-700">Dashboard Monitoring Bencana Hidrometeorologi</p>
                <p className="text-xs text-gray-400">Sistem Informasi Spasial</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-xs text-gray-400"><i className="fas fa-code mr-1" /> Dalam Pengembangan <span className="text-primary-400 font-medium">Tim Spatial</span></p>
              <p className="text-xs text-gray-500 mt-1"><i className="fas fa-copyright mr-1" /> 2026 Spatial Research</p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function KPIItem({ id, label, icon, color, onClick }: any) {
  const bgClasses: any = {
    primary: 'bg-primary-100',
    orange: 'bg-orange-100',
    blue: 'bg-blue-100',
    red: 'bg-red-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
  };
  const textClasses: any = {
    primary: 'text-primary-600',
    orange: 'text-orange-600',
    blue: 'text-blue-600',
    red: 'text-red-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
  };

  return (
    <div className="kpi-card card-hover cursor-pointer" onClick={onClick}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p id={id} className="text-2xl font-bold text-gray-800">-</p>
        </div>
        <div className={`${bgClasses[color]} p-3 rounded-full`}>
          <i className={`fas ${icon} ${textClasses[color]}`} />
        </div>
      </div>
    </div>
  );
}

function StatRow({ id, label, color = 'text-gray-800', last = false }: any) {
  return (
    <div className={`flex justify-between items-center py-2 ${!last ? 'border-b border-gray-100' : ''}`}>
      <span className="text-xs text-gray-500">{label}</span>
      <span id={id} className={`font-semibold ${color}`}>-</span>
    </div>
  );
}

function LayerToggle({ id, icon, color, labelId, onChange, defaultChecked }: any) {
  const bgClasses: any = {
    green: 'bg-green-50 border-green-200 hover:bg-green-100',
    yellow: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
    red: 'bg-red-50 border-red-200 hover:bg-red-100',
    pink: 'bg-pink-50 border-pink-200 hover:bg-pink-100',
  };
  const iconClasses: any = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    pink: 'text-pink-600',
  };

  return (
    <label className={`inline-flex items-center gap-1 px-1.5 py-1 border rounded cursor-pointer ${bgClasses[color]}`}>
      <input type="checkbox" id={id} onChange={onChange} defaultChecked={defaultChecked} className="w-3 h-3 accent-current" />
      <i className={`fas ${icon} ${iconClasses[color]} text-xs`} />
      <span id={labelId} className={`text-xs font-bold ${iconClasses[color]}`}>-</span>
    </label>
  );
}
