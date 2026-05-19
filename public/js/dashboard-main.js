// =====================================================
// POPUP PAGINATION STATE & FUNCTIONS
// =====================================================
window.popupPageState = window.popupPageState || {};

function changePopupPage(popupId, delta) {
  if (!window.popupPageState[popupId]) {
    window.popupPageState[popupId] = 1;
  }

  const totalPages = 2;
  const newPage = window.popupPageState[popupId] + delta;

  if (newPage < 1 || newPage > totalPages) return;

  window.popupPageState[popupId] = newPage;

  // Hide all pages, show current
  for (let i = 1; i <= totalPages; i++) {
    const pageEl = document.getElementById(`${popupId}-page-${i}`);
    if (pageEl) {
      pageEl.style.display = i === newPage ? 'block' : 'none';
    }
  }

  // Update page info
  const pageInfoEl = document.getElementById(`${popupId}-page-info`);
  if (pageInfoEl) {
    pageInfoEl.textContent = `${newPage}/${totalPages}`;
  }
}

// =====================================================
// CONFIGURATION
// =====================================================
const CONFIG = {
  // Use relative path since served from same server
  API_BASE: window.location.origin + '/api',
  // Supabase config moved to server-side proxy for security & performance
  GEOJSON_URL: 'https://php.ckan-dev.siat.web.id/geojson-kotakab-aceh.json',
  REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  MAP_CENTER: [4.695135, 96.749397],
  MAP_ZOOM: 8,
};

// =====================================================
// GLOBAL STATE
// =====================================================
let state = {
  currentTab: 'dampak',
  currentMenu: 'beranda',
  globalFilter: {
    kabupaten: '',
  },
  dampakPolygonLevel: 2, // Default to kabupaten level (2=kabkota, 3=kec, 4=desa)
  data: {
    bencana: null,
    banlog: null,
    jaringan: null,
    puskesmas: null,
    rsud: null,
    fasyankesV2: null,
    cluster6: null,
    cluster1: null,
    cluster6Icons: null,
    clusterSummary: null,
    penduduk: null,
    pendudukDisabilitas: null,
    pendudukKK: null,
    pendudukUmur: null,
    pendudukSummary: null,
    banjirDetail: null,
    posko: null,
    poskoSummary: null,
    orangHilang: null,
    orangHilangSummary: null,
    pertanian: null,
    pertanianSummary: null,
    tenda: null,
    fasilitasPublik: null,
    fasilitasPublikByType: null,
    villageDistribution: null,
  },
  maps: {},
  layers: {},
  charts: {},
  // Tab loading state - tracks which tabs have been loaded
  tabLoaded: {
    dampak: false,
    'peta-operasi': false,
    pengungsi: false,
    bantuan: false,
  },
  // Tab loading in progress - prevents double loading
  tabLoading: {
    dampak: false,
    'peta-operasi': false,
    pengungsi: false,
    bantuan: false,
  },
};

// =====================================================
// LOCALSTORAGE CACHE SYSTEM
// =====================================================
const localCache = {
  prefix: 'bencana_dashboard_',
  // TTL in milliseconds (default 5 minutes for dynamic data, 30 minutes for static)
  ttl: {
    default: 5 * 60 * 1000,
    static: 30 * 60 * 1000,
    penduduk: 60 * 60 * 1000, // 1 hour for penduduk data (rarely changes)
  },

  /**
   * Get item from localStorage with TTL check
   */
  get(key) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      if (Date.now() > parsed.expiry) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }
      console.log(`[LocalCache] Hit: ${key}`);
      return parsed.data;
    } catch (e) {
      console.warn(`[LocalCache] Error reading ${key}:`, e);
      return null;
    }
  },

  /**
   * Set item in localStorage with TTL
   */
  set(key, data, ttlType = 'default') {
    const ttl = this.ttl[ttlType] || this.ttl.default;
    const item = {
      data,
      expiry: Date.now() + ttl,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
      console.log(`[LocalCache] Set: ${key} (TTL: ${ttl / 1000}s)`);
    } catch (e) {
      // Handle quota exceeded
      if (e.name === 'QuotaExceededError') {
        console.warn(`[LocalCache] Storage quota exceeded for "${key}", clearing old items`);
        this.clearOldest();
        try {
          localStorage.setItem(this.prefix + key, JSON.stringify(item));
          console.log(`[LocalCache] Set after cleanup: ${key} (TTL: ${ttl / 1000}s)`);
        } catch (e2) {
          // Still failed after cleanup - data too large
          const sizeKB = (JSON.stringify(item).length / 1024).toFixed(2);
          console.warn(
            `[LocalCache] Skipped localStorage for "${key}" (${sizeKB} KB) - data too large. Using memory cache only.`
          );
          // Data is still in memory cache (apiCache), so app will still work
        }
      } else {
        // Log other localStorage errors
        console.error('[LocalCache] Error setting cache:', e);
      }
    }
  },

  /**
   * Clear specific key
   */
  clear(key) {
    localStorage.removeItem(this.prefix + key);
  },

  /**
   * Clear all cache
   */
  clearAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.prefix))
      .forEach(k => localStorage.removeItem(k));
    console.log('[LocalCache] All cache cleared');
  },

  /**
   * Clear oldest items when quota exceeded
   */
  clearOldest() {
    const items = [];
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.prefix))
      .forEach(k => {
        try {
          const parsed = JSON.parse(localStorage.getItem(k));
          const size = localStorage.getItem(k).length;
          items.push({ key: k, timestamp: parsed.timestamp || 0, size });
        } catch (e) {
          localStorage.removeItem(k);
        }
      });

    // Sort by timestamp (oldest first) and remove oldest 75% (more aggressive)
    items.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = Math.ceil(items.length * 0.75); // Increased from 50% to 75%
    const removed = items.slice(0, toRemove);
    removed.forEach(item => localStorage.removeItem(item.key));

    const totalSizeCleared = removed.reduce((sum, item) => sum + item.size, 0);
    console.log(`[LocalCache] Cleared ${toRemove}/${items.length} oldest items (${(totalSizeCleared / 1024).toFixed(2)} KB freed)`);
  },

  /**
   * Get cache stats
   */
  stats() {
    let count = 0;
    let size = 0;
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.prefix))
      .forEach(k => {
        count++;
        size += localStorage.getItem(k).length;
      });
    return { count, size: (size / 1024).toFixed(2) + ' KB' };
  }
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
function showLoading() {
  document.getElementById('loadingOverlay').classList.remove('hidden');
}

function initLoadingList(items) {
  const list = document.getElementById('loadingList');
  if (!list) return;
  list.innerHTML = items
    .map(
      (item, index) => `
      <li id="loading-item-${index}" class="flex items-center gap-2 text-gray-400">
        <i class="fas fa-circle text-[8px]"></i>
        <span>${item}</span>
      </li>
    `
    )
    .join('');
}

function updateLoadingItem(index, status) {
  const item = document.getElementById(`loading-item-${index}`);
  if (!item) return;
  if (status === 'loading') {
    item.className = 'flex items-center gap-2 text-blue-600';
    item.querySelector('i').className = 'fas fa-spinner fa-spin text-[10px]';
  } else if (status === 'done') {
    item.className = 'flex items-center gap-2 text-green-600';
    item.querySelector('i').className = 'fas fa-check text-[10px]';
  } else if (status === 'error') {
    item.className = 'flex items-center gap-2 text-red-600';
    item.querySelector('i').className = 'fas fa-times text-[10px]';
  }
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}

// Skeleton loading for KPI cards
function showSkeletons() {
  document.querySelectorAll('.kpi-card').forEach((card) => {
    if (card.classList.contains('skeleton-card')) return;
    // Store original content
    card.dataset.originalContent = card.innerHTML;
    // Remove shadow and add skeleton card
    card.classList.add('skeleton-card');
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <div class="skeleton skeleton-text-sm mb-2"></div>
          <div class="skeleton skeleton-text"></div>
        </div>
        <div class="skeleton skeleton-icon"></div>
      </div>
    `;
  });
}

function hideSkeletons() {
  document.querySelectorAll('.kpi-card.skeleton-card').forEach((card) => {
    // Restore original content
    if (card.dataset.originalContent) {
      card.innerHTML = card.dataset.originalContent;
      delete card.dataset.originalContent;
    }
    card.classList.remove('skeleton-card');
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-orange-500',
    info: 'bg-blue-500',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${colors[type]} text-white p-4 rounded-lg shadow-lg`;
  toast.innerHTML = `
                <div class="flex items-center justify-between gap-3">
                    <span class="text-sm">${message}</span>
                    <button onclick="this.parentElement.parentElement.remove()" class="hover:opacity-70">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function formatNumber(num) {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('id-ID').format(num);
}

function updateLastUpdate() {
  const now = new Date();
  document.getElementById('lastUpdate').textContent = now.toLocaleTimeString(
    'id-ID',
    { hour: '2-digit', minute: '2-digit' }
  );
}

function formatRupiah(num) {
  // Handle NaN, undefined, null, empty string, and invalid values
  const value = Number(num);
  if (num === null || num === undefined || num === '' || isNaN(value)) return 'Rp 0';
  if (value === 0) return 'Rp 0';
  if (value >= 1e12) return 'Rp ' + (value / 1e12).toFixed(2) + ' T';
  if (value >= 1e9) return 'Rp ' + (value / 1e9).toFixed(2) + ' M';
  if (value >= 1e6) return 'Rp ' + (value / 1e6).toFixed(2) + ' Jt';
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(value);
}

// =====================================================
// CLUSTER SUMMARY FUNCTIONS
// =====================================================
function calculateClusterSummary(cluster6Data) {
  if (!cluster6Data || !Array.isArray(cluster6Data) || cluster6Data.length === 0) {
    return {
      total_records: 0,
      total_kerusakan: 0,
      total_kerugian: 0,
      total_kerusakan_kerugian: 0,
      by_sektor: {},
      by_kabupaten: {},
      by_status: {},
    };
  }

  const bySektor = {};
  const byKabupaten = {};
  const byStatus = {};
  let totalKerusakan = 0;
  let totalKerugian = 0;
  let totalKerusakanKerugian = 0;

  cluster6Data.forEach((item) => {
    // By sektor - aggregate nilai kerusakan
    const sektor = item.sektor || 'Lainnya';
    if (!bySektor[sektor]) {
      bySektor[sektor] = { count: 0, kerusakan: 0, kerugian: 0 };
    }
    bySektor[sektor].count++;
    bySektor[sektor].kerusakan += Number(item.nilai_kerusakan) || 0;
    bySektor[sektor].kerugian += Number(item.nilai_kerugian) || 0;

    // By kabupaten (support both old and new field names)
    const kab = item.kabupaten_kota || item.kotakab || item.kabupaten || 'Lainnya';
    if (!byKabupaten[kab]) {
      byKabupaten[kab] = { count: 0, kerusakan: 0, kerugian: 0 };
    }
    byKabupaten[kab].count++;
    byKabupaten[kab].kerusakan += Number(item.nilai_kerusakan) || 0;
    byKabupaten[kab].kerugian += Number(item.nilai_kerugian) || 0;

    // By status
    const status = item.status || 'Tidak Diketahui';
    if (!byStatus[status]) {
      byStatus[status] = 0;
    }
    byStatus[status]++;

    // Totals
    totalKerusakan += Number(item.nilai_kerusakan) || 0;
    totalKerugian += Number(item.nilai_kerugian) || 0;
    totalKerusakanKerugian += Number(item.total_kerusakan_kerugian) || 0;
  });

  return {
    total_records: cluster6Data.length,
    total_kerusakan: totalKerusakan,
    total_kerugian: totalKerugian,
    total_kerusakan_kerugian: totalKerusakanKerugian,
    by_sektor: bySektor,
    by_kabupaten: byKabupaten,
    by_status: byStatus,
  };
}

// Sektor pagination state
const sektorPagination = {
  currentPage: 1,
  perPage: 5,
  totalPages: 1,
  allEntries: [],
};

function updateClusterSummaryUI() {
  const summary = state.data.clusterSummary;
  if (!summary) return;

  // Update total kerusakan
  const kerusakanEl = document.getElementById('cluster-total-kerusakan');
  if (kerusakanEl) kerusakanEl.textContent = formatRupiah(summary.total_kerusakan);

  // Update total kerugian
  const kerugianEl = document.getElementById('cluster-total-kerugian');
  if (kerugianEl) kerugianEl.textContent = formatRupiah(summary.total_kerugian);

  // Update total kerusakan + kerugian
  const totalKKEl = document.getElementById('cluster-total-kerusakan-kerugian');
  if (totalKKEl) totalKKEl.textContent = formatRupiah(summary.total_kerusakan + summary.total_kerugian);

  // Update sektor breakdown with pagination
  if (summary.by_sektor) {
    sektorPagination.allEntries = Object.entries(summary.by_sektor)
      .sort((a, b) => b[1].kerusakan - a[1].kerusakan);
    sektorPagination.totalPages = Math.ceil(sektorPagination.allEntries.length / sektorPagination.perPage);
    sektorPagination.currentPage = 1;
    renderSektorBreakdown();
  }
}

function renderSektorBreakdown() {
  const sektorContainer = document.getElementById('cluster-sektor-breakdown');
  if (!sektorContainer) return;

  const { currentPage, perPage, totalPages, allEntries } = sektorPagination;

  if (allEntries.length === 0) {
    sektorContainer.innerHTML = '<div class="text-gray-400 text-center py-1 text-xs">Tidak ada data</div>';
    updateSektorPaginationUI();
    return;
  }

  const startIdx = (currentPage - 1) * perPage;
  const endIdx = startIdx + perPage;
  const pageEntries = allEntries.slice(startIdx, endIdx);

  sektorContainer.innerHTML = pageEntries
    .map(
      ([sektor, data]) => `
      <div class="flex justify-between items-center py-1 text-xs">
        <span class="text-gray-600 truncate max-w-[100px]" title="${sektor}">${sektor}</span>
        <span class="font-semibold text-gray-800">${formatRupiah(data.kerusakan)}</span>
      </div>
    `
    )
    .join('');

  updateSektorPaginationUI();
}

function updateSektorPaginationUI() {
  const { currentPage, totalPages } = sektorPagination;
  const prevBtn = document.getElementById('sektor-prev');
  const nextBtn = document.getElementById('sektor-next');
  const pageInfo = document.getElementById('sektor-page-info');

  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  if (pageInfo) pageInfo.textContent = `${currentPage}/${totalPages || 1}`;
}

function changeSektorPage(delta) {
  const newPage = sektorPagination.currentPage + delta;
  if (newPage >= 1 && newPage <= sektorPagination.totalPages) {
    sektorPagination.currentPage = newPage;
    renderSektorBreakdown();
  }
}

function renderPertanianTable() {
  const data = state.data.pertanian || [];
  const tbody = document.getElementById('tablePertanian');
  const totalEl = document.getElementById('pertanian-total');
  const beratEl = document.getElementById('pertanian-berat');
  const sedangEl = document.getElementById('pertanian-sedang');
  const ringanEl = document.getElementById('pertanian-ringan');

  if (!tbody) return;

  // Calculate summary
  let berat = 0, sedang = 0, ringan = 0;
  data.forEach(item => {
    berat += Number(item.kerusakan_berat) || 0;
    sedang += Number(item.kerusakan_sedang) || 0;
    ringan += Number(item.kerusakan_ringan) || 0;
  });

  // Update summary KPIs
  if (totalEl) totalEl.textContent = formatNumber(data.length);
  if (beratEl) beratEl.textContent = formatNumber(berat);
  if (sedangEl) sedangEl.textContent = formatNumber(sedang);
  if (ringanEl) ringanEl.textContent = formatNumber(ringan);

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-gray-400">Tidak ada data pertanian</td></tr>';
    return;
  }

  // Helper to get kondisi badge
  const getKondisiBadge = (item) => {
    const berat = Number(item.kerusakan_berat) || 0;
    const sedang = Number(item.kerusakan_sedang) || 0;
    const ringan = Number(item.kerusakan_ringan) || 0;

    const badges = [];
    if (berat > 0) badges.push(`<span class="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">RB: ${berat}</span>`);
    if (sedang > 0) badges.push(`<span class="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">RS: ${sedang}</span>`);
    if (ringan > 0) badges.push(`<span class="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">RR: ${ringan}</span>`);

    return badges.length > 0 ? badges.join(' ') : '<span class="text-gray-400">-</span>';
  };

  tbody.innerHTML = data.map(item => `
    <tr class="border-b border-gray-100 hover:bg-gray-50">
      <td class="p-2 font-medium">${item.nama || '-'}</td>
      <td class="p-2">${item.kabkota || '-'}</td>
      <td class="p-2">${item.kecamatan || '-'}</td>
      <td class="p-2 text-right">${item.volume ? `${formatNumber(item.volume)} ${item.satuan || ''}` : '-'}</td>
      <td class="p-2 text-right">${item.taksir_kerugian ? formatRupiah(item.taksir_kerugian) : '-'}</td>
      <td class="p-2 text-center">${getKondisiBadge(item)}</td>
    </tr>
  `).join('');
}

// =====================================================
// API FUNCTIONS WITH CACHING & PERFORMANCE OPTIMIZATION
// =====================================================

// Frontend cache for API responses
const apiCache = {
  data: new Map(),
  ttl: 60 * 1000, // 1 minute cache TTL

  get(key) {
    const cached = this.data.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.value;
    }
    this.data.delete(key);
    return null;
  },

  set(key, value) {
    this.data.set(key, { value, timestamp: Date.now() });
  },

  clear() {
    this.data.clear();
  }
};

// Debounce function for preventing rapid API calls
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Fetch with caching and abort controller for cancellation
async function fetchAPI(endpoint, useCache = true) {
  const cacheKey = `api:${endpoint}`;

  // Check cache first
  if (useCache) {
    const cached = apiCache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit: ${endpoint}`);
      return cached;
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'max-age=60'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    // Cache the result
    if (useCache) {
      apiCache.set(cacheKey, data);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`Request timeout: ${endpoint}`);
    } else {
      console.error(`Error fetching ${endpoint}:`, error);
    }
    return null;
  }
}

async function fetchSupabase(table, params = '', options = {}) {
  // Now uses server-side proxy to avoid CORS and large payload issues
  const cacheKey = `supabase:${table}:${options.limit || 50}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${CONFIG.API_BASE}/supabase/table/${table}?page=1&perPage=${options.limit || 50}`
    );
    if (!response.ok) throw new Error(`Proxy HTTP ${response.status}`);
    const result = await response.json();
    const data = {
      data: result.data,
      total: result.total,
      limit: result.per_page,
      offset: (result.page - 1) * result.per_page,
    };
    apiCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching ${table} via proxy:`, error);
    return { data: null, total: 0, limit: 0, offset: 0 };
  }
}

// Fetch Supabase data per endpoint (separated for better loading progress)
// Now with localStorage caching for better performance
async function fetchSupabaseEndpoint(endpoint, cacheKey, useLocalStorage = true, localStorageTTL = 'default') {
  // Check memory cache first
  const memoryCached = apiCache.get(cacheKey);
  if (memoryCached) {
    console.log(`[Memory] Cache hit: ${cacheKey}`);
    return memoryCached;
  }

  // Check localStorage cache
  if (useLocalStorage) {
    const localCached = localCache.get(cacheKey);
    if (localCached) {
      // Also set in memory cache for faster subsequent access
      apiCache.set(cacheKey, localCached);
      return localCached;
    }
  }

  try {
    const response = await fetch(`${CONFIG.API_BASE}/supabase/${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'max-age=60'
      }
    });
    if (!response.ok) throw new Error(`Proxy HTTP ${response.status}`);
    const data = await response.json();

    // Set in memory cache
    apiCache.set(cacheKey, data);

    // Set in localStorage if enabled
    if (useLocalStorage) {
      localCache.set(cacheKey, data, localStorageTTL);
    }

    return data;
  } catch (error) {
    console.error(`Error fetching Supabase ${endpoint}:`, error);
    return null;
  }
}

// Individual Supabase fetch functions with appropriate TTL
function fetchPendudukData() {
  // Penduduk data rarely changes - use longer TTL
  return fetchSupabaseEndpoint('penduduk', 'supabase:penduduk', true, 'penduduk');
}

function fetchClusterData() {
  // Cluster data is large (~5MB), use memory cache only to avoid QuotaExceededError
  return fetchSupabaseEndpoint('cluster', 'supabase:cluster', false, 'static');
}

function fetchPoskoData() {
  return fetchSupabaseEndpoint('posko', 'supabase:posko', true, 'default');
}

function fetchOrangHilangData() {
  return fetchSupabaseEndpoint('orang-hilang', 'supabase:orang-hilang', true, 'default');
}

function fetchPertanianData() {
  // Pertanian data can be large, use memory cache only
  return fetchSupabaseEndpoint('pertanian', 'supabase:pertanian', false, 'static');
}

function fetchTendaData() {
  return fetchSupabaseEndpoint('lokasi-tenda', 'supabase:tenda', true, 'static');
}

function fetchFasilitasPublikData() {
  return fetchSupabaseEndpoint('fasilitas-publik', 'supabase:fasilitas-publik', true, 'static');
}

function fetchVillageDistributionData() {
  // Village distribution data is large, use memory cache only to avoid QuotaExceededError
  return fetchSupabaseEndpoint('village-distribution', 'supabase:village-distribution', false, 'static');
}

// =====================================================
// TAB-SPECIFIC LAZY DATA LOADING
// =====================================================

/**
 * Data sources grouped by tab
 * Each tab only loads the data it needs
 */
const TAB_DATA_SOURCES = {
  dampak: {
    sources: [
      { key: 'bencana', label: 'Data Bencana', fetch: () => fetchAPI('/realtime/bencana') },
      { key: 'clusterData', label: 'Data Cluster/Kerusakan', fetch: () => fetchClusterData() },
      { key: 'pertanianData', label: 'Data Pertanian', fetch: () => fetchPertanianData() },
    ],
    process: (results) => {
      const clusterData = results.clusterData;
      const cluster6Data = clusterData?.cluster6 || [];
      const clusterSummary = calculateClusterSummary(cluster6Data);

      Object.assign(state.data, {
        bencana: results.bencana,
        cluster6: cluster6Data,
        cluster1: clusterData?.cluster1 || [],
        cluster6Icons: clusterData?.cluster6Icons || [],
        clusterSummary: clusterSummary,
        pertanian: results.pertanianData?.data || [],
        pertanianSummary: results.pertanianData?.summary || {},
      });
    }
  },
  'peta-operasi': {
    sources: [
      { key: 'jaringan', label: 'Data Jaringan', fetch: () => fetchAPI('/realtime/jaringan') },
      { key: 'puskesmas', label: 'Data Puskesmas', fetch: () => fetchAPI('/realtime/puskesmas') },
      { key: 'rsud', label: 'Data RSUD', fetch: () => fetchAPI('/realtime/rsud') },
      { key: 'fasyankesV2', label: 'Data Fasyankes', fetch: () => fetchAPI('/realtime/v2') },
      { key: 'clusterData', label: 'Data Cluster/Kerusakan', fetch: () => fetchClusterData() },
      { key: 'poskoData', label: 'Data Posko', fetch: () => fetchPoskoData() },
      { key: 'tendaData', label: 'Data Lokasi Tenda', fetch: () => fetchTendaData() },
      { key: 'fasilitasPublikData', label: 'Data Fasilitas Publik', fetch: () => fetchFasilitasPublikData() },
      { key: 'villageDistributionData', label: 'Data Distribusi Desa', fetch: () => fetchVillageDistributionData() },
    ],
    process: (results) => {
      const clusterData = results.clusterData;
      const cluster6Data = clusterData?.cluster6 || [];
      const clusterSummary = calculateClusterSummary(cluster6Data);

      // DEBUG: Log data yang diterima
      console.log('[Peta Operasi] Data received:', {
        jaringan: results.jaringan ? '✓' : '❌ NULL',
        puskesmas: results.puskesmas?.data?.length || 0,
        rsud: results.rsud?.data?.length || 0,
        fasyankesV2: results.fasyankesV2?.data?.length || 0,
        cluster6: cluster6Data.length,
        posko: results.poskoData?.data?.length || 0,
        tenda: results.tendaData?.data?.length || 0,
        fasilitasPublik: results.fasilitasPublikData?.data?.length || 0,
        villageDistribution: results.villageDistributionData?.data?.length || 0,
      });

      Object.assign(state.data, {
        jaringan: results.jaringan,
        puskesmas: results.puskesmas,
        rsud: results.rsud,
        fasyankesV2: results.fasyankesV2,
        cluster6: cluster6Data,
        cluster1: clusterData?.cluster1 || [],
        cluster6Icons: clusterData?.cluster6Icons || [],
        clusterSummary: clusterSummary,
        posko: results.poskoData?.data || [],
        poskoSummary: results.poskoData?.summary || {},
        tenda: results.tendaData?.data || [],
        fasilitasPublik: results.fasilitasPublikData?.data || [],
        villageDistribution: results.villageDistributionData?.data || [],
      });

      // DEBUG: Log state setelah di-assign
      console.log('[Peta Operasi] State after assign:', {
        posko: state.data.posko?.length || 0,
        rsud: state.data.rsud?.data?.length || 0,
        puskesmas: state.data.puskesmas?.data?.length || 0,
      });
    }
  },
  pengungsi: {
    sources: [
      { key: 'bencana', label: 'Data Bencana', fetch: () => fetchAPI('/realtime/bencana') },
      { key: 'pendudukData', label: 'Data Penduduk', fetch: () => fetchPendudukData() },
      { key: 'orangHilangData', label: 'Data Orang Hilang', fetch: () => fetchOrangHilangData() },
    ],
    process: (results) => {
      const pendudukData = results.pendudukData;

      // DEBUG: Log data yang diterima
      console.log('[Pengungsi] Data received:', {
        bencana: results.bencana?.data?.length || 0,
        penduduk: pendudukData?.penduduk?.length || 0,
        pendudukKK: pendudukData?.penduduk_kk?.length || 0,
        pendudukDisabilitas: pendudukData?.penduduk_disabilitas?.length || 0,
        orangHilang: results.orangHilangData?.data?.length || 0,
      });

      Object.assign(state.data, {
        bencana: results.bencana,
        penduduk: pendudukData?.penduduk || [],
        pendudukDisabilitas: pendudukData?.penduduk_disabilitas || [],
        pendudukKK: pendudukData?.penduduk_kk || [],
        pendudukUmur: pendudukData?.penduduk_umur || [],
        pendudukSummary: pendudukData?.summary || {},
        orangHilang: results.orangHilangData?.data || [],
        orangHilangSummary: results.orangHilangData?.summary || {},
      });

      // DEBUG: Log state setelah di-assign
      console.log('[Pengungsi] State after assign:', {
        bencana: state.data.bencana?.data?.length || 0,
        penduduk: state.data.penduduk?.length || 0,
        orangHilang: state.data.orangHilang?.length || 0,
      });
    }
  },
  bantuan: {
    sources: [
      { key: 'banlog', label: 'Data Bantuan Logistik', fetch: () => fetchAPI('/realtime/bantuan-logistik') },
    ],
    process: (results) => {
      Object.assign(state.data, {
        banlog: results.banlog,
      });
    }
  }
};

/**
 * Load data for a specific tab
 * Uses lazy loading - only loads data when tab is first accessed
 */
async function loadTabData(tabId, forceReload = false) {
  // Check if already loaded and not forcing reload
  if (state.tabLoaded[tabId] && !forceReload) {
    console.log(`[TabLoader] Tab "${tabId}" already loaded, skipping`);
    return true;
  }

  // Check if loading is in progress
  if (state.tabLoading[tabId]) {
    console.log(`[TabLoader] Tab "${tabId}" is already loading, skipping`);
    return true;
  }

  const tabConfig = TAB_DATA_SOURCES[tabId];
  if (!tabConfig) {
    console.warn(`[TabLoader] No config found for tab "${tabId}"`);
    return false;
  }

  state.tabLoading[tabId] = true;
  console.log(`[TabLoader] Loading data for tab "${tabId}"...`);

  // Show loading state (smaller/inline for tab switch)
  const isInitialLoad = !Object.values(state.tabLoaded).some(v => v);
  if (isInitialLoad) {
    initLoadingList(tabConfig.sources.map(s => s.label));
    showLoading();
    showSkeletons();
  } else {
    showToast(`Memuat data ${tabId}...`, 'info');
  }

  try {
    const results = {};

    // Set all items to loading state
    if (isInitialLoad) {
      tabConfig.sources.forEach((_, i) => updateLoadingItem(i, 'loading'));
    }

    // Parallel fetch all sources for this tab
    const fetchPromises = tabConfig.sources.map(async (source, index) => {
      try {
        const data = await source.fetch();
        if (isInitialLoad) updateLoadingItem(index, 'done');
        return { key: source.key, data, success: true };
      } catch (err) {
        if (isInitialLoad) updateLoadingItem(index, 'error');
        console.error(`[TabLoader] Error loading ${source.label}:`, err);
        return { key: source.key, data: null, success: false };
      }
    });

    const fetchResults = await Promise.all(fetchPromises);

    // Map results to object
    fetchResults.forEach(({ key, data }) => {
      results[key] = data;
    });

    // Process results with tab-specific logic
    tabConfig.process(results);

    // Mark tab as loaded
    state.tabLoaded[tabId] = true;
    state.tabLoading[tabId] = false;

    updateLastUpdate();

    // Populate global filter only if bencana data was loaded
    if (results.bencana) {
      populateGlobalFilterKabupaten();
    }

    if (!isInitialLoad) {
      showToast('Data berhasil dimuat', 'success');
    }

    return true;
  } catch (error) {
    console.error(`[TabLoader] Error loading tab "${tabId}":`, error);
    state.tabLoading[tabId] = false;
    showToast('Gagal memuat data', 'error');
    return false;
  } finally {
    if (isInitialLoad) {
      hideLoading();
      hideSkeletons();
    }
  }
}

/**
 * Load all data (for backward compatibility and full refresh)
 * Now uses tab-specific loading internally
 */
async function loadAllData() {
  console.log('[LoadAllData] Loading all tabs data...');

  // Reset tab loaded states
  Object.keys(state.tabLoaded).forEach(key => {
    state.tabLoaded[key] = false;
  });

  // Combine all unique sources from all tabs
  const allSources = [];
  const seenKeys = new Set();

  Object.values(TAB_DATA_SOURCES).forEach(tabConfig => {
    tabConfig.sources.forEach(source => {
      if (!seenKeys.has(source.key)) {
        seenKeys.add(source.key);
        allSources.push(source);
      }
    });
  });

  // Initialize loading list and show skeletons
  initLoadingList(allSources.map(s => s.label));
  showLoading();
  showSkeletons();

  try {
    const results = {};

    // Set all items to loading state
    allSources.forEach((_, i) => updateLoadingItem(i, 'loading'));

    // Parallel fetch all sources
    const fetchPromises = allSources.map(async (source, index) => {
      try {
        const data = await source.fetch();
        updateLoadingItem(index, 'done');
        return { key: source.key, data, success: true };
      } catch (err) {
        updateLoadingItem(index, 'error');
        console.error(`Error loading ${source.label}:`, err);
        return { key: source.key, data: null, success: false };
      }
    });

    const fetchResults = await Promise.all(fetchPromises);

    // Map results
    fetchResults.forEach(({ key, data }) => {
      results[key] = data;
    });

    // Process results for each tab
    Object.entries(TAB_DATA_SOURCES).forEach(([tabId, config]) => {
      config.process(results);
      state.tabLoaded[tabId] = true;
    });

    updateLastUpdate();
    populateGlobalFilterKabupaten();

    showToast('Data berhasil dimuat', 'success');
    return true;
  } catch (error) {
    console.error('Error loading data:', error);
    showToast('Gagal memuat data', 'error');
    return false;
  } finally {
    hideLoading();
    hideSkeletons();
  }
}

// =====================================================
// TAB & MENU NAVIGATION
// =====================================================
async function switchTab(tabId) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
  document.getElementById(`tab-${tabId}`).classList.add('active');

  // Update content
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.remove('active');
  });
  document.getElementById(`content-${tabId}`).classList.add('active');

  state.currentTab = tabId;

  // Lazy load data for this tab if not already loaded
  if (!state.tabLoaded[tabId]) {
    await loadTabData(tabId);
  }

  // Initialize tab-specific content with global filter support
  setTimeout(() => {
    // If global filter is active, use filtered render functions
    if (state.globalFilter.kabupaten) {
      renderCurrentTabWithFilter();
    } else {
      // No filter, use original render functions
      switch (tabId) {
        case 'dampak':
          renderDampakTab();
          break;
        case 'peta-operasi':
          renderPetaOperasiTab();
          break;
        case 'pengungsi':
          renderPengungsiTab();
          break;
        case 'bantuan':
          renderBantuanTab();
          break;
      }
    }
  }, 100);
}

function switchMenu(menuId) {
  document.querySelectorAll('.menu-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
  document.getElementById(`menu-${menuId}`).classList.add('active');
  state.currentMenu = menuId;

  // Menu-specific logic can be added here
  if (menuId === 'cluster') {
    // Show cluster data view
    showToast('Menampilkan data cluster', 'info');
  }
}

// =====================================================
// TAB: DAMPAK
// =====================================================
function renderDampakTab() {
  if (!state.data.bencana) return;

  const data = state.data.bencana;

  // Update KPIs
  document.getElementById('kpi-korban').textContent = formatNumber(
    data.total_jiwa
  );
  document.getElementById('kpi-pengungsi').textContent = formatNumber(
    data.total_pengungsi
  );
  document.getElementById('kpi-titik').textContent = formatNumber(
    data.total_titik_pengungsian || 0
  );
  document.getElementById('kpi-rumah').textContent = formatNumber(
    data.total_rumah
  );
  document.getElementById('kpi-sawah').textContent = formatNumber(
    data.total_sawah
  );
  document.getElementById('kpi-kabupaten').textContent = data.data?.length || 0;

  // Update quick stats
  document.getElementById('stat-fasum').textContent = formatNumber(
    data.total_fasum
  );
  document.getElementById('stat-kebun').textContent = formatNumber(
    data.total_kebun
  );
  document.getElementById('stat-tambak').textContent = formatNumber(
    data.total_tambak
  );

  // Render charts
  renderDampakCharts(data);

  // Update cluster summary UI
  updateClusterSummaryUI();

  // Render pertanian table
  renderPertanianTable();

  // Initialize map
  initDampakMap();
}

function renderDampakCharts(data) {
  // Status Pie Chart
  const ctxStatus = document.getElementById('chartStatusDampak');
  if (state.charts.statusDampak) state.charts.statusDampak.destroy();

  // Count status from data
  let tanggap = 0,
    siaga = 0,
    normal = 0;
  if (data.data) {
    data.data.forEach((item) => {
      if (item.jiwa_terdampak > 10000) tanggap++;
      else if (item.jiwa_terdampak > 1000) siaga++;
      else normal++;
    });
  }

  state.charts.statusDampak = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: ['Tanggap Darurat', 'Siaga Darurat', 'Normal'],
      datasets: [
        {
          data: [tanggap, siaga, normal],
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 10 } },
        },
      },
    },
  });

  // Top Wilayah Bar Chart
  const ctxTop = document.getElementById('chartTopWilayah');
  if (state.charts.topWilayah) state.charts.topWilayah.destroy();

  const sorted = [...(data.data || [])]
    .sort((a, b) => b.jiwa_terdampak - a.jiwa_terdampak)
    .slice(0, 5);

  state.charts.topWilayah = new Chart(ctxTop, {
    type: 'bar',
    data: {
      labels: sorted.map(
        (d) => d.kabupaten?.replace('KAB. ', '').replace('KOTA ', '') || '-'
      ),
      datasets: [
        {
          label: 'Korban',
          data: sorted.map((d) => d.jiwa_terdampak),
          backgroundColor: '#dc2626',
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true },
      },
    },
  });
}

function initDampakMap() {
  if (state.maps.dampak) {
    state.maps.dampak.invalidateSize();
    // Refresh GeoJSON layer with updated data
    refreshGeoJSONLayer(state.maps.dampak);
    return;
  }

  state.maps.dampak = L.map('map').setView(CONFIG.MAP_CENTER, CONFIG.MAP_ZOOM);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(state.maps.dampak);

  // Add legend control
  addMapLegend(state.maps.dampak);

  // Add area level filter control inside the map
  addDampakFilterControl(state.maps.dampak);

  // Load polygon GeoJSON with combined bencana data
  loadDampakPolygonGeoJSON(state.maps.dampak);
}

// Add filter control for Dampak map (area level selection)
function addDampakFilterControl(map) {
  const filterControl = L.control({ position: 'topright' });

  filterControl.onAdd = function() {
    const div = L.DomUtil.create('div', 'dampak-filter-control');
    div.innerHTML = `
      <div style="background: white; padding: 8px 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-size: 11px;">
        <div style="font-weight: 600; margin-bottom: 6px; color: #374151; display: flex; align-items: center; gap: 4px;">
          <i class="fas fa-filter" style="color: #dc2626;"></i>
          <span>Filter Wilayah</span>
        </div>
        <select id="dampak-level-filter" onchange="changeDampakPolygonLevel(this.value)" style="width: 100%; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 11px; cursor: pointer;">
          <option value="2" selected>Kabupaten/Kota</option>
          <option value="3">Kecamatan</option>
          <option value="4">Desa/Kelurahan</option>
        </select>
        <div id="dampak-filter-count" style="margin-top: 6px; color: #6b7280; font-size: 10px; text-align: center;">
          <i class="fas fa-map-marker-alt" style="margin-right: 4px;"></i>
          <span id="dampak-polygon-count">-</span> wilayah
        </div>
      </div>
    `;

    // Prevent map interactions when clicking on control
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    return div;
  };

  filterControl.addTo(map);
}

// Change Dampak polygon level and reload data
async function changeDampakPolygonLevel(level) {
  state.dampakPolygonLevel = parseInt(level);

  // Show loading indicator
  const countEl = document.getElementById('dampak-polygon-count');
  if (countEl) countEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  // Reload polygon data
  await loadDampakPolygonGeoJSON(state.maps.dampak);
}

// Load polygon GeoJSON for Dampak tab with combined bencana data
async function loadDampakPolygonGeoJSON(map) {
  try {
    console.log('Loading Dampak polygon GeoJSON... Level:', state.dampakPolygonLevel);

    const result = await api.getPolygonGeoJSON({
      level: state.dampakPolygonLevel, // Use state level (2=kabkota, 3=kec, 4=desa)
      parent: '11' // Aceh province
    });

    if (!result || !result.polygons) {
      console.warn('No polygon data received for Dampak tab');
      return;
    }

    console.log('Polygon loaded:', result.polygons.features?.length || 0, 'features');

    // Remove existing layer if any
    if (state.layers.dampakPolygon) {
      map.removeLayer(state.layers.dampakPolygon);
    }

    // Create GeoJSON layer with combined bencana + polygon data
    state.layers.dampakPolygon = L.geoJSON(result.polygons, {
      style: (feature) => {
        const props = feature.properties || {};
        const namaWilayah = props.nama || '';

        // Try to match with bencana data
        const bencanaData = getBencanaDataByKabupaten(namaWilayah);
        const jiwaTerdampak = bencanaData?.jiwa_terdampak || 0;

        // Use bencana data for coloring if available, otherwise use kondisi from polygon
        let fillColor = '#9ca3af'; // Default: abu-abu (tidak ada data)
        let fillOpacity = 0.4;

        if (jiwaTerdampak > 0) {
          fillColor = getHeatmapColor(jiwaTerdampak);
          fillOpacity = getHeatmapOpacity(jiwaTerdampak);
        } else {
          // Fallback to polygon kondisi
          const kondisiSummary = props.condition_summary || {};
          const dominantKondisi = getDominantCondition(kondisiSummary);
          fillColor = getKondisiColor(dominantKondisi);
          fillOpacity = 0.6;
        }

        return {
          color: '#6b7280',
          weight: 1.5,
          opacity: 0.8,
          fillColor: fillColor,
          fillOpacity: fillOpacity,
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        const namaWilayah = props.nama || 'N/A';
        const bencanaData = getBencanaDataByKabupaten(namaWilayah);

        // Tooltip on hover
        layer.bindTooltip(namaWilayah, {
          permanent: false,
          direction: 'center',
          className: 'font-semibold',
        });

        // Popup on click with combined data
        layer.bindPopup(() => createDampakPolygonPopup(namaWilayah, props, bencanaData), {
          maxWidth: 500,
          minWidth: 400,
          className: 'dampak-polygon-popup',
        });

        // Hover effects
        layer.on({
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({
              weight: 3,
              color: '#1d4ed8',
              fillOpacity: 0.8
            });
            target.bringToFront();
          },
          mouseout: (e) => {
            state.layers.dampakPolygon.resetStyle(e.target);
          },
        });
      }
    }).addTo(map);

    // Update polygon count in filter control
    const polygonCount = result.polygons.features?.length || 0;
    const countEl = document.getElementById('dampak-polygon-count');
    if (countEl) countEl.textContent = formatNumber(polygonCount);

    console.log('Dampak polygon layer added to map:', polygonCount, 'features');
  } catch (error) {
    console.error('Error loading Dampak polygon GeoJSON:', error);
    // Update count to show error
    const countEl = document.getElementById('dampak-polygon-count');
    if (countEl) countEl.textContent = '0';
    // Fallback to original GeoJSON if polygon API fails
    loadGeoJSON(map);
  }
}

// Create popup content for Dampak tab with combined polygon + bencana data
function createDampakPolygonPopup(namaWilayah, polygonProps, bencanaData) {
  // Polygon data
  const penduduk = polygonProps.penduduk_total || 0;
  const pendudukLaki = polygonProps.penduduk_laki || 0;
  const pendudukPerempuan = polygonProps.penduduk_perempuan || 0;
  const poskoCount = polygonProps.jumlah_posko || 0;
  const pengungsiPosko = polygonProps.jumlah_pengungsi || 0;
  const affected = polygonProps.affected_population || 0;
  const displaced = polygonProps.displaced_population || 0;

  // Kondisi from polygon
  const kondisiSummary = polygonProps.condition_summary || {};
  const kondisi = getDominantCondition(kondisiSummary) || 'Tidak ada data';

  // Bencana data section
  const bencanaSection = bencanaData ? `
    <div class="border-t pt-2 mt-2">
      <p class="text-xs font-semibold text-red-600 mb-1"><i class="fas fa-exclamation-triangle mr-1"></i>Data Bencana:</p>
      <div class="grid grid-cols-2 gap-1 text-xs">
        <div class="flex justify-between">
          <span class="text-gray-500">Jiwa Terdampak:</span>
          <span class="font-semibold text-red-600">${formatNumber(bencanaData.jiwa_terdampak)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Pengungsi:</span>
          <span class="font-semibold text-orange-600">${formatNumber(bencanaData.pengungsi)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Titik Pengungsian:</span>
          <span class="font-semibold">${formatNumber(bencanaData.titik_pengungsian)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Rumah Rusak:</span>
          <span class="font-semibold">${formatNumber(bencanaData.rumah)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Fasum Rusak:</span>
          <span class="font-semibold">${formatNumber(bencanaData.fasum)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Sawah (Ha):</span>
          <span class="font-semibold">${formatNumber(bencanaData.sawah)}</span>
        </div>
      </div>
    </div>
  ` : '';

  return `
    <div class="p-2 min-w-[380px]">
      <div class="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-2 rounded-t -m-2 mb-2">
        <h3 class="font-bold text-base flex items-center gap-2">
          <i class="fas fa-map-marker-alt"></i>
          ${namaWilayah}
        </h3>
        <div class="text-xs opacity-90">Kode: ${polygonProps.kode || 'N/A'}</div>
      </div>

      <div class="grid grid-cols-3 gap-2 mb-2">
        <div class="bg-blue-50 p-1.5 rounded text-center">
          <div class="text-[10px] text-blue-600">Penduduk</div>
          <div class="font-bold text-blue-800 text-sm">${formatNumber(penduduk)}</div>
        </div>
        <div class="bg-cyan-50 p-1.5 rounded text-center">
          <div class="text-[10px] text-cyan-600">Laki-laki</div>
          <div class="font-bold text-cyan-800 text-sm">${formatNumber(pendudukLaki)}</div>
        </div>
        <div class="bg-pink-50 p-1.5 rounded text-center">
          <div class="text-[10px] text-pink-600">Perempuan</div>
          <div class="font-bold text-pink-800 text-sm">${formatNumber(pendudukPerempuan)}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
        <div class="flex justify-between items-center">
          <span class="text-gray-500">Kondisi:</span>
          <span class="font-semibold ${getKondisiTextColor(kondisi)}">${kondisi}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500">Posko:</span>
          <span class="font-semibold text-indigo-600">${poskoCount}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500">Di Posko:</span>
          <span class="font-semibold text-amber-600">${formatNumber(pengungsiPosko)}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500">Terdampak:</span>
          <span class="font-semibold text-red-600">${formatNumber(affected)}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500">Mengungsi:</span>
          <span class="font-semibold text-orange-600">${formatNumber(displaced)}</span>
        </div>
      </div>

      ${bencanaSection}
    </div>
  `;
}

function addMapLegend(map) {
  const legend = L.control({ position: 'bottomright' });

  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'map-legend');
    div.innerHTML = `
      <div style="background: white; padding: 8px 10px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); font-size: 10px; line-height: 1.4;">
        <div style="font-weight: 600; margin-bottom: 6px; color: #374151;">Status Wilayah</div>
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
          <span style="width: 12px; height: 12px; background: #dc2626; border-radius: 2px; display: inline-block;"></span>
          <span style="color: #374151;">Terdampak Berat</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
          <span style="width: 12px; height: 12px; background: #f59e0b; border-radius: 2px; display: inline-block;"></span>
          <span style="color: #374151;">Terdampak Sedang</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
          <span style="width: 12px; height: 12px; background: #22c55e; border-radius: 2px; display: inline-block;"></span>
          <span style="color: #374151;">Aman / Ringan</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 12px; height: 12px; background: #9ca3af; border-radius: 2px; display: inline-block;"></span>
          <span style="color: #6b7280;">Tidak ada data</span>
        </div>
      </div>
    `;
    return div;
  };

  legend.addTo(map);
}

// =====================================================
// FOCUS MAP ON KPI CARD CLICK
// =====================================================
function focusMapOnCategory(category, cardElement) {
  // Remove active class from all cards
  document.querySelectorAll('.kpi-card').forEach((card) => {
    card.classList.remove('active-card');
  });

  // Add active class to clicked card
  if (cardElement) {
    cardElement.classList.add('active-card');
  }

  // Get data points with coordinates
  const bencanaData = state.data.bencana?.data || [];
  const bounds = [];

  // Collect coordinates based on category
  bencanaData.forEach((item) => {
    const coords = getKabupatenCoords(item.kabupaten);
    if (!coords) return;

    let shouldInclude = false;
    switch (category) {
      case 'korban':
        shouldInclude = item.jiwa_terdampak > 0;
        break;
      case 'pengungsi':
        shouldInclude = item.pengungsi > 0;
        break;
      case 'titik':
        shouldInclude = item.titik_pengungsian > 0;
        break;
      case 'rumah':
        shouldInclude = item.rumah > 0;
        break;
      case 'sawah':
        shouldInclude = item.sawah > 0;
        break;
      case 'kabupaten':
        shouldInclude = true; // Show all
        break;
      default:
        shouldInclude = true;
    }

    if (shouldInclude) {
      bounds.push(coords);
    }
  });

  // Focus map if we have coordinates
  if (bounds.length > 0 && state.maps.dampak) {
    if (bounds.length === 1) {
      // Single location - zoom to it
      state.maps.dampak.setView(bounds[0], 10);
    } else {
      // Multiple locations - fit bounds
      state.maps.dampak.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 10,
      });
    }

    // Scroll to map
    document
      .getElementById('map')
      .scrollIntoView({ behavior: 'smooth', block: 'center' });

    showToast(`Menampilkan data ${category}`, 'info');
  } else {
    showToast('Tidak ada data dengan koordinat untuk kategori ini', 'warning');
  }
}

// =====================================================
// TAB: PETA OPERASI
// =====================================================
function renderPetaOperasiTab() {
  initPetaOperasiMap();
  updateLayerStats();
  updateJaringanStatus();
  updatePoskoStats();
  updateTendaStats();
  updateFasilitasPublikStats();
  updateVillageDistributionStats();
  populateFilterKabupaten();
  populateCluster6Filters();
}

function initPetaOperasiMap() {
  if (state.maps.operasi) {
    state.maps.operasi.invalidateSize();
    refreshAllLayers();
    return;
  }

  state.maps.operasi = L.map('mapOperasi').setView(
    CONFIG.MAP_CENTER,
    CONFIG.MAP_ZOOM
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(state.maps.operasi);

  // Initialize layer groups with MarkerClusterGroup for performance
  // Cluster options for optimal performance
  const clusterOptions = {
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: 15,
    chunkedLoading: true,
    chunkInterval: 200,
    chunkDelay: 50,
  };

  // Faskes cluster options with custom icon
  const faskesClusterOptions = {
    ...clusterOptions,
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      let size = 'small';
      if (count > 50) size = 'large';
      else if (count > 20) size = 'medium';
      return L.divIcon({
        html: `<div class="faskes-cluster-icon faskes-cluster-${size}"><span>${count}</span></div>`,
        className: 'marker-cluster-faskes',
        iconSize: L.point(40, 40)
      });
    }
  };

  // Cluster6 cluster options with sektor-based coloring
  const cluster6ClusterOptions = {
    ...clusterOptions,
    maxClusterRadius: 60,
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      let size = 'small';
      let colorClass = 'cluster6-cluster-default';
      if (count > 100) size = 'large';
      else if (count > 30) size = 'medium';
      return L.divIcon({
        html: `<div class="cluster6-cluster-icon cluster6-cluster-${size}"><span>${count}</span></div>`,
        className: 'marker-cluster-cluster6',
        iconSize: L.point(40, 40)
      });
    }
  };

  // Faskes layers (added to map by default) - using MarkerClusterGroup
  state.layers.puskesmas = L.markerClusterGroup({
    ...faskesClusterOptions,
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      return L.divIcon({
        html: `<div class="puskesmas-cluster-icon"><span>${count}</span></div>`,
        className: 'marker-cluster-puskesmas',
        iconSize: L.point(40, 40)
      });
    }
  }).addTo(state.maps.operasi);

  state.layers.rsud = L.markerClusterGroup({
    ...faskesClusterOptions,
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      return L.divIcon({
        html: `<div class="rsud-cluster-icon"><span>${count}</span></div>`,
        className: 'marker-cluster-rsud',
        iconSize: L.point(40, 40)
      });
    }
  }).addTo(state.maps.operasi);

  state.layers.fasyankes = L.markerClusterGroup({
    ...faskesClusterOptions,
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      return L.divIcon({
        html: `<div class="fasyankes-cluster-icon"><span>${count}</span></div>`,
        className: 'marker-cluster-fasyankes',
        iconSize: L.point(40, 40)
      });
    }
  }).addTo(state.maps.operasi);

  // Other layers (NOT added to map by default - unchecked)
  state.layers.banlog = L.markerClusterGroup({
    ...clusterOptions,
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      return L.divIcon({
        html: `<div class="banlog-cluster-icon"><span>${count}</span></div>`,
        className: 'marker-cluster-banlog',
        iconSize: L.point(40, 40)
      });
    }
  });

  state.layers.jaringan = L.markerClusterGroup({
    ...clusterOptions,
    maxClusterRadius: 80,
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      return L.divIcon({
        html: `<div class="jaringan-cluster-icon"><span>${count}</span></div>`,
        className: 'marker-cluster-jaringan',
        iconSize: L.point(40, 40)
      });
    }
  });

  state.layers.cluster6 = L.markerClusterGroup(cluster6ClusterOptions);

  // Posko layer cluster
  state.layers.posko = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      return L.divIcon({
        html: `<div class="posko-cluster-icon"><span>${count}</span></div>`,
        className: 'marker-cluster-posko',
        iconSize: L.point(40, 40)
      });
    }
  });

  // Tenda layer cluster
  state.layers.tenda = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      return L.divIcon({
        html: `<div class="tenda-cluster-icon"><span>${count}</span></div>`,
        className: 'marker-cluster-tenda',
        iconSize: L.point(40, 40)
      });
    }
  });

  // Fasilitas Publik layer cluster
  state.layers.faspublik = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      return L.divIcon({
        html: `<div class="faspublik-cluster-icon"><span>${count}</span></div>`,
        className: 'marker-cluster-faspublik',
        iconSize: L.point(40, 40)
      });
    }
  });

  // Village Distribution layer cluster
  state.layers.village = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      return L.divIcon({
        html: `<div class="village-cluster-icon"><span>${count}</span></div>`,
        className: 'marker-cluster-village',
        iconSize: L.point(40, 40)
      });
    }
  });

  // Load GeoJSON boundaries
  loadGeoJSON(state.maps.operasi);

  // Add polygon legend (hidden by default, shown when polygon layer is active)
  addPolygonLegend(state.maps.operasi);

  // Initialize and add polygon layer by default (first layer so it's behind markers)
  initPolygonLayer(state.maps.operasi).then(() => {
    // Add polygon layer to map if it exists
    if (polygonState.layer) {
      state.maps.operasi.addLayer(polygonState.layer);
      // Show polygon legend
      const legend = document.getElementById('polygon-legend-content');
      if (legend) legend.style.display = 'block';
    }
  });

  // Add markers to all layers
  addBanlogMarkers();
  addJaringanMarkers();
  addPuskesmasMarkers();
  addRSUDMarkers();
  addFasyankesV2Markers();
  addCluster6Markers();
  addPoskoMarkers();
  addTendaMarkers();
  addFasilitasPublikMarkers();
  addVillageDistributionMarkers();
}

// Toggle combined Faskes layer (Puskesmas + RSUD + Fasyankes V2)
function toggleFaskesLayer() {
  const checkbox = document.getElementById('layer-faskes');
  const isChecked = checkbox.checked;

  if (isChecked) {
    // Add all faskes layers to map
    state.maps.operasi.addLayer(state.layers.puskesmas);
    state.maps.operasi.addLayer(state.layers.rsud);
    state.maps.operasi.addLayer(state.layers.fasyankes);
  } else {
    // Remove all faskes layers from map
    state.maps.operasi.removeLayer(state.layers.puskesmas);
    state.maps.operasi.removeLayer(state.layers.rsud);
    state.maps.operasi.removeLayer(state.layers.fasyankes);
  }
}

function createMarkerIcon(color, icon) {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="marker-icon" style="background:${color}"><i class="fas ${icon}"></i></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
}

function addBanlogMarkers() {
  if (!state.data.banlog?.data) return;

  const colors = {
    kuning: '#eab308',
    biru: '#3b82f6',
    biru_keabuan: '#6b7280',
    putih: '#ffffff',
  };

  state.data.banlog.data.forEach((item) => {
    if (!item.latitude || !item.longitude) return;

    const color = colors[item.kategori] || '#6b7280';
    const icon = createMarkerIcon(color, 'fa-truck');

    const marker = L.marker([item.latitude, item.longitude], { icon })
      .bindPopup(`
                        <div class="popup-header">
                            <strong><i class="fas fa-truck mr-2"></i>Bantuan Logistik</strong>
                        </div>
                        <div class="popup-body">
                            <p><strong>Desa:</strong> ${item.desa || '-'}</p>
                            <p><strong>Kecamatan:</strong> ${item.kecamatan || '-'}</p>
                            <p><strong>Kabupaten:</strong> ${item.kabupaten || '-'}</p>
                            <p><strong>Status:</strong> ${item.kategori || '-'}</p>
                        </div>
                    `);

    state.layers.banlog.addLayer(marker);
  });
}

function addJaringanMarkers() {
  if (!state.data.jaringan) return;

  // Get latest timestamp data
  const timestamps = Object.keys(state.data.jaringan);
  if (timestamps.length === 0) return;

  const latest = state.data.jaringan[timestamps[timestamps.length - 1]];
  if (!latest?.regions) return;

  latest.regions.forEach((region) => {
    // Use approximate center coordinates for each kabupaten
    // In real implementation, you'd have actual coordinates
    const coords = getKabupatenCoords(region.name);
    if (!coords) return;

    const color =
      region.status === 'critical'
        ? '#ef4444'
        : region.status === 'warning'
          ? '#f59e0b'
          : '#10b981';
    const icon = createMarkerIcon(color, 'fa-broadcast-tower');

    const marker = L.marker(coords, { icon }).bindPopup(`
                        <div class="popup-header">
                            <strong><i class="fas fa-broadcast-tower mr-2"></i>Jaringan Telko</strong>
                        </div>
                        <div class="popup-body">
                            <p><strong>Wilayah:</strong> ${region.name}</p>
                            <p><strong>Transmission:</strong> ${region.transmission}</p>
                            <p><strong>Power Failure:</strong> ${region.powerFailure}</p>
                            <p><strong>Tower:</strong> ${region.tower}</p>
                            <p><strong>Status:</strong> <span class="badge badge-${region.status === 'critical' ? 'critical' : region.status === 'warning' ? 'warning' : 'ok'}">${region.status}</span></p>
                        </div>
                    `);

    state.layers.jaringan.addLayer(marker);
  });
}

function addPuskesmasMarkers() {
  if (!state.data.puskesmas?.data) return;

  state.data.puskesmas.data.forEach((item) => {
    if (!item.latitude || !item.longitude) return;

    const color = item.status?.toLowerCase() === 'up' ? '#10b981' : '#ef4444';
    const icon = createMarkerIcon(color, 'fa-hospital');

    const marker = L.marker([item.latitude, item.longitude], { icon })
      .bindPopup(`
                        <div class="popup-header">
                            <strong><i class="fas fa-hospital mr-2"></i>Puskesmas</strong>
                        </div>
                        <div class="popup-body">
                            <p><strong>Nama:</strong> ${item.puskes_name || '-'}</p>
                            <p><strong>Kode:</strong> ${item.puskes_code || '-'}</p>
                            <p><strong>Status:</strong> <span class="badge ${item.status?.toLowerCase() === 'up' ? 'badge-ok' : 'badge-critical'}">${item.status || '-'}</span></p>
                            <p><strong>Jarak Tower:</strong> ${item.distance || '-'} m</p>
                        </div>
                    `);

    state.layers.puskesmas.addLayer(marker);
  });
}

function addRSUDMarkers() {
  if (!state.data.rsud?.data) return;

  state.data.rsud.data.forEach((item) => {
    if (!item.latitude || !item.longitude) return;

    const color = item.status?.toLowerCase() === 'up' ? '#3b82f6' : '#ef4444';
    const icon = createMarkerIcon(color, 'fa-hospital-alt');

    const marker = L.marker([item.latitude, item.longitude], { icon })
      .bindPopup(`
                        <div class="popup-header">
                            <strong><i class="fas fa-hospital-alt mr-2"></i>RSUD</strong>
                        </div>
                        <div class="popup-body">
                            <p><strong>Nama:</strong> ${item.rsu_name || '-'}</p>
                            <p><strong>Status:</strong> <span class="badge ${item.status?.toLowerCase() === 'up' ? 'badge-ok' : 'badge-critical'}">${item.status || '-'}</span></p>
                        </div>
                    `);

    state.layers.rsud.addLayer(marker);
  });
}

// Get Fasyankes status color based on kondisi
// Merah = Rusak Berat (RB), Kuning = Rusak Sedang (RS), Hijau = Aman, Biru = On Progress
function getFasyankesStatusColor(item) {
  // Check for on-progress status first (highest priority)
  if (
    item.status_perbaikan === 'on_progress' ||
    item.status_perbaikan === 'dalam_perbaikan'
  ) {
    return {
      color: '#3b82f6',
      status: 'On Progress',
      statusClass: 'bg-blue-500',
    };
  }

  // Check kondisi_rb (Rusak Berat) - has meaningful value
  const rb = item.kondisi_rb;
  if (
    rb &&
    rb !== '-' &&
    rb !== '0' &&
    rb !== '' &&
    rb.toLowerCase() !== 'tidak ada'
  ) {
    return {
      color: '#ef4444',
      status: 'Rusak Berat',
      statusClass: 'bg-red-500',
    };
  }

  // Check kondisi_rs (Rusak Sedang) - has meaningful value
  const rs = item.kondisi_rs;
  if (
    rs &&
    rs !== '-' &&
    rs !== '0' &&
    rs !== '' &&
    rs.toLowerCase() !== 'tidak ada'
  ) {
    return {
      color: '#eab308',
      status: 'Rusak Sedang',
      statusClass: 'bg-yellow-500',
    };
  }

  // Check kondisi_rr (Rusak Ringan) - also show as yellow for visibility
  const rr = item.kondisi_rr;
  if (
    rr &&
    rr !== '-' &&
    rr !== '0' &&
    rr !== '' &&
    rr.toLowerCase() !== 'tidak ada'
  ) {
    return {
      color: '#f59e0b',
      status: 'Rusak Ringan',
      statusClass: 'bg-orange-500',
    };
  }

  // Default: Aman/Normal (green)
  return { color: '#10b981', status: 'Aman', statusClass: 'bg-green-500' };
}

function addFasyankesV2Markers() {
  if (!state.data.fasyankesV2?.data) return;

  // Clear existing markers first
  if (state.layers.fasyankes) {
    state.layers.fasyankes.clearLayers();
  }

  state.data.fasyankesV2.data.forEach((item) => {
    if (!item.latitude || !item.longitude) return;

    const isPuskesmas = item.jenis_fasyankes
      ?.toLowerCase()
      .includes('puskesmas');
    const iconClass = isPuskesmas ? 'fa-clinic-medical' : 'fa-hospital-user';

    // Get status color using 4-color system
    const statusInfo = getFasyankesStatusColor(item);
    const icon = createMarkerIcon(statusInfo.color, iconClass);

    // Helper function for badge styling
    const getKondisiBadge = (kondisi, label) => {
      if (!kondisi || kondisi === '-' || kondisi === '0' || kondisi === '') {
        return `<span class="inline-block px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">${label}: -</span>`;
      }
      const colors = {
        RR: 'bg-orange-100 text-orange-700',
        RS: 'bg-yellow-100 text-yellow-700',
        RB: 'bg-red-100 text-red-700',
      };
      return `<span class="inline-block px-2 py-1 ${colors[label] || 'bg-gray-100 text-gray-700'} rounded text-xs">${label}: ${kondisi}</span>`;
    };

    // Helper for network status
    const getNetworkBadge = (status) => {
      if (!status || status === '-')
        return '<span class="text-gray-400">-</span>';
      const s = status.toLowerCase();
      if (s.includes('available') || s.includes('ada') || s.includes('aktif')) {
        return `<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">${status}</span>`;
      } else if (
        s.includes('tidak') ||
        s.includes('down') ||
        s.includes('off')
      ) {
        return `<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">${status}</span>`;
      }
      return `<span class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">${status}</span>`;
    };

    const marker = L.marker([item.latitude, item.longitude], {
      icon,
    }).bindPopup(
      `
                        <div class="popup-header" style="background: linear-gradient(135deg, ${statusInfo.color} 0%, ${statusInfo.color}dd 100%);">
                            <div class="flex items-center justify-between">
                                <strong><i class="fas ${iconClass} mr-2"></i>${item.nama_fasyankes || 'Fasyankes'}</strong>
                            </div>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="px-2 py-0.5 bg-white/20 rounded text-xs">${item.jenis_fasyankes || '-'}</span>
                                <span class="px-2 py-0.5 bg-white/30 rounded text-xs font-semibold">${statusInfo.status}</span>
                            </div>
                        </div>
                        <div class="popup-body" style="min-width: 320px;">
                            <!-- Info Dasar -->
                            <div class="grid grid-cols-2 gap-2 mb-3">
                                <div>
                                    <span class="text-xs text-gray-500">Kab/Kota</span>
                                    <div class="font-medium text-sm">${item.kab_kota || '-'}</div>
                                </div>
                                <div>
                                    <span class="text-xs text-gray-500">Operasional</span>
                                    <div class="font-medium text-sm">${item.aktif_operasional || '-'}</div>
                                </div>
                            </div>

                            <!-- Kondisi Bangunan -->
                            <div class="mb-3 p-2 bg-gray-50 rounded-lg">
                                <h4 class="text-xs font-semibold text-gray-600 mb-2"><i class="fas fa-building mr-1"></i>Kondisi Bangunan</h4>
                                <div class="flex flex-wrap gap-1">
                                    ${getKondisiBadge(item.kondisi_rr, 'RR')}
                                    ${getKondisiBadge(item.kondisi_rs, 'RS')}
                                    ${getKondisiBadge(item.kondisi_rb, 'RB')}
                                </div>
                            </div>

                            <!-- Kondisi Jaringan -->
                            <div class="mb-3 p-2 bg-gray-50 rounded-lg">
                                <h4 class="text-xs font-semibold text-gray-600 mb-2"><i class="fas fa-signal mr-1"></i>Kondisi Jaringan</h4>
                                <div class="grid grid-cols-2 gap-2 text-sm">
                                    <div class="flex items-center gap-1">
                                        <span class="text-gray-500">Telkomsel:</span>
                                        ${getNetworkBadge(item.kondisi_telkomsel)}
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <span class="text-gray-500">XL:</span>
                                        ${getNetworkBadge(item.kondisi_xl)}
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-1">
                                    <div>Jarak Tower: ${item.jarak_tower_telkomsel ? item.jarak_tower_telkomsel + ' km' : '-'}</div>
                                    <div>Jarak Tower: ${item.jarak_tower_xl ? item.jarak_tower_xl + ' km' : '-'}</div>
                                </div>
                            </div>

                            <!-- Kewenangan -->
                            <div class="mb-3 p-2 bg-gray-50 rounded-lg">
                                <h4 class="text-xs font-semibold text-gray-600 mb-2"><i class="fas fa-sitemap mr-1"></i>Kewenangan</h4>
                                <div class="space-y-1 text-xs">
                                    ${item.kewenangan_pusat ? `<div><span class="text-gray-500">Pusat:</span> ${item.kewenangan_pusat}</div>` : ''}
                                    ${item.kewenangan_prov ? `<div><span class="text-gray-500">Provinsi:</span> ${item.kewenangan_prov}</div>` : ''}
                                    ${item.kewenangan_kab_kota ? `<div><span class="text-gray-500">Kab/Kota:</span> ${item.kewenangan_kab_kota}</div>` : ''}
                                    ${!item.kewenangan_pusat && !item.kewenangan_prov && !item.kewenangan_kab_kota ? '<div class="text-gray-400">Tidak ada data kewenangan</div>' : ''}
                                </div>
                            </div>

                            <!-- Timeline Placeholder -->
                            <div class="mb-2 p-2 bg-blue-50 rounded-lg" id="timeline-fasyankes-${item.no}">
                                <h4 class="text-xs font-semibold text-blue-600 mb-1"><i class="fas fa-history mr-1"></i>Riwayat Kondisi</h4>
                                <div class="text-xs text-blue-500">Memuat timeline...</div>
                            </div>

                            <!-- Actions -->
                            ${
                              item.link_maps
                                ? `
                            <div class="text-center pt-2 border-t">
                                <a href="${item.link_maps}" target="_blank" class="text-blue-500 hover:text-blue-700 text-sm">
                                    <i class="fas fa-external-link-alt mr-1"></i>Buka di Google Maps
                                </a>
                            </div>
                            `
                                : ''
                            }
                        </div>
                    `,
      { maxWidth: 380 }
    );

    // Load timeline when popup opens
    marker.on('popupopen', function () {
      loadFasyankesTimeline(item.no, item.nama_fasyankes);
    });

    state.layers.fasyankes.addLayer(marker);
  });
}

// Load timeline data for fasyankes popup
async function loadFasyankesTimeline(fasyankesId, namaFasyankes) {
  const timelineEl = document.getElementById(
    `timeline-fasyankes-${fasyankesId}`
  );
  if (!timelineEl) return;

  try {
    const response = await fetch(
      `${CONFIG.API_BASE}/fasyankes/${fasyankesId}/timeline`
    );
    if (!response.ok) {
      // No timeline data yet
      timelineEl.innerHTML = `
                        <h4 class="text-xs font-semibold text-blue-600 mb-1"><i class="fas fa-history mr-1"></i>Riwayat Kondisi</h4>
                        <div class="text-xs text-gray-400 italic">Belum ada riwayat tercatat</div>
                    `;
      return;
    }

    const timeline = await response.json();
    if (!timeline || timeline.length === 0) {
      timelineEl.innerHTML = `
                        <h4 class="text-xs font-semibold text-blue-600 mb-1"><i class="fas fa-history mr-1"></i>Riwayat Kondisi</h4>
                        <div class="text-xs text-gray-400 italic">Belum ada riwayat tercatat</div>
                    `;
      return;
    }

    const timelineHtml = timeline
      .slice(0, 5)
      .map((event) => {
        const date = new Date(event.created_at).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        const eventColors = {
          damage_reported: 'border-red-500',
          repair_started: 'border-blue-500',
          repair_completed: 'border-green-500',
          status_update: 'border-yellow-500',
        };
        return `
                        <div class="flex gap-2 text-xs border-l-2 ${eventColors[event.event_type] || 'border-gray-300'} pl-2 py-1">
                            <span class="text-gray-400 min-w-[60px]">${date}</span>
                            <span class="text-gray-700">${event.deskripsi || event.event_type}</span>
                        </div>
                    `;
      })
      .join('');

    timelineEl.innerHTML = `
                    <h4 class="text-xs font-semibold text-blue-600 mb-2"><i class="fas fa-history mr-1"></i>Riwayat Kondisi</h4>
                    <div class="space-y-1 max-h-32 overflow-y-auto">${timelineHtml}</div>
                `;
  } catch (error) {
    console.error('Error loading timeline:', error);
    timelineEl.innerHTML = `
                    <h4 class="text-xs font-semibold text-blue-600 mb-1"><i class="fas fa-history mr-1"></i>Riwayat Kondisi</h4>
                    <div class="text-xs text-gray-400 italic">Belum ada riwayat tercatat</div>
                `;
  }
}

function addCluster6Markers(
  filterSektor = '',
  filterSubSektor = '',
  filterKab = ''
) {
  if (!state.data.cluster6 || !Array.isArray(state.data.cluster6)) return;

  // Clear existing cluster6 markers
  state.layers.cluster6.clearLayers();

  let count = 0;
  let totalKerusakan = 0;
  let totalKerugian = 0;

  state.data.cluster6.forEach((item) => {
    // Skip if no coordinates
    const lat = item.latitude;
    const lng = item.longitude;

    if (!lat || !lng) return;

    // Apply sektor filter
    if (filterSektor && item.sektor !== filterSektor) return;

    // Apply sub_sektor filter
    if (filterSubSektor && item.sub_sektor !== filterSubSektor) return;

    // Apply kabupaten filter (using normalized matching)
    // Support both old (kotakab) and new (kabupaten_kota) field names
    if (!matchesKabupatenFilter(item.kabupaten_kota || item.kotakab, filterKab)) return;

    count++;
    totalKerusakan += Number(item.nilai_kerusakan) || 0;
    totalKerugian += Number(item.nilai_kerugian) || 0;

    // Determine icon class based on sektor
    let iconClass = 'fa-building';
    const sektor = (item.sektor || '').toLowerCase();
    if (sektor.includes('kesehatan')) {
      iconClass = 'fa-hospital';
    } else if (sektor.includes('pendidikan')) {
      iconClass = 'fa-school';
    } else if (sektor.includes('infrastruktur')) {
      iconClass = 'fa-road';
    } else if (sektor.includes('sosial')) {
      iconClass = 'fa-users';
    } else if (sektor.includes('lintas')) {
      iconClass = 'fa-building';
    }

    // Determine color based on status kerusakan (RR=green, RS=yellow, RB=red)
    let color = '#6b7280'; // gray default (no status)
    const statusKerusakan = (item.status_kerusakan || item.kondisi || '').toLowerCase();
    if (statusKerusakan === 'rb' || statusKerusakan.includes('berat')) {
      color = '#ef4444'; // red
    } else if (statusKerusakan === 'rs' || statusKerusakan.includes('sedang')) {
      color = '#f59e0b'; // yellow/amber
    } else if (statusKerusakan === 'rr' || statusKerusakan.includes('ringan')) {
      color = '#10b981'; // green
    } else if (statusKerusakan === 'hilang') {
      color = '#6366f1'; // indigo
    }

    // Format currency - handles NaN, undefined, null, empty string, and invalid values
    const formatRupiah = (num) => {
      // Convert to number and check for valid value
      const value = Number(num);
      if (num === null || num === undefined || num === '' || isNaN(value) || value === 0) {
        return '-';
      }
      return 'Rp ' + new Intl.NumberFormat('id-ID').format(value);
    };

    // Kondisi badge color (support rs, rb, rr)
    const getKondisiBadge = (kondisi) => {
      if (!kondisi) return '<span class="text-gray-400">-</span>';
      const k = kondisi.toLowerCase();
      if (k === 'rb' || k.includes('berat') || k.includes('rusak berat')) {
        return `<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">${kondisi}</span>`;
      } else if (
        k === 'rs' ||
        k.includes('sedang') ||
        k.includes('rusak sedang')
      ) {
        return `<span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">${kondisi}</span>`;
      } else if (
        k === 'rr' ||
        k.includes('ringan') ||
        k.includes('rusak ringan')
      ) {
        return `<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">${kondisi}</span>`;
      }
      return `<span class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">${kondisi}</span>`;
    };

    const icon = createMarkerIcon(color, iconClass);

    // Get status badge for layanan/fisik
    const getStatusBadge = (status, type = 'layanan') => {
      if (!status || status === '') return '<span class="text-gray-400">-</span>';
      const s = String(status);
      if (s === '1' || s.toLowerCase() === 'aktif' || s.toLowerCase() === 'beroperasi') {
        return `<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">${type === 'layanan' ? 'Aktif' : 'Baik'}</span>`;
      } else if (s === '0' || s.toLowerCase() === 'tidak aktif') {
        return `<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">${type === 'layanan' ? 'Tidak Aktif' : 'Rusak'}</span>`;
      }
      return `<span class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">${s}</span>`;
    };

    // Get kewenangan badge
    const getKewenanganBadge = () => {
      const parts = [];
      if (item.pusat === '1') parts.push('<span class="px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Pusat</span>');
      if (item.prov === '1') parts.push('<span class="px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs">Prov</span>');
      if (item.kab === '1') parts.push('<span class="px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">Kab</span>');
      if (item.kewenangan) parts.push(`<span class="px-1 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">${item.kewenangan}</span>`);
      return parts.length > 0 ? parts.join(' ') : '-';
    };

    // Generate unique ID for this popup
    const popupId = `popup-${item.id || Math.random().toString(36).substring(2, 11)}`;

    const marker = L.marker([lat, lng], { icon }).bindPopup(
      `
                        <div class="popup-header" style="background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%); padding: 10px 15px;">
                            <strong><i class="fas ${iconClass} mr-2"></i>${item.nama_fasilitas || item.sub_klaster || 'Fasilitas'}</strong>
                            <div class="text-xs opacity-80 mt-1">${item.kode_reg || ''}</div>
                        </div>
                        <div class="popup-body" style="padding: 12px 15px; min-width: 380px;">
                            <!-- Navigation Bar -->
                            <div style="display: flex; justify-content: center; align-items: center; gap: 12px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb;">
                                <button onclick="changePopupPage('${popupId}', -1)" style="background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; padding: 5px 10px; cursor: pointer; color: #374151; display: flex; align-items: center; gap: 4px; font-size: 11px;">
                                    <i class="fas fa-chevron-left"></i> Prev
                                </button>
                                <span id="${popupId}-page-info" style="font-size: 12px; color: #6b7280; font-weight: 500;">1 / 2</span>
                                <button onclick="changePopupPage('${popupId}', 1)" style="background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; padding: 5px 10px; cursor: pointer; color: #374151; display: flex; align-items: center; gap: 4px; font-size: 11px;">
                                    Next <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                            <!-- Page 1: Info Dasar & Status -->
                            <div id="${popupId}-page-1" class="popup-page">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px;">
                                    <div><span class="text-gray-500 text-xs">Sektor</span><div class="font-medium text-sm">${item.sektor || '-'}</div></div>
                                    <div><span class="text-gray-500 text-xs">Sub Sektor</span><div class="font-medium text-sm">${item.sub_sektor || '-'}</div></div>
                                    <div><span class="text-gray-500 text-xs">Sub Klaster</span><div class="font-medium text-sm">${item.sub_klaster || '-'}</div></div>
                                    <div><span class="text-gray-500 text-xs">Kewenangan</span><div class="font-medium text-sm">${getKewenanganBadge()}</div></div>
                                </div>
                                <hr style="margin: 10px 0; border-color: #e5e7eb;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                                    <div><span class="text-gray-500 text-xs">Kab/Kota</span><div class="font-medium text-xs">${item.kabupaten_kota || item.kotakab || '-'}</div></div>
                                    <div><span class="text-gray-500 text-xs">Kecamatan</span><div class="font-medium text-xs">${item.kecamatan || '-'}</div></div>
                                    <div><span class="text-gray-500 text-xs">Desa</span><div class="font-medium text-xs">${item.desa || '-'}</div></div>
                                </div>
                                ${item.alamat_lengkap ? `<div class="mt-2"><span class="text-gray-500 text-xs">Alamat</span><div class="font-medium text-xs">${item.alamat_lengkap}</div></div>` : ''}
                                <hr style="margin: 10px 0; border-color: #e5e7eb;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; text-center;">
                                    <div class="p-2 bg-gray-50 rounded">
                                        <div class="text-xs text-gray-500">Status Layanan</div>
                                        <div class="font-medium">${getStatusBadge(item.status_layanan, 'layanan')}</div>
                                    </div>
                                    <div class="p-2 bg-gray-50 rounded">
                                        <div class="text-xs text-gray-500">Status Fisik</div>
                                        <div class="font-medium">${getStatusBadge(item.status_fisik, 'fisik')}</div>
                                    </div>
                                    <div class="p-2 bg-gray-50 rounded">
                                        <div class="text-xs text-gray-500">Kondisi</div>
                                        <div class="font-medium">${getKondisiBadge(item.status_kerusakan || item.kondisi)}</div>
                                    </div>
                                </div>
                            </div>
                            <!-- Page 2: Kerusakan & Biaya -->
                            <div id="${popupId}-page-2" class="popup-page" style="display: none;">
                                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-center;">
                                    <div class="p-2 bg-green-50 rounded">
                                        <div class="text-xs text-green-600">Ringan</div>
                                        <div class="font-bold text-green-700 text-xs">${formatRupiah(item.nilai_kerusakan_ringan)}</div>
                                    </div>
                                    <div class="p-2 bg-yellow-50 rounded">
                                        <div class="text-xs text-yellow-600">Sedang</div>
                                        <div class="font-bold text-yellow-700 text-xs">${formatRupiah(item.nilai_kerusakan_sedang)}</div>
                                    </div>
                                    <div class="p-2 bg-red-50 rounded">
                                        <div class="text-xs text-red-600">Berat</div>
                                        <div class="font-bold text-red-700 text-xs">${formatRupiah(item.nilai_kerusakan_berat)}</div>
                                    </div>
                                    <div class="p-2 bg-gray-100 rounded">
                                        <div class="text-xs text-gray-600">Total</div>
                                        <div class="font-bold text-gray-800 text-xs">${formatRupiah(item.nilai_kerusakan)}</div>
                                    </div>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px;">
                                    <div class="p-2 bg-blue-50 rounded text-center">
                                        <div class="text-xs text-blue-600">Est. Biaya Rehab</div>
                                        <div class="font-bold text-blue-700 text-sm">${formatRupiah(item.estimasi_biaya_rehab || item.estimasi_biaya_rr)}</div>
                                    </div>
                                    <div class="p-2 bg-orange-50 rounded text-center">
                                        <div class="text-xs text-orange-600">Kerugian</div>
                                        <div class="font-bold text-orange-700 text-sm">${formatRupiah(item.nilai_kerugian)}</div>
                                    </div>
                                </div>
                                ${item.keterangan ? `<div class="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600"><strong>Ket:</strong> ${item.keterangan}</div>` : ''}
                                ${(item.link_maps || item.link_gmaps) ? `<div class="mt-2 text-center"><a href="${item.link_maps || item.link_gmaps}" target="_blank" class="text-blue-500 hover:underline text-xs"><i class="fas fa-external-link-alt mr-1"></i>Buka di Google Maps</a></div>` : ''}
                            </div>
                        </div>
                    `,
      { maxWidth: 420, className: 'cluster6-popup' }
    );

    state.layers.cluster6.addLayer(marker);
  });

  // Update cluster6 stats
  const statEl = document.getElementById('stat-cluster6');
  if (statEl) statEl.textContent = formatNumber(count);

  // Update summary info if exists
  const summaryEl = document.getElementById('cluster6-summary');
  if (summaryEl) {
    const formatRupiahShort = (num) => {
      if (!num) return '0';
      if (num >= 1e12) return (num / 1e12).toFixed(1) + ' T';
      if (num >= 1e9) return (num / 1e9).toFixed(1) + ' M';
      if (num >= 1e6) return (num / 1e6).toFixed(1) + ' Jt';
      return new Intl.NumberFormat('id-ID').format(num);
    };
    summaryEl.innerHTML = `
                    <span class="text-xs">Kerusakan: Rp ${formatRupiahShort(totalKerusakan)}</span>
                `;
  }
}

function applyCluster6Filter() {
  const sektor = document.getElementById('filterSektor').value;
  const subSektor = document.getElementById('filterSubSektor').value;
  const kabFilter = document.getElementById('filterKabupaten').value;
  addCluster6Markers(sektor, subSektor, kabFilter);
}

function addPoskoMarkers() {
  if (!state.data.posko || !Array.isArray(state.data.posko)) return;

  state.layers.posko.clearLayers();

  state.data.posko.forEach((item) => {
    const lat = parseFloat(item.latitude);
    const lng = parseFloat(item.longitude);

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    const icon = createMarkerIcon('#6366f1', 'fa-campground');

    const totalPengungsi = (item.maleRefugee || 0) + (item.femaleRefugee || 0) + (item.childRefugee || 0);

    const marker = L.marker([lat, lng], { icon }).bindPopup(
      `
      <div class="popup-header" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 10px 15px;">
        <strong><i class="fas fa-campground mr-2"></i>${item.name || 'Posko'}</strong>
        <div class="text-xs opacity-80 mt-1">${item.type || 'Posko Pengungsian'}</div>
      </div>
      <div class="popup-body" style="padding: 12px 15px; min-width: 280px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px;">
          <div><span class="text-gray-500 text-xs">Organisasi</span><div class="font-medium text-sm">${item.organizationName || '-'}</div></div>
          <div><span class="text-gray-500 text-xs">Wilayah</span><div class="font-medium text-sm">${item.regency || item.district || '-'}</div></div>
        </div>
        ${item.address ? `<div class="mt-2"><span class="text-gray-500 text-xs">Alamat</span><div class="font-medium text-xs">${item.address}</div></div>` : ''}
        <hr style="margin: 10px 0; border-color: #e5e7eb;">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-center;">
          <div class="p-2 bg-indigo-50 rounded">
            <div class="text-xs text-indigo-600">Total</div>
            <div class="font-bold text-indigo-700">${formatNumber(totalPengungsi)}</div>
          </div>
          <div class="p-2 bg-blue-50 rounded">
            <div class="text-xs text-blue-600">Pria</div>
            <div class="font-bold text-blue-700">${formatNumber(item.maleRefugee || 0)}</div>
          </div>
          <div class="p-2 bg-pink-50 rounded">
            <div class="text-xs text-pink-600">Wanita</div>
            <div class="font-bold text-pink-700">${formatNumber(item.femaleRefugee || 0)}</div>
          </div>
          <div class="p-2 bg-green-50 rounded">
            <div class="text-xs text-green-600">Anak</div>
            <div class="font-bold text-green-700">${formatNumber(item.childRefugee || 0)}</div>
          </div>
        </div>
        ${item.accessWater || item.accessSanitation || item.accessElectricity ? `
        <div class="mt-2">
          <span class="text-gray-500 text-xs">Akses:</span>
          <div class="flex gap-2 mt-1">
            ${item.accessWater ? '<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"><i class="fas fa-tint mr-1"></i>Air</span>' : ''}
            ${item.accessSanitation ? '<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs"><i class="fas fa-toilet mr-1"></i>Sanitasi</span>' : ''}
            ${item.accessElectricity ? '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs"><i class="fas fa-bolt mr-1"></i>Listrik</span>' : ''}
          </div>
        </div>` : ''}
      </div>
      `,
      { maxWidth: 320, className: 'posko-popup' }
    );

    state.layers.posko.addLayer(marker);
  });

  // Update stats
  const statEl = document.getElementById('stat-posko');
  if (statEl) statEl.textContent = formatNumber(state.data.posko.length);
}

function updatePoskoStats() {
  const summary = state.data.poskoSummary || {};
  const bencana = state.data.bencana || {};

  const totalEl = document.getElementById('posko-total');
  const pengungsiEl = document.getElementById('posko-pengungsi-total');
  const titikPengungsianEl = document.getElementById('posko-titik-pengungsian');

  // Posko count from tilikan_poskos
  if (totalEl) totalEl.textContent = formatNumber(summary.total_posko || state.data.posko?.length || 0);

  // Pengungsi & Titik Pengungsian from bencana data (same source as pengungsi tab)
  let totalPengungsi = bencana.total_pengungsi || 0;
  let totalTitikPengungsian = bencana.total_titik_pengungsian || 0;

  // Fallback: calculate from bencana.data if total not available
  if (!totalPengungsi && bencana.data) {
    totalPengungsi = bencana.data.reduce((sum, d) => sum + (d.pengungsi || 0), 0);
    totalTitikPengungsian = bencana.data.reduce((sum, d) => sum + (d.titik_pengungsian || 0), 0);
  }

  if (pengungsiEl) pengungsiEl.textContent = formatNumber(totalPengungsi);
  if (titikPengungsianEl) titikPengungsianEl.textContent = formatNumber(totalTitikPengungsian);
}

// =====================================================
// TENDA (LOKASI TENDA) MARKERS & STATS
// =====================================================
function addTendaMarkers() {
  if (!state.data.tenda || !Array.isArray(state.data.tenda)) return;

  state.layers.tenda.clearLayers();

  let totalUnit = 0;

  state.data.tenda.forEach((item) => {
    const lat = parseFloat(item.latitude);
    const lng = parseFloat(item.longitude);

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    const icon = createMarkerIcon('#d97706', 'fa-tents');

    const tentCount = Number(item.tentCount) || Number(item.jumlah_tenda) || 0;
    totalUnit += tentCount;

    const marker = L.marker([lat, lng], { icon }).bindPopup(
      `
      <div class="popup-header" style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 10px 15px;">
        <strong><i class="fas fa-tents mr-2"></i>${item.name || item.nama || 'Lokasi Tenda'}</strong>
        <div class="text-xs opacity-80 mt-1">${item.type || item.tipe || 'Tenda Pengungsian'}</div>
      </div>
      <div class="popup-body" style="padding: 12px 15px; min-width: 260px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px;">
          <div><span class="text-gray-500 text-xs">Kabupaten</span><div class="font-medium text-sm">${item.regency || item.kabupaten || '-'}</div></div>
          <div><span class="text-gray-500 text-xs">Kecamatan</span><div class="font-medium text-sm">${item.district || item.kecamatan || '-'}</div></div>
        </div>
        ${item.address || item.alamat ? `<div class="mt-2"><span class="text-gray-500 text-xs">Alamat</span><div class="font-medium text-xs">${item.address || item.alamat}</div></div>` : ''}
        <hr style="margin: 10px 0; border-color: #e5e7eb;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; text-center;">
          <div class="p-2 bg-amber-50 rounded">
            <div class="text-xs text-amber-600">Jumlah Tenda</div>
            <div class="font-bold text-amber-700">${formatNumber(tentCount)}</div>
          </div>
          <div class="p-2 bg-orange-50 rounded">
            <div class="text-xs text-orange-600">Kapasitas</div>
            <div class="font-bold text-orange-700">${formatNumber(item.capacity || item.kapasitas || 0)}</div>
          </div>
        </div>
        ${item.organizationName || item.organisasi ? `
        <div class="mt-2">
          <span class="text-gray-500 text-xs">Organisasi:</span>
          <div class="font-medium text-sm">${item.organizationName || item.organisasi}</div>
        </div>` : ''}
        ${item.description || item.keterangan ? `
        <div class="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <strong>Ket:</strong> ${item.description || item.keterangan}
        </div>` : ''}
      </div>
      `,
      { maxWidth: 300, className: 'tenda-popup' }
    );

    state.layers.tenda.addLayer(marker);
  });

  // Update stats
  const statEl = document.getElementById('stat-tenda');
  if (statEl) statEl.textContent = formatNumber(state.data.tenda.length);

  // Store total unit for stats
  state.data.tendaTotalUnit = totalUnit;
}

function updateTendaStats() {
  const tenda = state.data.tenda || [];

  const totalEl = document.getElementById('tenda-total');
  const unitEl = document.getElementById('tenda-unit');

  if (totalEl) totalEl.textContent = formatNumber(tenda.length);
  if (unitEl) unitEl.textContent = formatNumber(state.data.tendaTotalUnit || 0);
}

// =====================================================
// FASILITAS PUBLIK MARKERS & STATS
// =====================================================
function addFasilitasPublikMarkers() {
  if (!state.data.fasilitasPublik || !Array.isArray(state.data.fasilitasPublik)) return;

  state.layers.faspublik.clearLayers();

  // Count by type for stats
  const byType = {};

  state.data.fasilitasPublik.forEach((item) => {
    const lat = parseFloat(item.latitude);
    const lng = parseFloat(item.longitude);

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    // Count by type
    const facilityType = item.facilityType || item.jenis || item.type || 'Lainnya';
    byType[facilityType] = (byType[facilityType] || 0) + 1;

    // Determine icon based on type
    let iconClass = 'fa-building-flag';
    let color = '#0891b2'; // cyan-600
    const typeLower = facilityType.toLowerCase();
    if (typeLower.includes('sekolah') || typeLower.includes('pendidikan')) {
      iconClass = 'fa-school';
      color = '#2563eb';
    } else if (typeLower.includes('masjid') || typeLower.includes('meunasah') || typeLower.includes('ibadah')) {
      iconClass = 'fa-mosque';
      color = '#059669';
    } else if (typeLower.includes('kantor') || typeLower.includes('pemerintah')) {
      iconClass = 'fa-landmark';
      color = '#7c3aed';
    } else if (typeLower.includes('pasar') || typeLower.includes('ekonomi')) {
      iconClass = 'fa-store';
      color = '#ea580c';
    } else if (typeLower.includes('jalan') || typeLower.includes('jembatan') || typeLower.includes('infrastruktur')) {
      iconClass = 'fa-road';
      color = '#64748b';
    }

    const icon = createMarkerIcon(color, iconClass);

    // Get damage status
    const getDamageStatus = (item) => {
      const rb = item.rusakBerat || item.rusak_berat || 0;
      const rs = item.rusakSedang || item.rusak_sedang || 0;
      const rr = item.rusakRingan || item.rusak_ringan || 0;
      if (rb > 0) return { label: 'Rusak Berat', color: 'red' };
      if (rs > 0) return { label: 'Rusak Sedang', color: 'yellow' };
      if (rr > 0) return { label: 'Rusak Ringan', color: 'orange' };
      return { label: 'Tidak Ada Kerusakan', color: 'green' };
    };

    const damageStatus = getDamageStatus(item);

    const marker = L.marker([lat, lng], { icon }).bindPopup(
      `
      <div class="popup-header" style="background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%); padding: 10px 15px;">
        <strong><i class="fas ${iconClass} mr-2"></i>${item.name || item.nama || 'Fasilitas Publik'}</strong>
        <div class="text-xs opacity-80 mt-1">${facilityType}</div>
      </div>
      <div class="popup-body" style="padding: 12px 15px; min-width: 280px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px;">
          <div><span class="text-gray-500 text-xs">Kabupaten</span><div class="font-medium text-sm">${item.regency || item.kabupaten || '-'}</div></div>
          <div><span class="text-gray-500 text-xs">Kecamatan</span><div class="font-medium text-sm">${item.district || item.kecamatan || '-'}</div></div>
        </div>
        ${item.address || item.alamat ? `<div class="mt-2"><span class="text-gray-500 text-xs">Alamat</span><div class="font-medium text-xs">${item.address || item.alamat}</div></div>` : ''}
        <hr style="margin: 10px 0; border-color: #e5e7eb;">
        <div class="mb-2">
          <span class="text-gray-500 text-xs">Status Kerusakan:</span>
          <span class="ml-2 px-2 py-0.5 bg-${damageStatus.color}-100 text-${damageStatus.color}-700 rounded text-xs font-medium">${damageStatus.label}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-center;">
          <div class="p-2 bg-red-50 rounded">
            <div class="text-xs text-red-600">RB</div>
            <div class="font-bold text-red-700">${formatNumber(item.rusakBerat || item.rusak_berat || 0)}</div>
          </div>
          <div class="p-2 bg-yellow-50 rounded">
            <div class="text-xs text-yellow-600">RS</div>
            <div class="font-bold text-yellow-700">${formatNumber(item.rusakSedang || item.rusak_sedang || 0)}</div>
          </div>
          <div class="p-2 bg-orange-50 rounded">
            <div class="text-xs text-orange-600">RR</div>
            <div class="font-bold text-orange-700">${formatNumber(item.rusakRingan || item.rusak_ringan || 0)}</div>
          </div>
        </div>
        ${item.estimasiBiaya || item.estimasi_biaya ? `
        <div class="mt-2 p-2 bg-blue-50 rounded text-center">
          <div class="text-xs text-blue-600">Estimasi Biaya Perbaikan</div>
          <div class="font-bold text-blue-700">${formatRupiah(item.estimasiBiaya || item.estimasi_biaya)}</div>
        </div>` : ''}
        ${item.description || item.keterangan ? `
        <div class="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <strong>Ket:</strong> ${item.description || item.keterangan}
        </div>` : ''}
      </div>
      `,
      { maxWidth: 320, className: 'faspublik-popup' }
    );

    state.layers.faspublik.addLayer(marker);
  });

  // Update stats
  const statEl = document.getElementById('stat-faspublik');
  if (statEl) statEl.textContent = formatNumber(state.data.fasilitasPublik.length);

  // Store byType for stats
  state.data.fasilitasPublikByType = byType;
}

function updateFasilitasPublikStats() {
  const faspublik = state.data.fasilitasPublik || [];
  const byType = state.data.fasilitasPublikByType || {};

  const totalEl = document.getElementById('faspublik-total');
  const byTypeEl = document.getElementById('faspublik-by-type');

  if (totalEl) totalEl.textContent = formatNumber(faspublik.length);

  if (byTypeEl) {
    const entries = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 4);
    if (entries.length > 0) {
      byTypeEl.innerHTML = entries.map(([type, count]) => `
        <div class="text-center p-1 bg-cyan-50 rounded">
          <div class="text-cyan-600 text-xs truncate" title="${type}">${type.substring(0, 10)}${type.length > 10 ? '...' : ''}</div>
          <div class="font-bold text-cyan-700">${formatNumber(count)}</div>
        </div>
      `).join('');
    } else {
      byTypeEl.innerHTML = '<div class="text-gray-400 text-xs col-span-2 text-center">Tidak ada data</div>';
    }
  }
}

// =====================================================
// VILLAGE DISTRIBUTION MARKERS & STATS
// =====================================================
function addVillageDistributionMarkers() {
  if (!state.data.villageDistribution || !Array.isArray(state.data.villageDistribution)) return;

  state.layers.village.clearLayers();

  // Count by regency for stats
  const byRegency = {};

  state.data.villageDistribution.forEach((item) => {
    const lat = parseFloat(item.latitude);
    const lng = parseFloat(item.longitude);

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    // Count by regency
    const regency = item.regency || item.kabupaten || 'Unknown';
    byRegency[regency] = (byRegency[regency] || 0) + 1;

    const icon = createMarkerIcon('#10b981', 'fa-house-chimney');

    const marker = L.marker([lat, lng], { icon }).bindPopup(
      `
      <div class="popup-header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 10px 15px;">
        <strong><i class="fas fa-house-chimney mr-2"></i>${item.villageName || item.name || item.nama || 'Desa'}</strong>
        <div class="text-xs opacity-80 mt-1">Distribusi Desa Terdampak</div>
      </div>
      <div class="popup-body" style="padding: 12px 15px; min-width: 260px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px;">
          <div><span class="text-gray-500 text-xs">Kabupaten</span><div class="font-medium text-sm">${item.regency || item.kabupaten || '-'}</div></div>
          <div><span class="text-gray-500 text-xs">Kecamatan</span><div class="font-medium text-sm">${item.district || item.kecamatan || '-'}</div></div>
        </div>
        ${item.address || item.alamat ? `<div class="mt-2"><span class="text-gray-500 text-xs">Alamat</span><div class="font-medium text-xs">${item.address || item.alamat}</div></div>` : ''}
        <hr style="margin: 10px 0; border-color: #e5e7eb;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; text-center;">
          <div class="p-2 bg-emerald-50 rounded">
            <div class="text-xs text-emerald-600">KK Terdampak</div>
            <div class="font-bold text-emerald-700">${formatNumber(item.householdsAffected || item.kk_terdampak || 0)}</div>
          </div>
          <div class="p-2 bg-green-50 rounded">
            <div class="text-xs text-green-600">Jiwa Terdampak</div>
            <div class="font-bold text-green-700">${formatNumber(item.populationAffected || item.jiwa_terdampak || 0)}</div>
          </div>
        </div>
        ${item.organizationName || item.organisasi ? `
        <div class="mt-2">
          <span class="text-gray-500 text-xs">Organisasi:</span>
          <div class="font-medium text-sm">${item.organizationName || item.organisasi}</div>
        </div>` : ''}
        ${item.description || item.keterangan ? `
        <div class="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <strong>Ket:</strong> ${item.description || item.keterangan}
        </div>` : ''}
      </div>
      `,
      { maxWidth: 300, className: 'village-popup' }
    );

    state.layers.village.addLayer(marker);
  });

  // Update stats
  const statEl = document.getElementById('stat-village');
  if (statEl) statEl.textContent = formatNumber(state.data.villageDistribution.length);

  // Store byRegency for stats
  state.data.villageByRegency = byRegency;
}

function updateVillageDistributionStats() {
  const village = state.data.villageDistribution || [];
  const byRegency = state.data.villageByRegency || {};

  const totalEl = document.getElementById('village-total');
  const byRegencyEl = document.getElementById('village-by-regency');

  if (totalEl) totalEl.textContent = formatNumber(village.length);

  if (byRegencyEl) {
    const entries = Object.entries(byRegency).sort((a, b) => b[1] - a[1]).slice(0, 4);
    if (entries.length > 0) {
      byRegencyEl.innerHTML = entries.map(([regency, count]) => `
        <div class="text-center p-1 bg-emerald-50 rounded">
          <div class="text-emerald-600 text-xs truncate" title="${regency}">${regency.substring(0, 10)}${regency.length > 10 ? '...' : ''}</div>
          <div class="font-bold text-emerald-700">${formatNumber(count)}</div>
        </div>
      `).join('');
    } else {
      byRegencyEl.innerHTML = '<div class="text-gray-400 text-xs col-span-2 text-center">Tidak ada data</div>';
    }
  }
}

function populateCluster6Filters() {
  // Get unique sektor and sub_sektor from cluster6 data directly
  const cluster6Data = state.data.cluster6 || [];

  const sektorSet = new Set();
  const subSektorSet = new Set();

  cluster6Data.forEach((item) => {
    if (item.sektor) sektorSet.add(item.sektor);
    if (item.sub_sektor) subSektorSet.add(item.sub_sektor);
  });

  // Populate sektor dropdown
  const sektorSelect = document.getElementById('filterSektor');
  if (sektorSelect) {
    const sektorArr = [...sektorSet].sort();
    sektorSelect.innerHTML =
      '<option value="">Semua Sektor</option>' +
      sektorArr.map((s) => `<option value="${s}">${s}</option>`).join('');
  }

  // Populate sub_sektor dropdown
  const subSektorSelect = document.getElementById('filterSubSektor');
  if (subSektorSelect) {
    const subSektorArr = [...subSektorSet].sort();
    subSektorSelect.innerHTML =
      '<option value="">Semua Sub Sektor</option>' +
      subSektorArr.map((s) => `<option value="${s}">${s}</option>`).join('');
  }
}

function toggleLayer(layerName) {
  const checkbox = document.getElementById(`layer-${layerName}`);
  if (checkbox.checked) {
    state.maps.operasi.addLayer(state.layers[layerName]);
  } else {
    state.maps.operasi.removeLayer(state.layers[layerName]);
  }

  // Show/hide cluster6 filters when toggling cluster6 layer
  if (layerName === 'cluster6') {
    const filtersEl = document.getElementById('cluster6-filters');
    if (filtersEl) {
      filtersEl.style.display = checkbox.checked ? 'block' : 'none';
    }
  }
}

function refreshAllLayers() {
  // Clear and re-add markers
  Object.values(state.layers).forEach((layer) => layer.clearLayers());
  addBanlogMarkers();
  addJaringanMarkers();
  addPuskesmasMarkers();
  addRSUDMarkers();
  addFasyankesV2Markers();
  addCluster6Markers();
  addPoskoMarkers();
  addTendaMarkers();
  addFasilitasPublikMarkers();
  addVillageDistributionMarkers();
}

function updateLayerStats() {
  // Individual faskes stats
  const puskesmasCount = state.data.puskesmas?.total || 0;
  const rsudCount = state.data.rsud?.total || 0;
  const fasyankesV2Count = state.data.fasyankesV2?.total || 0;

  document.getElementById('stat-puskesmas').textContent = puskesmasCount;
  document.getElementById('stat-rsud').textContent = rsudCount;
  document.getElementById('stat-fasyankes').textContent = fasyankesV2Count;

  // Combined faskes total
  const faskesTotal = puskesmasCount + rsudCount + fasyankesV2Count;
  const faskesTotalEl = document.getElementById('stat-faskes-total');
  if (faskesTotalEl) {
    faskesTotalEl.textContent = faskesTotal;
  }

  // Other stats
  document.getElementById('stat-banlog').textContent =
    state.data.banlog?.total_desa || 0;
  document.getElementById('stat-cluster6').textContent =
    state.data.cluster6?.length || 0;
  document.getElementById('stat-posko').textContent =
    state.data.posko?.length || 0;

  // Tenda stats
  const tendaStatEl = document.getElementById('stat-tenda');
  if (tendaStatEl) {
    tendaStatEl.textContent = state.data.tenda?.length || 0;
  }

  // Fasilitas Publik stats
  const faspublikStatEl = document.getElementById('stat-faspublik');
  if (faspublikStatEl) {
    faspublikStatEl.textContent = state.data.fasilitasPublik?.length || 0;
  }

  // Village Distribution stats
  const villageStatEl = document.getElementById('stat-village');
  if (villageStatEl) {
    villageStatEl.textContent = state.data.villageDistribution?.length || 0;
  }

  // Jaringan count
  const timestamps = Object.keys(state.data.jaringan || {});
  if (timestamps.length > 0) {
    const latest = state.data.jaringan[timestamps[timestamps.length - 1]];
    document.getElementById('stat-jaringan').textContent =
      latest?.regions?.length || 0;
  }
}

function updateJaringanStatus() {
  const timestamps = Object.keys(state.data.jaringan || {});
  if (timestamps.length === 0) return;

  const latest = state.data.jaringan[timestamps[timestamps.length - 1]];
  if (!latest?.summary) return;

  document.getElementById('jaringan-critical').textContent =
    latest.summary.criticalRegions || 0;
  document.getElementById('jaringan-warning').textContent =
    latest.summary.warningRegions || 0;
  document.getElementById('jaringan-normal').textContent =
    latest.summary.normalRegions || 0;
}

function populateFilterKabupaten() {
  const select = document.getElementById('filterKabupaten');
  const kabupatenSet = new Set();

  // Collect kabupaten from various sources
  state.data.banlog?.data?.forEach(
    (d) => d.kabupaten && kabupatenSet.add(d.kabupaten)
  );
  state.data.bencana?.data?.forEach(
    (d) => d.kabupaten && kabupatenSet.add(d.kabupaten)
  );
  // Also collect from cluster6 data (merged ETL data)
  state.data.cluster6?.forEach(
    (d) => (d.kabupaten_kota || d.kotakab) && kabupatenSet.add(d.kabupaten_kota || d.kotakab)
  );

  const sorted = [...kabupatenSet].sort();
  select.innerHTML =
    '<option value="">Semua</option>' +
    sorted.map((k) => `<option value="${k}">${k}</option>`).join('');
}

// =====================================================
// GLOBAL FILTER FUNCTIONS
// =====================================================

/**
 * Normalize kabupaten name for consistent matching
 * Handles variations like "KAB. ACEH BARAT", "KABUPATEN ACEH BARAT", "Aceh Barat"
 */
function normalizeKabupaten(name) {
  if (!name) return '';
  return name
    .toUpperCase()
    .replace(/^KAB\.\s*/i, '')
    .replace(/^KABUPATEN\s*/i, '')
    .replace(/^KOTA\s*/i, '')
    .trim();
}

/**
 * Check if kabupaten name matches filter (with normalization)
 */
function matchesKabupatenFilter(itemKab, filterKab) {
  if (!filterKab) return true; // No filter = show all
  if (!itemKab) return false;
  return normalizeKabupaten(itemKab) === normalizeKabupaten(filterKab);
}

function populateGlobalFilterKabupaten() {
  const select = document.getElementById('globalFilterKabupaten');
  if (!select) return;

  // Use Map to store normalized name -> display name
  const kabupatenMap = new Map();

  // Collect kabupaten from bencana data (primary source)
  state.data.bencana?.data?.forEach((d) => {
    if (d.kabupaten) {
      const normalized = normalizeKabupaten(d.kabupaten);
      if (!kabupatenMap.has(normalized)) {
        kabupatenMap.set(normalized, d.kabupaten);
      }
    }
  });

  // Collect from banlog
  state.data.banlog?.data?.forEach((d) => {
    if (d.kabupaten) {
      const normalized = normalizeKabupaten(d.kabupaten);
      if (!kabupatenMap.has(normalized)) {
        kabupatenMap.set(normalized, d.kabupaten);
      }
    }
  });

  // Collect from penduduk (NAMA_KAB_KOTA)
  state.data.penduduk?.forEach((d) => {
    if (d.NAMA_KAB_KOTA) {
      const normalized = normalizeKabupaten(d.NAMA_KAB_KOTA);
      if (!kabupatenMap.has(normalized)) {
        kabupatenMap.set(normalized, d.NAMA_KAB_KOTA);
      }
    }
  });

  // Sort by display name and create options
  const sorted = [...kabupatenMap.entries()].sort((a, b) =>
    a[1].localeCompare(b[1])
  );

  select.innerHTML =
    '<option value="">Semua Kabupaten</option>' +
    sorted.map(([, display]) => `<option value="${display}">${display}</option>`).join('');
}

function applyGlobalFilter() {
  const kabupaten = document.getElementById('globalFilterKabupaten').value;
  state.globalFilter.kabupaten = kabupaten;

  // Update info display
  const info = document.getElementById('globalFilterInfo');
  const name = document.getElementById('filterKabName');
  if (kabupaten) {
    info.classList.remove('hidden');
    name.textContent = kabupaten;
  } else {
    info.classList.add('hidden');
  }

  // Sync with existing tab-specific filters
  syncTabFilters(kabupaten);

  // Re-render current tab with filter
  renderCurrentTabWithFilter();

  showToast(
    kabupaten ? `Filter: ${kabupaten}` : 'Menampilkan semua kabupaten',
    'info'
  );
}

function resetGlobalFilter() {
  document.getElementById('globalFilterKabupaten').value = '';
  applyGlobalFilter();
}

function syncTabFilters(kabupaten) {
  // Helper to find matching option in select by normalized name
  const findMatchingOption = (selectEl, kabValue) => {
    if (!selectEl || !kabValue) return '';
    const options = Array.from(selectEl.options);
    // First try exact match
    const exact = options.find((opt) => opt.value === kabValue);
    if (exact) return exact.value;
    // Then try normalized match
    const normalizedFilter = normalizeKabupaten(kabValue);
    const match = options.find(
      (opt) => opt.value && normalizeKabupaten(opt.value) === normalizedFilter
    );
    return match ? match.value : '';
  };

  // Sync peta operasi filter
  const filterKab = document.getElementById('filterKabupaten');
  if (filterKab) {
    filterKab.value = findMatchingOption(filterKab, kabupaten);
  }

  // Sync bantuan filter
  const filterBantuanKab = document.getElementById('filterBantuanKab');
  if (filterBantuanKab) {
    filterBantuanKab.value = findMatchingOption(filterBantuanKab, kabupaten);
  }
}

function renderCurrentTabWithFilter() {
  switch (state.currentTab) {
    case 'dampak':
      renderDampakTabFiltered();
      break;
    case 'peta-operasi':
      applyFilter();
      break;
    case 'pengungsi':
      renderPengungsiTabFiltered();
      break;
    case 'bantuan':
      renderBantuanTable();
      break;
  }
}

function renderDampakTabFiltered() {
  if (!state.data.bencana) return;

  const kabFilter = state.globalFilter.kabupaten;
  const data = state.data.bencana;

  // Filter data by kabupaten if filter is active (using normalized matching)
  let filteredData = data.data || [];
  if (kabFilter) {
    filteredData = filteredData.filter((d) =>
      matchesKabupatenFilter(d.kabupaten, kabFilter)
    );
  }

  // Recalculate totals from filtered data
  const totals = {
    jiwa: 0,
    pengungsi: 0,
    titik: 0,
    rumah: 0,
    sawah: 0,
    fasum: 0,
    kebun: 0,
    tambak: 0,
  };

  filteredData.forEach((item) => {
    totals.jiwa += item.jiwa_terdampak || 0;
    totals.pengungsi += item.pengungsi || 0;
    totals.titik += item.titik_pengungsian || 0;
    totals.rumah += item.rumah || 0;
    totals.sawah += item.sawah || 0;
    totals.kebun += item.kebun || 0;
    totals.tambak += item.tambak || 0;
  });

  // Update KPIs with filtered values
  document.getElementById('kpi-korban').textContent = formatNumber(totals.jiwa);
  document.getElementById('kpi-pengungsi').textContent = formatNumber(
    totals.pengungsi
  );
  document.getElementById('kpi-titik').textContent = formatNumber(totals.titik);
  document.getElementById('kpi-rumah').textContent = formatNumber(totals.rumah);
  document.getElementById('kpi-sawah').textContent = formatNumber(totals.sawah);
  document.getElementById('kpi-kabupaten').textContent = filteredData.length;

  // Update quick stats
  document.getElementById('stat-fasum').textContent = formatNumber(
    totals.fasum
  );
  document.getElementById('stat-kebun').textContent = formatNumber(
    totals.kebun
  );
  document.getElementById('stat-tambak').textContent = formatNumber(
    totals.tambak
  );

  // Re-render charts with filtered data
  renderDampakChartsFiltered(filteredData);

  // Update cluster summary if needed
  updateClusterSummaryUI();
}

function renderDampakChartsFiltered(filteredData) {
  // Status Pie Chart
  const ctxStatus = document.getElementById('chartStatusDampak');
  if (state.charts.statusDampak) state.charts.statusDampak.destroy();

  let tanggap = 0,
    siaga = 0,
    normal = 0;
  filteredData.forEach((item) => {
    if (item.jiwa_terdampak > 10000) tanggap++;
    else if (item.jiwa_terdampak > 1000) siaga++;
    else normal++;
  });

  state.charts.statusDampak = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: ['Tanggap Darurat', 'Siaga Darurat', 'Normal'],
      datasets: [
        {
          data: [tanggap, siaga, normal],
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 10 } },
        },
      },
    },
  });

  // Top Wilayah Bar Chart
  const ctxTop = document.getElementById('chartTopWilayah');
  if (state.charts.topWilayah) state.charts.topWilayah.destroy();

  const sorted = [...filteredData]
    .sort((a, b) => b.jiwa_terdampak - a.jiwa_terdampak)
    .slice(0, 5);

  state.charts.topWilayah = new Chart(ctxTop, {
    type: 'bar',
    data: {
      labels: sorted.map(
        (d) => d.kabupaten?.replace('KAB. ', '').replace('KOTA ', '') || '-'
      ),
      datasets: [
        {
          label: 'Jiwa Terdampak',
          data: sorted.map((d) => d.jiwa_terdampak || 0),
          backgroundColor: '#dc2626',
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { callback: (v) => formatNumber(v) },
        },
      },
    },
  });
}

function renderPengungsiTabFiltered() {
  const kabFilter = state.globalFilter.kabupaten;

  // Get data from penduduk response
  let totalPenduduk = 0;
  let totalKK = 0;
  let totalDisabilitas = 0;
  let totalPengungsi = 0;

  // Filter penduduk data (using normalized matching)
  let pendudukFiltered = state.data.penduduk || [];
  let pendudukKKFiltered = state.data.pendudukKK || [];
  let pendudukDisabilitasFiltered = state.data.pendudukDisabilitas || [];

  if (kabFilter) {
    pendudukFiltered = pendudukFiltered.filter((d) =>
      matchesKabupatenFilter(d.NAMA_KAB_KOTA, kabFilter)
    );
    pendudukKKFiltered = pendudukKKFiltered.filter((d) =>
      matchesKabupatenFilter(d.NAMA_KAB_KOTA, kabFilter)
    );
    pendudukDisabilitasFiltered = pendudukDisabilitasFiltered.filter((d) =>
      matchesKabupatenFilter(d.NAMA_KAB_KOTA, kabFilter)
    );
  }

  // Calculate totals from filtered data
  totalPenduduk = pendudukFiltered.reduce(
    (sum, d) => sum + (Number(d.jumlah) || 0),
    0
  );
  totalKK = pendudukKKFiltered.reduce(
    (sum, d) => sum + (Number(d.jumlah_kk) || Number(d.jumlah) || 0),
    0
  );
  totalDisabilitas = pendudukDisabilitasFiltered.reduce((sum, d) => {
    // Sum all disability types
    const fisik = Number(d.DISABILITAS_FISIK_JML) || 0;
    const netra = Number(d.DISABILITAS_NETRA_BUTA_JML) || 0;
    const rungu = Number(d.DISABILITAS_RUNGU_WICARA_JML) || 0;
    const mental = Number(d.DISABILITAS_MENTAL_JIWA_JML) || 0;
    const fisikMental = Number(d.DISABILITAS_FISIK_DAN_MENTAL_JML) || 0;
    const lainnya = Number(d.DISABILITAS_LAINNYA_JML) || 0;
    return sum + fisik + netra + rungu + mental + fisikMental + lainnya;
  }, 0);

  // Get pengungsi from bencana data (also filtered with normalization)
  if (state.data.bencana?.data) {
    let bencanaFiltered = state.data.bencana.data;
    if (kabFilter) {
      bencanaFiltered = bencanaFiltered.filter((d) =>
        matchesKabupatenFilter(d.kabupaten, kabFilter)
      );
    }
    totalPengungsi = bencanaFiltered.reduce(
      (sum, d) => sum + (d.pengungsi || 0),
      0
    );
  }

  document.getElementById('kpi-penduduk').textContent =
    formatNumber(totalPenduduk);
  document.getElementById('kpi-kk').textContent = formatNumber(totalKK);
  document.getElementById('kpi-disabilitas').textContent =
    formatNumber(totalDisabilitas);
  document.getElementById('kpi-pengungsi-tab').textContent =
    formatNumber(totalPengungsi);

  // Re-render charts with filtered data
  renderPengungsiChartsFiltered(pendudukDisabilitasFiltered);
}

function renderPengungsiChartsFiltered(disabilitasFiltered) {
  // Age Distribution Chart - use global data (pendudukUmur is already aggregated)
  const ctxUmur = document.getElementById('chartUmur');
  if (state.charts.umur) state.charts.umur.destroy();

  const umurData = state.data.pendudukUmur || [];

  state.charts.umur = new Chart(ctxUmur, {
    type: 'bar',
    data: {
      labels: umurData.map((d) => d.kelompok_umur || '-'),
      datasets: [
        {
          label: 'Perempuan',
          data: umurData.map((d) => -(d.perempuan || 0)),
          backgroundColor: '#ec4899',
          borderRadius: 2,
        },
        {
          label: 'Laki-laki',
          data: umurData.map((d) => d.laki_laki || 0),
          backgroundColor: '#3b82f6',
          borderRadius: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { boxWidth: 12, font: { size: 10 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.dataset.label}: ${formatNumber(Math.abs(ctx.raw))} jiwa`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            callback: (value) => formatNumber(Math.abs(value)),
          },
        },
        y: {
          stacked: true,
          ticks: {
            font: { size: 9 },
          },
        },
      },
    },
  });

  // Disability Chart
  const ctxDisabilitas = document.getElementById('chartDisabilitas');
  if (state.charts.disabilitas) state.charts.disabilitas.destroy();

  const disabilitasAgg = {
    Fisik: 0,
    'Netra/Buta': 0,
    'Rungu/Wicara': 0,
    'Mental/Jiwa': 0,
    'Fisik & Mental': 0,
    Lainnya: 0,
  };

  disabilitasFiltered.forEach((d) => {
    disabilitasAgg['Fisik'] += Number(d.DISABILITAS_FISIK_JML) || 0;
    disabilitasAgg['Netra/Buta'] += Number(d.DISABILITAS_NETRA_BUTA_JML) || 0;
    disabilitasAgg['Rungu/Wicara'] +=
      Number(d.DISABILITAS_RUNGU_WICARA_JML) || 0;
    disabilitasAgg['Mental/Jiwa'] += Number(d.DISABILITAS_MENTAL_JIWA_JML) || 0;
    disabilitasAgg['Fisik & Mental'] +=
      Number(d.DISABILITAS_FISIK_DAN_MENTAL_JML) || 0;
    disabilitasAgg['Lainnya'] += Number(d.DISABILITAS_LAINNYA_JML) || 0;
  });

  state.charts.disabilitas = new Chart(ctxDisabilitas, {
    type: 'doughnut',
    data: {
      labels: Object.keys(disabilitasAgg),
      datasets: [
        {
          data: Object.values(disabilitasAgg),
          backgroundColor: [
            '#dc2626',
            '#f59e0b',
            '#10b981',
            '#3b82f6',
            '#8b5cf6',
            '#6b7280',
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 10, font: { size: 10 } },
        },
      },
    },
  });
}

function resetFilters() {
  // Reset all filter dropdowns including global filter
  document.getElementById('filterKabupaten').value = '';
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterSektor').value = '';
  document.getElementById('filterSubSektor').value = '';

  // Also reset global filter
  document.getElementById('globalFilterKabupaten').value = '';
  state.globalFilter.kabupaten = '';
  document.getElementById('globalFilterInfo').classList.add('hidden');

  // Re-add all markers without filters
  state.layers.banlog.clearLayers();
  state.layers.jaringan.clearLayers();
  state.layers.puskesmas.clearLayers();
  state.layers.rsud.clearLayers();
  state.layers.fasyankes.clearLayers();
  state.layers.cluster6.clearLayers();

  addBanlogMarkers();
  addJaringanMarkers();
  addPuskesmasMarkers();
  addRSUDMarkers();
  addFasyankesV2Markers();
  addCluster6Markers();

  showToast('Filter direset', 'info');
}

function applyFilter() {
  const kabFilter = document.getElementById('filterKabupaten').value;
  const statusFilter = document.getElementById('filterStatus').value;

  // Update global filter state to keep sync across tabs
  state.globalFilter.kabupaten = kabFilter;

  // Update global filter dropdown
  const globalSelect = document.getElementById('globalFilterKabupaten');
  if (globalSelect) {
    // Find matching option using normalization
    const options = Array.from(globalSelect.options);
    const match = options.find(
      (opt) => opt.value && normalizeKabupaten(opt.value) === normalizeKabupaten(kabFilter)
    );
    globalSelect.value = match ? match.value : kabFilter;
  }

  // Update global filter info display
  const info = document.getElementById('globalFilterInfo');
  const name = document.getElementById('filterKabName');
  if (kabFilter) {
    info.classList.remove('hidden');
    name.textContent = kabFilter;
  } else {
    info.classList.add('hidden');
  }

  // Re-add markers with filters applied
  // Clear all layer markers first
  state.layers.banlog.clearLayers();
  state.layers.jaringan.clearLayers();
  state.layers.puskesmas.clearLayers();
  state.layers.rsud.clearLayers();
  state.layers.fasyankes.clearLayers();
  state.layers.cluster6.clearLayers();

  // Re-add with filters
  addBanlogMarkersFiltered(kabFilter, statusFilter);
  addJaringanMarkersFiltered(kabFilter, statusFilter);
  addPuskesmasMarkersFiltered(kabFilter, statusFilter);
  addRSUDMarkersFiltered(kabFilter, statusFilter);
  addFasyankesV2MarkersFiltered(kabFilter, statusFilter);

  // Also filter cluster6 with kabupaten
  const sektor = document.getElementById('filterSektor').value;
  const subSektor = document.getElementById('filterSubSektor').value;
  addCluster6Markers(sektor, subSektor, kabFilter);

  showToast('Filter diterapkan', 'info');
}

function addBanlogMarkersFiltered(kabFilter, statusFilter) {
  if (!state.data.banlog?.data) return;

  const colors = {
    kuning: '#eab308',
    biru: '#3b82f6',
    biru_keabuan: '#6b7280',
    putih: '#ffffff',
  };

  state.data.banlog.data.forEach((item) => {
    if (!item.latitude || !item.longitude) return;

    // Apply kabupaten filter (using normalized matching)
    if (!matchesKabupatenFilter(item.kabupaten, kabFilter)) return;

    const color = colors[item.kategori] || '#6b7280';
    const icon = createMarkerIcon(color, 'fa-truck');

    const marker = L.marker([item.latitude, item.longitude], { icon })
      .bindPopup(`
                        <div class="popup-header">
                            <strong><i class="fas fa-truck mr-2"></i>Bantuan Logistik</strong>
                        </div>
                        <div class="popup-body">
                            <p><strong>Desa:</strong> ${item.desa || '-'}</p>
                            <p><strong>Kecamatan:</strong> ${item.kecamatan || '-'}</p>
                            <p><strong>Kabupaten:</strong> ${item.kabupaten || '-'}</p>
                            <p><strong>Status:</strong> ${item.kategori || '-'}</p>
                        </div>
                    `);

    state.layers.banlog.addLayer(marker);
  });
}

function addJaringanMarkersFiltered(kabFilter, statusFilter) {
  if (!state.data.jaringan) return;

  const timestamps = Object.keys(state.data.jaringan);
  if (timestamps.length === 0) return;

  const latest = state.data.jaringan[timestamps[timestamps.length - 1]];
  if (!latest?.regions) return;

  latest.regions.forEach((region) => {
    const coords = getKabupatenCoords(region.name);
    if (!coords) return;

    // Apply kabupaten filter (using normalized matching)
    if (!matchesKabupatenFilter(region.name, kabFilter)) return;

    // Apply status filter
    if (statusFilter && region.status !== statusFilter) return;

    const color =
      region.status === 'critical'
        ? '#ef4444'
        : region.status === 'warning'
          ? '#f59e0b'
          : '#10b981';
    const icon = createMarkerIcon(color, 'fa-broadcast-tower');

    const marker = L.marker(coords, { icon }).bindPopup(`
                        <div class="popup-header">
                            <strong><i class="fas fa-broadcast-tower mr-2"></i>Jaringan Telko</strong>
                        </div>
                        <div class="popup-body">
                            <p><strong>Wilayah:</strong> ${region.name}</p>
                            <p><strong>Transmission:</strong> ${region.transmission}</p>
                            <p><strong>Power Failure:</strong> ${region.powerFailure}</p>
                            <p><strong>Tower:</strong> ${region.tower}</p>
                            <p><strong>Status:</strong> <span class="badge badge-${region.status === 'critical' ? 'critical' : region.status === 'warning' ? 'warning' : 'ok'}">${region.status}</span></p>
                        </div>
                    `);

    state.layers.jaringan.addLayer(marker);
  });
}

function addPuskesmasMarkersFiltered(kabFilter, statusFilter) {
  if (!state.data.puskesmas?.data) return;

  state.data.puskesmas.data.forEach((item) => {
    if (!item.latitude || !item.longitude) return;

    // Determine status for filtering
    const itemStatus =
      item.status?.toLowerCase() === 'up' ? 'normal' : 'critical';
    if (statusFilter && itemStatus !== statusFilter) return;

    const color = item.status?.toLowerCase() === 'up' ? '#10b981' : '#ef4444';
    const icon = createMarkerIcon(color, 'fa-hospital');

    const marker = L.marker([item.latitude, item.longitude], { icon })
      .bindPopup(`
                        <div class="popup-header">
                            <strong><i class="fas fa-hospital mr-2"></i>Puskesmas</strong>
                        </div>
                        <div class="popup-body">
                            <p><strong>Nama:</strong> ${item.puskes_name || '-'}</p>
                            <p><strong>Kode:</strong> ${item.puskes_code || '-'}</p>
                            <p><strong>Status:</strong> <span class="badge ${item.status?.toLowerCase() === 'up' ? 'badge-ok' : 'badge-critical'}">${item.status || '-'}</span></p>
                            <p><strong>Jarak Tower:</strong> ${item.distance || '-'} m</p>
                        </div>
                    `);

    state.layers.puskesmas.addLayer(marker);
  });
}

function addRSUDMarkersFiltered(kabFilter, statusFilter) {
  if (!state.data.rsud?.data) return;

  state.data.rsud.data.forEach((item) => {
    if (!item.latitude || !item.longitude) return;

    // Determine status for filtering
    const itemStatus =
      item.status?.toLowerCase() === 'up' ? 'normal' : 'critical';
    if (statusFilter && itemStatus !== statusFilter) return;

    const color = item.status?.toLowerCase() === 'up' ? '#3b82f6' : '#ef4444';
    const icon = createMarkerIcon(color, 'fa-hospital-alt');

    const marker = L.marker([item.latitude, item.longitude], { icon })
      .bindPopup(`
                        <div class="popup-header">
                            <strong><i class="fas fa-hospital-alt mr-2"></i>RSUD</strong>
                        </div>
                        <div class="popup-body">
                            <p><strong>Nama:</strong> ${item.rsu_name || '-'}</p>
                            <p><strong>Status:</strong> <span class="badge ${item.status?.toLowerCase() === 'up' ? 'badge-ok' : 'badge-critical'}">${item.status || '-'}</span></p>
                        </div>
                    `);

    state.layers.rsud.addLayer(marker);
  });
}

function addFasyankesV2MarkersFiltered(kabFilter, statusFilter) {
  if (!state.data.fasyankesV2?.data) return;

  state.data.fasyankesV2.data.forEach((item) => {
    if (!item.latitude || !item.longitude) return;

    // Apply kabupaten filter (using normalized matching)
    if (!matchesKabupatenFilter(item.kab_kota, kabFilter)) return;

    // Get status info and apply filter
    const statusInfo = getFasyankesStatusColor(item);
    const itemStatus =
      statusInfo.status === 'Rusak Berat'
        ? 'critical'
        : statusInfo.status === 'Rusak Sedang' ||
            statusInfo.status === 'Rusak Ringan'
          ? 'warning'
          : 'normal';
    if (statusFilter && itemStatus !== statusFilter) return;

    const isPuskesmas = item.jenis_fasyankes
      ?.toLowerCase()
      .includes('puskesmas');
    const iconClass = isPuskesmas ? 'fa-clinic-medical' : 'fa-hospital-user';
    const icon = createMarkerIcon(statusInfo.color, iconClass);

    const getKondisiBadge = (kondisi, label) => {
      if (!kondisi || kondisi === '-' || kondisi === '0' || kondisi === '') {
        return `<span class="inline-block px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">${label}: -</span>`;
      }
      const colors = {
        RR: 'bg-orange-100 text-orange-700',
        RS: 'bg-yellow-100 text-yellow-700',
        RB: 'bg-red-100 text-red-700',
      };
      return `<span class="inline-block px-2 py-1 ${colors[label] || 'bg-gray-100 text-gray-700'} rounded text-xs">${label}: ${kondisi}</span>`;
    };

    const getNetworkBadge = (status) => {
      if (!status || status === '-')
        return '<span class="text-gray-400">-</span>';
      const s = status.toLowerCase();
      if (s.includes('available') || s.includes('ada') || s.includes('aktif')) {
        return `<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">${status}</span>`;
      } else if (
        s.includes('tidak') ||
        s.includes('down') ||
        s.includes('off')
      ) {
        return `<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">${status}</span>`;
      }
      return `<span class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">${status}</span>`;
    };

    const marker = L.marker([item.latitude, item.longitude], {
      icon,
    }).bindPopup(
      `
                        <div class="popup-header" style="background: linear-gradient(135deg, ${statusInfo.color} 0%, ${statusInfo.color}dd 100%);">
                            <div class="flex items-center justify-between">
                                <strong><i class="fas ${iconClass} mr-2"></i>${item.nama_fasyankes || 'Fasyankes'}</strong>
                            </div>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="px-2 py-0.5 bg-white/20 rounded text-xs">${item.jenis_fasyankes || '-'}</span>
                                <span class="px-2 py-0.5 bg-white/30 rounded text-xs font-semibold">${statusInfo.status}</span>
                            </div>
                        </div>
                        <div class="popup-body" style="min-width: 280px;">
                            <div class="grid grid-cols-2 gap-2 mb-3">
                                <div>
                                    <span class="text-xs text-gray-500">Kab/Kota</span>
                                    <div class="font-medium text-sm">${item.kab_kota || '-'}</div>
                                </div>
                                <div>
                                    <span class="text-xs text-gray-500">Operasional</span>
                                    <div class="font-medium text-sm">${item.aktif_operasional || '-'}</div>
                                </div>
                            </div>
                            <div class="mb-3 p-2 bg-gray-50 rounded-lg">
                                <h4 class="text-xs font-semibold text-gray-600 mb-2"><i class="fas fa-building mr-1"></i>Kondisi</h4>
                                <div class="flex flex-wrap gap-1">
                                    ${getKondisiBadge(item.kondisi_rr, 'RR')}
                                    ${getKondisiBadge(item.kondisi_rs, 'RS')}
                                    ${getKondisiBadge(item.kondisi_rb, 'RB')}
                                </div>
                            </div>
                            ${
                              item.link_maps
                                ? `
                            <div class="text-center pt-2 border-t">
                                <a href="${item.link_maps}" target="_blank" class="text-blue-500 hover:text-blue-700 text-sm">
                                    <i class="fas fa-external-link-alt mr-1"></i>Buka di Google Maps
                                </a>
                            </div>
                            `
                                : ''
                            }
                        </div>
                    `,
      { maxWidth: 320 }
    );

    state.layers.fasyankes.addLayer(marker);
  });
}

// =====================================================
// TAB: PENGUNGSI
// =====================================================
function renderPengungsiTab() {
  updatePengungsiKPIs();
  renderPengungsiCharts();
  renderPengungsiTable();
  initPengungsiMap();
}

// Orang Hilang Slider State
let orangHilangSlideIndex = 0;

function renderOrangHilangSlider() {
  const data = state.data.orangHilang || [];
  const summary = state.data.orangHilangSummary || {};

  // Update summary stats
  document.getElementById('orangHilang-total').textContent = formatNumber(data.length);
  document.getElementById('orangHilang-ongoing').textContent = formatNumber(summary.ongoing || 0);
  document.getElementById('orangHilang-found').textContent = formatNumber(summary.found || 0);

  const cardsContainer = document.getElementById('orangHilang-cards');
  const dotsContainer = document.getElementById('orangHilang-dots');
  const prevBtn = document.getElementById('orangHilang-prev');
  const nextBtn = document.getElementById('orangHilang-next');

  if (!cardsContainer) return;

  if (data.length === 0) {
    cardsContainer.innerHTML = `
      <div class="flex-shrink-0 w-full h-full flex items-center justify-center text-gray-400 text-sm">
        <i class="fas fa-check-circle mr-2 text-green-500"></i>Tidak ada data orang hilang
      </div>
    `;
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    if (dotsContainer) dotsContainer.innerHTML = '';
    return;
  }

  // Generate cards
  cardsContainer.innerHTML = data.map((person, idx) => {
    const photoUrl = person.missingPersonPhotosUrl?.[0] || null;
    const statusClass = person.missingPersonStatus === 'Found'
      ? 'bg-green-100 text-green-700'
      : 'bg-yellow-100 text-yellow-700';
    const statusText = person.missingPersonStatus === 'Found' ? 'Ditemukan' : 'Dicari';

    return `
      <div class="flex-shrink-0 w-full h-full p-2">
        <div class="bg-white border rounded-lg shadow-sm h-full flex gap-3 p-3">
          <div class="flex-shrink-0">
            ${photoUrl
              ? `<img src="${photoUrl}" alt="${person.missingPersonName}" class="w-20 h-24 object-cover rounded-lg border" onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f3f4f6%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 font-size=%2240%22 text-anchor=%22middle%22 fill=%22%239ca3af%22>?</text></svg>';">`
              : `<div class="w-20 h-24 bg-gray-100 rounded-lg flex items-center justify-center"><i class="fas fa-user text-3xl text-gray-300"></i></div>`
            }
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2 mb-1">
              <h4 class="font-semibold text-sm text-gray-800 truncate">${person.missingPersonName || 'Tidak diketahui'}</h4>
              <span class="px-2 py-0.5 ${statusClass} rounded text-xs whitespace-nowrap">${statusText}</span>
            </div>
            <div class="space-y-1 text-xs text-gray-600">
              <div class="flex gap-2">
                <span><i class="fas fa-calendar-alt text-gray-400 mr-1"></i>${person.missingPersonAge || '-'} thn</span>
                <span><i class="fas fa-venus-mars text-gray-400 mr-1"></i>${person.missingPersonGender === 'Male' ? 'Pria' : person.missingPersonGender === 'Female' ? 'Wanita' : '-'}</span>
              </div>
              <div class="truncate"><i class="fas fa-map-marker-alt text-gray-400 mr-1"></i>${person.district || person.regency || '-'}</div>
              <div class="truncate"><i class="fas fa-phone text-gray-400 mr-1"></i>${person.reporterPhone || '-'}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Generate dots
  if (dotsContainer) {
    dotsContainer.innerHTML = data.map((_, idx) =>
      `<button onclick="goToOrangHilangSlide(${idx})" class="w-2 h-2 rounded-full transition-colors ${idx === 0 ? 'bg-red-500' : 'bg-gray-300'}"></button>`
    ).join('');
  }

  // Enable/disable buttons
  orangHilangSlideIndex = 0;
  updateOrangHilangNavButtons();
}

function slideOrangHilang(direction) {
  const data = state.data.orangHilang || [];
  if (data.length === 0) return;

  orangHilangSlideIndex += direction;
  if (orangHilangSlideIndex < 0) orangHilangSlideIndex = 0;
  if (orangHilangSlideIndex >= data.length) orangHilangSlideIndex = data.length - 1;

  updateOrangHilangSlidePosition();
  updateOrangHilangNavButtons();
}

function goToOrangHilangSlide(index) {
  orangHilangSlideIndex = index;
  updateOrangHilangSlidePosition();
  updateOrangHilangNavButtons();
}

function updateOrangHilangSlidePosition() {
  const cardsContainer = document.getElementById('orangHilang-cards');
  if (cardsContainer) {
    cardsContainer.style.transform = `translateX(-${orangHilangSlideIndex * 100}%)`;
  }

  // Update dots
  const dots = document.querySelectorAll('#orangHilang-dots button');
  dots.forEach((dot, idx) => {
    dot.className = `w-2 h-2 rounded-full transition-colors ${idx === orangHilangSlideIndex ? 'bg-red-500' : 'bg-gray-300'}`;
  });
}

function updateOrangHilangNavButtons() {
  const data = state.data.orangHilang || [];
  const prevBtn = document.getElementById('orangHilang-prev');
  const nextBtn = document.getElementById('orangHilang-next');

  if (prevBtn) prevBtn.disabled = orangHilangSlideIndex === 0;
  if (nextBtn) nextBtn.disabled = orangHilangSlideIndex >= data.length - 1;
}

function updatePengungsiKPIs() {
  // Use pre-calculated summary from server proxy (more accurate, includes all data)
  const summary = state.data.pendudukSummary || {};

  // If summary available, use it; otherwise fallback to client-side calculation
  let totalPenduduk = summary.total_penduduk || 0;
  let totalKK = summary.total_kk || 0;
  let totalDisabilitas = summary.total_disabilitas || 0;
  let totalPengungsi = 0;

  // Get pengungsi data from bencana data
  if (state.data.bencana?.total_pengungsi) {
    totalPengungsi = state.data.bencana.total_pengungsi;
  } else if (state.data.bencana?.data) {
    totalPengungsi = state.data.bencana.data.reduce(
      (sum, d) => sum + (d.pengungsi || 0),
      0
    );
  }

  // Fallback to client-side calculation if no summary
  if (!totalPenduduk && state.data.penduduk) {
    totalPenduduk = state.data.penduduk.reduce(
      (sum, d) => sum + (d.jumlah || 0),
      0
    );
  }

  if (!totalKK && state.data.pendudukKK) {
    totalKK = state.data.pendudukKK.reduce(
      (sum, d) => sum + (d.jumlah_kk || 0),
      0
    );
  }

  if (!totalDisabilitas && state.data.pendudukDisabilitas) {
    totalDisabilitas = state.data.pendudukDisabilitas.reduce(
      (sum, d) => sum + (d.jumlah || 0),
      0
    );
  }

  document.getElementById('kpi-penduduk').textContent =
    formatNumber(totalPenduduk);
  document.getElementById('kpi-kk').textContent = formatNumber(totalKK);
  document.getElementById('kpi-disabilitas').textContent =
    formatNumber(totalDisabilitas);
  document.getElementById('kpi-pengungsi-tab').textContent =
    formatNumber(totalPengungsi);
}

function renderPengungsiCharts() {
  // Render Orang Hilang Slider (replacing age distribution chart)
  renderOrangHilangSlider();

  // Disability Chart - aggregate by disability type
  const ctxDisabilitas = document.getElementById('chartDisabilitas');
  if (state.charts.disabilitas) state.charts.disabilitas.destroy();

  const disabilitasRaw = state.data.pendudukDisabilitas || [];
  // Aggregate disability data by type
  const disabilitasAgg = {
    Fisik: 0,
    'Netra/Buta': 0,
    'Rungu/Wicara': 0,
    'Mental/Jiwa': 0,
    'Fisik & Mental': 0,
    Lainnya: 0,
  };
  disabilitasRaw.forEach((d) => {
    disabilitasAgg['Fisik'] += Number(d.DISABILITAS_FISIK_JML) || 0;
    disabilitasAgg['Netra/Buta'] += Number(d.DISABILITAS_NETRA_BUTA_JML) || 0;
    disabilitasAgg['Rungu/Wicara'] +=
      Number(d.DISABILITAS_RUNGU_WICARA_JML) || 0;
    disabilitasAgg['Mental/Jiwa'] += Number(d.DISABILITAS_MENTAL_JIWA_JML) || 0;
    disabilitasAgg['Fisik & Mental'] +=
      Number(d.DISABILITAS_FISIK_DAN_MENTAL_JML) || 0;
    disabilitasAgg['Lainnya'] += Number(d.DISABILITAS_LAINNYA_JML) || 0;
  });

  state.charts.disabilitas = new Chart(ctxDisabilitas, {
    type: 'doughnut',
    data: {
      labels: Object.keys(disabilitasAgg),
      datasets: [
        {
          data: Object.values(disabilitasAgg),
          backgroundColor: [
            '#dc2626',
            '#f59e0b',
            '#10b981',
            '#3b82f6',
            '#8b5cf6',
            '#6b7280',
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 10, font: { size: 10 } },
        },
      },
    },
  });

  // KK per Wilayah Chart - use penduduk_kk level 2 data
  const ctxKK = document.getElementById('chartKK');
  if (state.charts.kk) state.charts.kk.destroy();

  // Use penduduk_kk level 2 (kabkota) - field is 'wilayah' and 'jumlah'
  const kkData = (state.data.pendudukKK || []).filter((d) => d.level === 2);

  state.charts.kk = new Chart(ctxKK, {
    type: 'bar',
    data: {
      labels: kkData.slice(0, 10).map((d) => {
        const nama = d.wilayah || d.nama || '-';
        return nama
          .replace('KAB. ', '')
          .replace('KABUPATEN ', '')
          .replace('KOTA ', '');
      }),
      datasets: [
        {
          label: 'KK',
          data: kkData.slice(0, 10).map((d) => d.jumlah || 0),
          backgroundColor: '#f59e0b',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { maxRotation: 45, minRotation: 45 } } },
    },
  });
}

function renderPengungsiTable() {
  const tbody = document.getElementById('tablePengungsi');

  // Combine penduduk level 2 with pengungsi data from bencana
  const pendudukData = (state.data.penduduk || []).filter(
    (row) => row.level === 2
  );
  const bencanaData = state.data.bencana?.data || [];

  // Create lookup for pengungsi by kabupaten
  const pengungsiLookup = {};
  bencanaData.forEach((b) => {
    const kab = (b.kabupaten || '').toUpperCase();
    if (!pengungsiLookup[kab])
      pengungsiLookup[kab] = { pengungsi: 0, titik: 0 };
    pengungsiLookup[kab].pengungsi += Number(b.pengungsi) || 0;
    pengungsiLookup[kab].titik += Number(b.titik_pengungsian) || 0;
  });

  // Get KK data for each kabkota
  const kkLookup = {};
  (state.data.pendudukKK || [])
    .filter((k) => k.level === 2)
    .forEach((k) => {
      kkLookup[k.kode] = k.jumlah || 0;
    });

  tbody.innerHTML = pendudukData
    .slice(0, 23)
    .map((row) => {
      const wilayah = row.wilayah || row.nama || '-';
      const wilayahUpper = wilayah.toUpperCase();
      const pengungsi = pengungsiLookup[wilayahUpper] || {
        pengungsi: 0,
        titik: 0,
      };
      const kk = kkLookup[row.kode] || 0;

      return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-3 font-medium">${wilayah}</td>
                    <td class="p-3 text-right">${formatNumber(row.jumlah || 0)}</td>
                    <td class="p-3 text-right">${formatNumber(kk)}</td>
                    <td class="p-3 text-right">${formatNumber(pengungsi.pengungsi)}</td>
                </tr>
            `;
    })
    .join('');
}

function initPengungsiMap() {
  if (state.maps.pengungsi) {
    state.maps.pengungsi.invalidateSize();
    return;
  }

  state.maps.pengungsi = L.map('mapPengungsi').setView(
    CONFIG.MAP_CENTER,
    CONFIG.MAP_ZOOM
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(state.maps.pengungsi);

  // Add pengungsi markers from bencana data
  if (state.data.bencana?.data) {
    state.data.bencana.data.forEach((item) => {
      const coords = getKabupatenCoords(item.kabupaten);
      if (!coords || !item.pengungsi) return;

      const icon = createMarkerIcon('#8b5cf6', 'fa-users');
      L.marker(coords, { icon })
        .bindPopup(
          `
                            <div class="popup-header">
                                <strong><i class="fas fa-users mr-2"></i>Pengungsi</strong>
                            </div>
                            <div class="popup-body">
                                <p><strong>Kabupaten:</strong> ${item.kabupaten}</p>
                                <p><strong>Pengungsi:</strong> ${formatNumber(item.pengungsi)}</p>
                                <p><strong>Titik:</strong> ${formatNumber(item.titik_pengungsian)}</p>
                            </div>
                        `
        )
        .addTo(state.maps.pengungsi);
    });
  }
}

// =====================================================
// TAB: BANTUAN
// =====================================================
function renderBantuanTab() {
  updateBantuanKPIs();
  renderBantuanCharts();
  populateBantuanFilters();
  renderBantuanTable();
  initBantuanMap();
}

function updateBantuanKPIs() {
  const data = state.data.banlog;
  if (!data) return;

  document.getElementById('kpi-desa').textContent = formatNumber(
    data.total_desa
  );
  document.getElementById('kpi-kuning').textContent = formatNumber(
    data.total_kuning
  );
  document.getElementById('kpi-biru').textContent = formatNumber(
    data.total_biru
  );
  document.getElementById('kpi-abu').textContent = formatNumber(
    data.total_biru_keabuan
  );
  document.getElementById('kpi-putih').textContent = formatNumber(
    data.total_putih
  );
}

function renderBantuanCharts() {
  const data = state.data.banlog;
  if (!data) return;

  // Status Pie Chart
  const ctxStatus = document.getElementById('chartBantuanStatus');
  if (state.charts.bantuanStatus) state.charts.bantuanStatus.destroy();

  state.charts.bantuanStatus = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: ['Kuning', 'Biru', 'Abu-abu', 'Putih'],
      datasets: [
        {
          data: [
            data.total_kuning,
            data.total_biru,
            data.total_biru_keabuan,
            data.total_putih,
          ],
          backgroundColor: ['#eab308', '#3b82f6', '#6b7280', '#e5e7eb'],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 10 } },
        },
      },
    },
  });

  // Top Kabupaten Bar Chart
  const ctxKab = document.getElementById('chartBantuanKab');
  if (state.charts.bantuanKab) state.charts.bantuanKab.destroy();

  // Aggregate by kabupaten
  const kabCounts = {};
  data.data?.forEach((item) => {
    const kab = item.kabupaten || 'Unknown';
    kabCounts[kab] = (kabCounts[kab] || 0) + 1;
  });

  const sorted = Object.entries(kabCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  state.charts.bantuanKab = new Chart(ctxKab, {
    type: 'bar',
    data: {
      labels: sorted.map((d) => d[0].replace('KAB. ', '').replace('KOTA ', '')),
      datasets: [
        {
          label: 'Titik',
          data: sorted.map((d) => d[1]),
          backgroundColor: '#dc2626',
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });
}

function populateBantuanFilters() {
  const data = state.data.banlog?.data || [];
  const kabSet = new Set();
  data.forEach((d) => d.kabupaten && kabSet.add(d.kabupaten));

  const select = document.getElementById('filterBantuanKab');
  select.innerHTML =
    '<option value="">Semua Kabupaten</option>' +
    [...kabSet]
      .sort()
      .map((k) => `<option value="${k}">${k}</option>`)
      .join('');
}

function renderBantuanTable() {
  const tbody = document.getElementById('tableBantuan');
  let data = state.data.banlog?.data || [];

  // Apply filters (using normalized matching for kabupaten)
  const kabFilter = document.getElementById('filterBantuanKab').value;
  const warnaFilter = document.getElementById('filterBantuanWarna').value;

  if (kabFilter) {
    data = data.filter((d) => matchesKabupatenFilter(d.kabupaten, kabFilter));
  }
  if (warnaFilter) data = data.filter((d) => d.kategori === warnaFilter);

  const colorBadges = {
    kuning: 'bg-yellow-100 text-yellow-700',
    biru: 'bg-blue-100 text-blue-700',
    biru_keabuan: 'bg-gray-100 text-gray-700',
    putih: 'bg-white text-gray-500 border',
  };

  tbody.innerHTML = data
    .slice(0, 50)
    .map(
      (row) => `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-3 font-medium">${row.desa || '-'}</td>
                    <td class="p-3">${row.kecamatan || '-'}</td>
                    <td class="p-3">${row.kabupaten || '-'}</td>
                    <td class="p-3">${row.satuan || '-'}</td>
                    <td class="p-3 text-center">
                        <span class="badge ${colorBadges[row.kategori] || 'bg-gray-100'}">${row.kategori || '-'}</span>
                    </td>
                </tr>
            `
    )
    .join('');
}

function onBantuanFilterChange() {
  const kabFilter = document.getElementById('filterBantuanKab').value;

  // Update global filter state
  state.globalFilter.kabupaten = kabFilter;

  // Update global filter dropdown
  const globalSelect = document.getElementById('globalFilterKabupaten');
  if (globalSelect) {
    const options = Array.from(globalSelect.options);
    const match = options.find(
      (opt) => opt.value && normalizeKabupaten(opt.value) === normalizeKabupaten(kabFilter)
    );
    globalSelect.value = match ? match.value : kabFilter;
  }

  // Update global filter info display
  const info = document.getElementById('globalFilterInfo');
  const name = document.getElementById('filterKabName');
  if (kabFilter) {
    info.classList.remove('hidden');
    name.textContent = kabFilter;
  } else {
    info.classList.add('hidden');
  }

  // Render the table
  renderBantuanTable();
}

function initBantuanMap() {
  if (state.maps.bantuan) {
    state.maps.bantuan.invalidateSize();
    return;
  }

  state.maps.bantuan = L.map('mapBantuan').setView(
    CONFIG.MAP_CENTER,
    CONFIG.MAP_ZOOM
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(state.maps.bantuan);

  // Add banlog markers
  const colors = {
    kuning: '#eab308',
    biru: '#3b82f6',
    biru_keabuan: '#6b7280',
    putih: '#e5e7eb',
  };

  state.data.banlog?.data?.forEach((item) => {
    if (!item.latitude || !item.longitude) return;

    const color = colors[item.kategori] || '#6b7280';
    const icon = createMarkerIcon(color, 'fa-box');

    L.marker([item.latitude, item.longitude], { icon })
      .bindPopup(
        `
                        <div class="popup-header">
                            <strong><i class="fas fa-box mr-2"></i>Bantuan</strong>
                        </div>
                        <div class="popup-body">
                            <p><strong>Desa:</strong> ${item.desa || '-'}</p>
                            <p><strong>Kecamatan:</strong> ${item.kecamatan || '-'}</p>
                            <p><strong>Kabupaten:</strong> ${item.kabupaten || '-'}</p>
                            <p><strong>Status:</strong> ${item.kategori || '-'}</p>
                        </div>
                    `
      )
      .addTo(state.maps.bantuan);
  });
}

// =====================================================
// GEOJSON & HELPERS
// =====================================================

// Normalize kabupaten name for matching GeoJSON (Aceh Barat) with data (ACEH BARAT / KAB. ACEH BARAT)
function normalizeKabupatenName(name) {
  if (!name) return '';
  return name
    .toUpperCase()
    .replace(/^KAB\.\s*/i, '')
    .replace(/^KABUPATEN\s*/i, '')
    .replace(/^KOTA\s*/i, '')
    .trim();
}

// Get bencana data for a kabupaten by matching normalized names
function getBencanaDataByKabupaten(geoName) {
  if (!state.data.bencana?.data) return null;
  const normalizedGeo = normalizeKabupatenName(geoName);

  const found = state.data.bencana.data.find((item) => {
    const normalizedData = normalizeKabupatenName(item.kabupaten);
    return normalizedGeo === normalizedData;
  });

  return found;
}

// Get heatmap color based on jiwa_terdampak value
// Uses same color system: Merah (Berat), Orange (Sedang), Hijau (Aman), Abu-abu (No data)
function getHeatmapColor(jiwaTerdampak) {
  if (!jiwaTerdampak || jiwaTerdampak === 0) return '#9ca3af'; // abu-abu - tidak ada data
  if (jiwaTerdampak > 10000) return '#dc2626'; // merah - Terdampak Berat
  if (jiwaTerdampak > 1000) return '#f59e0b'; // orange - Terdampak Sedang
  return '#22c55e'; // hijau - Aman/Ringan
}

// Get heatmap fill opacity based on jiwa_terdampak value
function getHeatmapOpacity(jiwaTerdampak) {
  if (!jiwaTerdampak || jiwaTerdampak === 0) return 0.2;
  if (jiwaTerdampak > 10000) return 0.7; // Tanggap - more visible
  if (jiwaTerdampak > 1000) return 0.6; // Siaga
  return 0.5;
}

// Create popup content for kabupaten with integrated banjir detail
function createKabupatenPopup(geoName, data) {
  const kabName = geoName || 'Unknown';
  const popupId = `popup-${kabName.replace(/[^a-zA-Z0-9]/g, '-')}`;

  // Build bencana summary section
  const bencanaSection = data ? `
    <div class="space-y-1.5 text-sm mb-3">
      <div class="flex justify-between">
        <span class="text-gray-600">Jiwa Terdampak:</span>
        <span class="font-semibold text-red-600">${formatNumber(data.jiwa_terdampak)}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Pengungsi:</span>
        <span class="font-semibold">${formatNumber(data.pengungsi)}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Titik Pengungsian:</span>
        <span class="font-semibold">${formatNumber(data.titik_pengungsian)}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Rumah Rusak:</span>
        <span class="font-semibold">${formatNumber(data.rumah)} unit</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Fasum Rusak:</span>
        <span class="font-semibold">${formatNumber(data.fasum)} unit</span>
      </div>
    </div>
  ` : '<p class="text-gray-500 text-sm mb-3">Tidak ada data bencana umum</p>';

  return `<div class="p-2 min-w-[320px] max-w-[400px]" id="${popupId}">
        <h3 class="font-bold text-gray-800 text-lg mb-2 border-b pb-2 flex items-center gap-2">
          <i class="fas fa-map-marker-alt text-blue-600"></i>
          ${geoName}
        </h3>
        ${bencanaSection}
        <div class="border-t pt-2">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              <i class="fas fa-layer-group mr-1"></i>Detail Per Kecamatan
            </span>
          </div>
          <div id="${popupId}-detail" class="banjir-detail-container">
            <div class="text-center py-3">
              <i class="fas fa-spinner fa-spin text-blue-500 mr-2"></i>
              <span class="text-sm text-gray-500">Memuat data...</span>
            </div>
          </div>
        </div>
      </div>`;
}

// Load and render banjir detail directly in popup
async function loadBanjirDetailInPopup(kabupaten, popupId) {
  const detailContainer = document.getElementById(`${popupId}-detail`);
  if (!detailContainer) return;

  try {
    const response = await api.getBanjirDetailByKabupaten(kabupaten, 'sheet');

    if (!response || !response.data || response.data.length === 0) {
      detailContainer.innerHTML = `
        <div class="text-center py-2 text-gray-500 text-sm">
          <i class="fas fa-info-circle mr-1"></i>Tidak ada data detail
        </div>`;
      return;
    }

    // Group data by kecamatan
    const kecamatanData = {};
    response.data.forEach(item => {
      if (item.level === 'kecamatan') {
        kecamatanData[item.kecamatan] = { summary: item, desa: [] };
      }
    });

    response.data.forEach(item => {
      if (item.level === 'desa' && item.kecamatan && kecamatanData[item.kecamatan]) {
        kecamatanData[item.kecamatan].desa.push(item);
      }
    });

    // Build compact kecamatan list
    const kecamatanList = Object.entries(kecamatanData).map(([kecName, kecData]) => {
      const summary = kecData.summary;
      const kecId = kecName.replace(/[^a-zA-Z0-9]/g, '-');

      const desaRows = kecData.desa.map(desa => `
        <div class="flex justify-between text-xs py-1 border-b border-gray-100 last:border-0 pl-4">
          <span class="text-gray-600 truncate flex-1">${desa.desa || '-'}</span>
          <span class="text-red-600 ml-2 w-16 text-right">${formatNumber(desa.terdampak_jiwa)}</span>
          <span class="text-blue-600 ml-2 w-14 text-right">${formatNumber(desa.pengungsi_jiwa)}</span>
        </div>
      `).join('');

      return `
        <div class="border rounded mb-1.5 overflow-hidden">
          <div class="bg-orange-50 px-2 py-1.5 flex items-center justify-between cursor-pointer hover:bg-orange-100 transition text-sm"
               onclick="togglePopupKecDetail('${kecId}')">
            <div class="flex items-center gap-1.5 flex-1 min-w-0">
              <i class="fas fa-map-pin text-orange-500 text-xs"></i>
              <span class="font-medium text-gray-800 truncate">${kecName}</span>
              <span class="text-xs text-gray-400">(${kecData.desa.length})</span>
            </div>
            <div class="flex items-center gap-2 text-xs flex-shrink-0">
              <span class="text-red-600">${formatNumber(summary?.terdampak_jiwa || 0)}</span>
              <span class="text-blue-600">${formatNumber(summary?.pengungsi_jiwa || 0)}</span>
              <i class="fas fa-chevron-down text-gray-400 text-xs transition-transform" id="chev-${kecId}"></i>
            </div>
          </div>
          <div class="hidden bg-white" id="kec-detail-${kecId}">
            <div class="flex justify-between text-xs py-1 px-2 bg-gray-50 text-gray-500 font-medium">
              <span class="flex-1">Desa/Kelurahan</span>
              <span class="w-16 text-right">Terdampak</span>
              <span class="w-14 text-right">Pengungsi</span>
            </div>
            <div class="max-h-32 overflow-y-auto px-2">
              ${desaRows || '<div class="text-center text-gray-400 py-2 text-xs">Tidak ada data desa</div>'}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Calculate totals
    const totals = Object.values(kecamatanData).reduce((acc, kec) => {
      const s = kec.summary || {};
      return {
        terdampak_jiwa: acc.terdampak_jiwa + (s.terdampak_jiwa || 0),
        pengungsi_jiwa: acc.pengungsi_jiwa + (s.pengungsi_jiwa || 0),
        korban: acc.korban + (s.korban_hilang || 0) + (s.korban_meninggal || 0),
      };
    }, { terdampak_jiwa: 0, pengungsi_jiwa: 0, korban: 0 });

    detailContainer.innerHTML = `
      <div class="bg-blue-50 rounded px-2 py-1.5 mb-2 flex justify-between text-xs">
        <span class="text-blue-800"><strong>${Object.keys(kecamatanData).length}</strong> Kecamatan</span>
        <span class="text-red-600"><i class="fas fa-users mr-1"></i>${formatNumber(totals.terdampak_jiwa)}</span>
        <span class="text-blue-600"><i class="fas fa-campground mr-1"></i>${formatNumber(totals.pengungsi_jiwa)}</span>
        ${totals.korban > 0 ? `<span class="text-red-700"><i class="fas fa-skull mr-1"></i>${formatNumber(totals.korban)}</span>` : ''}
      </div>
      <div class="max-h-48 overflow-y-auto">
        ${kecamatanList}
      </div>
      <div class="text-xs text-gray-400 mt-1 text-center">
        <i class="fas fa-sync-alt mr-1"></i>Real-time dari Google Sheets
      </div>
    `;

  } catch (error) {
    console.error('Error loading banjir detail:', error);
    detailContainer.innerHTML = `
      <div class="text-center py-2 text-red-500 text-sm">
        <i class="fas fa-exclamation-circle mr-1"></i>Gagal memuat data
      </div>`;
  }
}

// Toggle kecamatan detail in popup
function togglePopupKecDetail(kecId) {
  const detailEl = document.getElementById(`kec-detail-${kecId}`);
  const chevronEl = document.getElementById(`chev-${kecId}`);

  if (detailEl) {
    detailEl.classList.toggle('hidden');
  }
  if (chevronEl) {
    chevronEl.classList.toggle('rotate-180');
  }
}

// Load banjir detail for a kabupaten and show in modal/expanded section
async function loadBanjirDetailForKabupaten(kabupaten) {
  try {
    showToast(`Memuat data detail ${kabupaten}...`, 'info');

    // Fetch data from API (use sheet source for real-time)
    const response = await api.getBanjirDetailByKabupaten(kabupaten, 'sheet');

    if (!response || !response.data || response.data.length === 0) {
      showToast(`Tidak ada data detail untuk ${kabupaten}`, 'warning');
      return;
    }

    // Show modal with detail data
    showBanjirDetailModal(kabupaten, response.data);

  } catch (error) {
    console.error('Error loading banjir detail:', error);
    showToast(`Gagal memuat data: ${error.message}`, 'error');
  }
}

// Show modal with banjir detail data
function showBanjirDetailModal(kabupaten, data) {
  // Remove existing modal if any
  const existingModal = document.getElementById('banjirDetailModal');
  if (existingModal) existingModal.remove();

  // Group data by kecamatan
  const kecamatanData = {};
  data.forEach(item => {
    if (item.level === 'kecamatan') {
      kecamatanData[item.kecamatan] = {
        summary: item,
        desa: []
      };
    }
  });

  // Add desa to their kecamatan
  data.forEach(item => {
    if (item.level === 'desa' && item.kecamatan && kecamatanData[item.kecamatan]) {
      kecamatanData[item.kecamatan].desa.push(item);
    }
  });

  // Build HTML
  const kecamatanList = Object.entries(kecamatanData).map(([kecName, kecData]) => {
    const summary = kecData.summary;
    const desaRows = kecData.desa.map(desa => `
      <tr class="text-xs border-t border-gray-100 hover:bg-gray-50">
        <td class="py-1.5 px-2 pl-6">${desa.desa || '-'}</td>
        <td class="py-1.5 px-2 text-right">${formatNumber(desa.terdampak_kk)}</td>
        <td class="py-1.5 px-2 text-right">${formatNumber(desa.terdampak_jiwa)}</td>
        <td class="py-1.5 px-2 text-right">${formatNumber(desa.pengungsi_jiwa)}</td>
        <td class="py-1.5 px-2 text-right text-red-600">${formatNumber(desa.korban_hilang)}</td>
        <td class="py-1.5 px-2 text-right text-red-600">${formatNumber(desa.korban_meninggal)}</td>
      </tr>
    `).join('');

    return `
      <div class="border rounded-lg mb-2 overflow-hidden">
        <div class="bg-orange-50 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-orange-100 transition"
             onclick="toggleKecamatanDetail('${kecName.replace(/'/g, "\\'")}')">
          <div class="flex items-center gap-2">
            <i class="fas fa-map-marker-alt text-orange-500"></i>
            <span class="font-medium text-gray-800">${kecName}</span>
            <span class="text-xs text-gray-500">(${kecData.desa.length} desa)</span>
          </div>
          <div class="flex items-center gap-3 text-xs">
            <span class="text-red-600"><i class="fas fa-users mr-1"></i>${formatNumber(summary?.terdampak_jiwa || 0)}</span>
            <span class="text-blue-600"><i class="fas fa-campground mr-1"></i>${formatNumber(summary?.pengungsi_jiwa || 0)}</span>
            <i class="fas fa-chevron-down text-gray-400 kec-chevron" id="chevron-${kecName.replace(/[^a-zA-Z0-9]/g, '-')}"></i>
          </div>
        </div>
        <div class="hidden" id="detail-${kecName.replace(/[^a-zA-Z0-9]/g, '-')}">
          <table class="w-full">
            <thead class="bg-gray-50 text-xs text-gray-600">
              <tr>
                <th class="py-1.5 px-2 text-left">Desa</th>
                <th class="py-1.5 px-2 text-right">KK</th>
                <th class="py-1.5 px-2 text-right">Jiwa</th>
                <th class="py-1.5 px-2 text-right">Pengungsi</th>
                <th class="py-1.5 px-2 text-right">Hilang</th>
                <th class="py-1.5 px-2 text-right">MD</th>
              </tr>
            </thead>
            <tbody>${desaRows || '<tr><td colspan="6" class="text-center text-gray-400 py-2">Tidak ada data desa</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');

  // Calculate totals from kecamatan level only (to avoid double counting)
  const totals = Object.values(kecamatanData).reduce((acc, kec) => {
    const s = kec.summary || {};
    return {
      terdampak_kk: acc.terdampak_kk + (s.terdampak_kk || 0),
      terdampak_jiwa: acc.terdampak_jiwa + (s.terdampak_jiwa || 0),
      pengungsi_kk: acc.pengungsi_kk + (s.pengungsi_kk || 0),
      pengungsi_jiwa: acc.pengungsi_jiwa + (s.pengungsi_jiwa || 0),
      korban_hilang: acc.korban_hilang + (s.korban_hilang || 0),
      korban_meninggal: acc.korban_meninggal + (s.korban_meninggal || 0),
    };
  }, { terdampak_kk: 0, terdampak_jiwa: 0, pengungsi_kk: 0, pengungsi_jiwa: 0, korban_hilang: 0, korban_meninggal: 0 });

  const modalHtml = `
    <div id="banjirDetailModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onclick="closeBanjirDetailModal(event)">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onclick="event.stopPropagation()">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="fas fa-water"></i>
            <h2 class="font-semibold">Detail Banjir - ${kabupaten}</h2>
          </div>
          <button onclick="closeBanjirDetailModal()" class="hover:bg-white/20 p-1 rounded transition">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-3 md:grid-cols-6 gap-2 p-3 bg-gray-50 border-b">
          <div class="text-center p-2 bg-white rounded shadow-sm">
            <div class="text-xs text-gray-500">Kecamatan</div>
            <div class="font-bold text-blue-600">${Object.keys(kecamatanData).length}</div>
          </div>
          <div class="text-center p-2 bg-white rounded shadow-sm">
            <div class="text-xs text-gray-500">Terdampak KK</div>
            <div class="font-bold text-orange-600">${formatNumber(totals.terdampak_kk)}</div>
          </div>
          <div class="text-center p-2 bg-white rounded shadow-sm">
            <div class="text-xs text-gray-500">Terdampak Jiwa</div>
            <div class="font-bold text-red-600">${formatNumber(totals.terdampak_jiwa)}</div>
          </div>
          <div class="text-center p-2 bg-white rounded shadow-sm">
            <div class="text-xs text-gray-500">Pengungsi KK</div>
            <div class="font-bold text-purple-600">${formatNumber(totals.pengungsi_kk)}</div>
          </div>
          <div class="text-center p-2 bg-white rounded shadow-sm">
            <div class="text-xs text-gray-500">Pengungsi Jiwa</div>
            <div class="font-bold text-indigo-600">${formatNumber(totals.pengungsi_jiwa)}</div>
          </div>
          <div class="text-center p-2 bg-white rounded shadow-sm">
            <div class="text-xs text-gray-500">Korban</div>
            <div class="font-bold text-red-700">${formatNumber(totals.korban_hilang + totals.korban_meninggal)}</div>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-3">
          ${kecamatanList || '<p class="text-center text-gray-500 py-8">Tidak ada data kecamatan</p>'}
        </div>

        <!-- Footer -->
        <div class="border-t px-4 py-2 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
          <span><i class="fas fa-info-circle mr-1"></i>Klik kecamatan untuk melihat detail desa</span>
          <span>Sumber: Google Sheets (Real-time)</span>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Toggle kecamatan detail visibility
function toggleKecamatanDetail(kecName) {
  const id = kecName.replace(/[^a-zA-Z0-9]/g, '-');
  const detailEl = document.getElementById(`detail-${id}`);
  const chevronEl = document.getElementById(`chevron-${id}`);

  if (detailEl) {
    detailEl.classList.toggle('hidden');
  }
  if (chevronEl) {
    chevronEl.classList.toggle('rotate-180');
  }
}

// Close banjir detail modal
function closeBanjirDetailModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('banjirDetailModal');
  if (modal) modal.remove();
}

async function loadGeoJSON(map) {
  try {
    console.log('Loading GeoJSON...');
    console.log(
      'Bencana data available:',
      state.data.bencana?.data?.length || 0,
      'records'
    );

    const response = await fetch(CONFIG.GEOJSON_URL);
    const geojson = await response.json();

    console.log('GeoJSON loaded:', geojson.features?.length || 0, 'features');

    // Store geojson layer reference for later updates
    if (state.layers.geojson) {
      map.removeLayer(state.layers.geojson);
    }

    state.layers.geojson = L.geoJSON(geojson, {
      style: (feature) => {
        const geoName = feature.properties?.Kab_Kota;
        const bencanaData = getBencanaDataByKabupaten(geoName);
        const jiwaTerdampak = bencanaData?.jiwa_terdampak || 0;

        return {
          color: '#6b7280', // gray-500 border
          weight: 1,
          opacity: 0.3,
          fillColor: getHeatmapColor(jiwaTerdampak),
          fillOpacity: getHeatmapOpacity(jiwaTerdampak),
        };
      },
      onEachFeature: (feature, layer) => {
        const geoName = feature.properties?.Kab_Kota;
        if (geoName) {
          const bencanaData = getBencanaDataByKabupaten(geoName);

          // Bind tooltip (on hover)
          layer.bindTooltip(geoName, {
            permanent: false,
            direction: 'center',
            className: 'font-semibold',
          });

          // Bind popup (on click)
          const popupId = `popup-${geoName.replace(/[^a-zA-Z0-9]/g, '-')}`;
          layer.bindPopup(createKabupatenPopup(geoName, bencanaData), {
            maxWidth: 420,
            className: 'kabupaten-popup',
          });

          // Load banjir detail when popup opens
          layer.on('popupopen', () => {
            loadBanjirDetailInPopup(geoName, popupId);
          });

          // Hover effects
          layer.on({
            mouseover: (e) => {
              const layer = e.target;
              layer.setStyle({
                weight: 3,
                opacity: 1,
              });
              layer.bringToFront();
            },
            mouseout: (e) => {
              state.layers.geojson.resetStyle(e.target);
            },
          });
        }
      },
    }).addTo(map);
  } catch (error) {
    console.error('Error loading GeoJSON:', error);
  }
}

// Refresh GeoJSON layer style and popups with updated bencana data
function refreshGeoJSONLayer(map) {
  // Check if we're using the new dampak polygon layer
  if (state.layers.dampakPolygon && map === state.maps.dampak) {
    // Refresh the dampak polygon layer
    refreshDampakPolygonLayer(map);
    return;
  }

  if (!state.layers.geojson) {
    // If no geojson layer exists, load it
    loadGeoJSON(map);
    return;
  }

  // Update style and popups for each feature
  state.layers.geojson.eachLayer((layer) => {
    const geoName = layer.feature?.properties?.Kab_Kota;
    if (geoName) {
      const bencanaData = getBencanaDataByKabupaten(geoName);
      const jiwaTerdampak = bencanaData?.jiwa_terdampak || 0;

      // Update style
      layer.setStyle({
        color: '#6b7280',
        weight: 2,
        opacity: 0.8,
        fillColor: getHeatmapColor(jiwaTerdampak),
        fillOpacity: getHeatmapOpacity(jiwaTerdampak),
      });

      // Update popup content
      layer.setPopupContent(createKabupatenPopup(geoName, bencanaData));
    }
  });
}

// Refresh Dampak polygon layer with updated data
function refreshDampakPolygonLayer(map) {
  if (!state.layers.dampakPolygon) {
    loadDampakPolygonGeoJSON(map);
    return;
  }

  // Update style and popups for each feature
  state.layers.dampakPolygon.eachLayer((layer) => {
    const props = layer.feature?.properties || {};
    const namaWilayah = props.nama || '';

    if (namaWilayah) {
      const bencanaData = getBencanaDataByKabupaten(namaWilayah);
      const jiwaTerdampak = bencanaData?.jiwa_terdampak || 0;

      // Determine fill color
      let fillColor = '#e5e7eb';
      let fillOpacity = 0.3;

      if (jiwaTerdampak > 0) {
        fillColor = getHeatmapColor(jiwaTerdampak);
        fillOpacity = getHeatmapOpacity(jiwaTerdampak);
      } else {
        const kondisiSummary = props.condition_summary || {};
        const dominantKondisi = getDominantCondition(kondisiSummary);
        if (dominantKondisi && dominantKondisi !== 'Tidak ada data') {
          fillColor = getKondisiColor(dominantKondisi);
          fillOpacity = 0.6;
        }
      }

      // Update style
      layer.setStyle({
        color: '#6b7280',
        weight: 1.5,
        opacity: 0.8,
        fillColor: fillColor,
        fillOpacity: fillOpacity,
      });

      // Update popup content
      layer.setPopupContent(createDampakPolygonPopup(namaWilayah, props, bencanaData));
    }
  });
}

function getKabupatenCoords(name) {
  // Approximate coordinates for Aceh kabupaten/kota
  const coords = {
    'KAB. ACEH BARAT': [4.4518, 96.1597],
    'KAB. ACEH BARAT DAYA': [3.8352, 96.8877],
    'KAB. ACEH BESAR': [5.3801, 95.5207],
    'KAB. ACEH JAYA': [4.7128, 95.6503],
    'KAB. ACEH SELATAN': [3.2089, 97.3877],
    'KAB. ACEH SINGKIL': [2.4175, 97.7892],
    'KAB. ACEH TAMIANG': [4.2535, 97.9785],
    'KAB. ACEH TENGAH': [4.6242, 96.8467],
    'KAB. ACEH TENGGARA': [3.2892, 97.7204],
    'KAB. ACEH TIMUR': [4.6314, 97.7767],
    'KAB. ACEH UTARA': [5.0037, 97.1373],
    'KAB. BENER MERIAH': [4.7584, 96.9517],
    'KAB. BIREUEN': [5.0384, 96.7006],
    'KAB. GAYO LUES': [3.9378, 97.3967],
    'KAB. NAGAN RAYA': [4.1494, 96.4319],
    'KAB. PIDIE': [5.0729, 96.1499],
    'KAB. PIDIE JAYA': [5.1392, 96.2283],
    'KAB. SIMEULUE': [2.6209, 96.0833],
    'KOTA BANDA ACEH': [5.5483, 95.3238],
    'KOTA LANGSA': [4.4683, 97.9683],
    'KOTA LHOKSEUMAWE': [5.1796, 97.1507],
    'KOTA SABANG': [5.8883, 95.3167],
    'KOTA SUBULUSSALAM': [2.6417, 98.0],
  };

  // Try exact match first
  if (coords[name]) return coords[name];

  // Try partial match
  for (const [key, value] of Object.entries(coords)) {
    if (
      name?.includes(key.replace('KAB. ', '').replace('KOTA ', '')) ||
      key.includes(name?.replace('KAB. ', '').replace('KOTA ', ''))
    ) {
      return value;
    }
  }

  return null;
}

// =====================================================
// WILAYAH POLYGON LAYER (CHOROPLETH)
// =====================================================

// Polygon state
const polygonState = {
  level: 2, // Default to kabkota level
  parentKode: '11', // Aceh province
  data: null,
  layer: null,
  searchResults: [],
  selectedKode: null,
};

// Color scale for choropleth based on population
function getPolygonColor(penduduk) {
  const p = penduduk || 0;
  return p > 500000 ? '#800026' :
         p > 200000 ? '#BD0026' :
         p > 100000 ? '#E31A1C' :
         p > 50000  ? '#FC4E2A' :
         p > 20000  ? '#FD8D3C' :
         p > 10000  ? '#FEB24C' :
         p > 5000   ? '#FED976' :
                      '#FFEDA0';
}

// Color scale based on kondisi (disaster condition)
// Simplified: 4 categories - Berat (merah), Sedang (orange), Aman (hijau), Tidak ada data (abu-abu)
function getKondisiColor(kondisi) {
  if (!kondisi) return '#9ca3af'; // Abu-abu = Tidak ada data
  const k = kondisi.toLowerCase();

  // Merah = Terdampak Berat (berat, parah, seluruh)
  if (k.includes('berat') || k.includes('parah') || k.includes('seluruh')) return '#dc2626';

  // Orange = Terdampak Sedang (sedang, sebagian, terdampak/banjir tanpa "tidak")
  if (k.includes('sedang') || k.includes('sebagian')) return '#f59e0b';
  if ((k.includes('terdampak') || k.includes('banjir')) && !k.includes('tidak')) return '#f59e0b';

  // Hijau = Tidak Terdampak / Aman / Ringan / Normal
  if (k.includes('ringan') || k.includes('tidak') || k.includes('aman') || k.includes('normal')) return '#22c55e';

  return '#9ca3af'; // Default: Abu-abu
}

// Get dominant condition from condition_summary object
// Prioritizes "terdampak" conditions over "tidak terdampak"
function getDominantCondition(conditionSummary) {
  if (!conditionSummary || typeof conditionSummary !== 'object') return null;

  const entries = Object.entries(conditionSummary);
  if (entries.length === 0) return null;

  // Separate terdampak vs tidak terdampak conditions
  const terdampakEntries = entries.filter(([k]) => {
    const lower = k.toLowerCase();
    return (lower.includes('terdampak') || lower.includes('banjir')) && !lower.includes('tidak');
  });

  // If there are any "terdampak" conditions, prioritize those by severity
  if (terdampakEntries.length > 0) {
    terdampakEntries.sort((a, b) => {
      const getScore = (str) => {
        const s = str.toLowerCase();
        if (s.includes('berat') || s.includes('parah') || s.includes('seluruh')) return 4;
        if (s.includes('sedang')) return 3;
        if (s.includes('sebagian')) return 2;
        if (s.includes('ringan')) return 1;
        return 0;
      };
      return getScore(b[0]) - getScore(a[0]);
    });
    return terdampakEntries[0][0];
  }

  // No terdampak conditions, return the most common
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

// Initialize polygon layer on map
async function initPolygonLayer(map) {
  if (!map) return;

  console.log('Initializing polygon layer...');

  try {
    const result = await api.getPolygonGeoJSON({
      level: polygonState.level,
      parent: polygonState.parentKode
    });

    // Backend returns { polygons, points, summary }
    if (!result || !result.polygons) {
      console.warn('No polygon data received');
      return;
    }

    polygonState.data = result;

    // Remove existing layer if any
    if (polygonState.layer && map.hasLayer(polygonState.layer)) {
      map.removeLayer(polygonState.layer);
    }

    // Create GeoJSON layer with choropleth styling
    polygonState.layer = L.geoJSON(result.polygons, {
      style: (feature) => {
        const props = feature.properties || {};
        // Get dominant condition from condition_summary
        const kondisiSummary = props.condition_summary || {};
        const dominantKondisi = getDominantCondition(kondisiSummary);

        return {
          fillColor: getKondisiColor(dominantKondisi),
          weight: 1.5,
          opacity: 0.8,
          color: '#374151',
          fillOpacity: 0.6,
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};

        // Tooltip on hover
        layer.bindTooltip(`
          <div class="font-semibold">${props.nama || 'N/A'}</div>
          <div class="text-xs text-gray-600">Kode: ${props.kode || 'N/A'}</div>
        `, {
          permanent: false,
          direction: 'center',
          className: 'polygon-tooltip'
        });

        // Popup on click - wide horizontal layout
        layer.bindPopup(() => createPolygonPopup(props), {
          maxWidth: 600,
          minWidth: 400,
          className: 'polygon-popup'
        });

        // Hover effects
        layer.on({
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({
              weight: 3,
              color: '#1d4ed8',
              fillOpacity: 0.8
            });
            target.bringToFront();
          },
          mouseout: (e) => {
            polygonState.layer.resetStyle(e.target);
          },
          click: () => {
            polygonState.selectedKode = props.kode;
          },
          popupopen: () => {
            // Load breakdown data after popup is rendered
            setTimeout(() => loadPolygonBreakdown(props.kode), 50);
          }
        });
      }
    });

    // Store in state.layers for toggle functionality
    state.layers.polygon = polygonState.layer;

    console.log(`Polygon layer loaded: ${result.polygons.features?.length || 0} features`);

    // Update stats
    updatePolygonStats(result);

  } catch (error) {
    console.error('Error loading polygon layer:', error);
  }
}

// Create popup content for polygon - Wide horizontal layout
function createPolygonPopup(props) {
  const penduduk = props.penduduk_total || 0;
  const pendudukLaki = props.penduduk_laki || 0;
  const pendudukPerempuan = props.penduduk_perempuan || 0;
  // Get dominant condition from condition_summary
  const kondisiSummary = props.condition_summary || {};
  const kondisi = getDominantCondition(kondisiSummary) || 'Tidak ada data';
  // Use correct backend property names
  const poskoCount = props.jumlah_posko || 0;
  const pengungsi = props.jumlah_pengungsi || 0;
  const affected = props.affected_population || 0;
  const displaced = props.displaced_population || 0;

  return `
    <div class="polygon-popup-content">
      <div class="popup-header bg-gradient-to-r from-violet-600 to-indigo-700 text-white p-3 rounded-t">
        <h3 class="font-bold text-base">${props.nama || 'N/A'}</h3>
        <div class="text-xs opacity-90">Kode: ${props.kode || 'N/A'} | Level: ${props.level || 'N/A'}</div>
      </div>

      <div class="polygon-popup-body p-3">
        <!-- Left: Stats -->
        <div class="polygon-popup-left">
          <div class="grid grid-cols-3 gap-2 mb-3">
            <div class="bg-blue-50 p-2 rounded text-center">
              <div class="text-[10px] text-blue-600">Penduduk</div>
              <div class="font-bold text-blue-800 text-sm">${formatNumber(penduduk)}</div>
            </div>
            <div class="bg-cyan-50 p-2 rounded text-center">
              <div class="text-[10px] text-cyan-600">Laki-laki</div>
              <div class="font-bold text-cyan-800 text-sm">${formatNumber(pendudukLaki)}</div>
            </div>
            <div class="bg-pink-50 p-2 rounded text-center">
              <div class="text-[10px] text-pink-600">Perempuan</div>
              <div class="font-bold text-pink-800 text-sm">${formatNumber(pendudukPerempuan)}</div>
            </div>
          </div>

          <div class="space-y-1 text-xs">
            <div class="flex justify-between items-center">
              <span class="text-gray-500">Kondisi</span>
              <span class="font-semibold ${getKondisiTextColor(kondisi)}">${kondisi}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-500">Terdampak</span>
              <span class="font-semibold text-red-600">${formatNumber(affected)}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-500">Mengungsi</span>
              <span class="font-semibold text-orange-600">${formatNumber(displaced)}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-500">Posko</span>
              <span class="font-semibold text-indigo-600">${poskoCount}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-500">Di Posko</span>
              <span class="font-semibold text-amber-600">${formatNumber(pengungsi)}</span>
            </div>
          </div>
        </div>

        <!-- Right: Breakdown with pagination -->
        <div class="polygon-popup-right">
          <div id="polygon-breakdown-${props.kode?.replace(/\./g, '-')}" class="polygon-breakdown-container text-xs text-gray-500">
            <i class="fas fa-spinner fa-spin mr-1"></i>Memuat detail...
          </div>
        </div>
      </div>
    </div>
  `;
}

// Get text color class based on kondisi
function getKondisiTextColor(kondisi) {
  if (!kondisi) return 'text-gray-600';
  const k = kondisi.toLowerCase();
  // Severe conditions
  if (k.includes('berat') || k.includes('parah') || k.includes('seluruh')) return 'text-red-600';
  // Partial/moderate impact (terdampak but not "tidak terdampak")
  if ((k.includes('terdampak') || k.includes('banjir')) && !k.includes('tidak')) return 'text-orange-600';
  if (k.includes('sedang') || k.includes('sebagian')) return 'text-orange-600';
  // Light conditions
  if (k.includes('ringan')) return 'text-lime-600';
  // No impact / safe
  if (k.includes('tidak') || k.includes('aman')) return 'text-green-600';
  return 'text-gray-600';
}

// Store breakdown data for pagination
const polygonBreakdownCache = {};

// Load breakdown data for a polygon with pagination
async function loadPolygonBreakdown(kode) {
  const containerId = `polygon-breakdown-${kode?.replace(/\./g, '-')}`;
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const result = await api.getWilayahBreakdown(kode);

    // Backend returns { wilayah, children, summary }
    if (!result || !result.children || result.children.length === 0) {
      container.innerHTML = '<div class="text-gray-400">Tidak ada data detail</div>';
      return;
    }

    // Cache the data for pagination
    const cacheKey = kode?.replace(/\./g, '-');
    polygonBreakdownCache[cacheKey] = {
      children: result.children,
      summary: result.summary,
      wilayah: result.wilayah,
      currentPage: 0,
      itemsPerPage: 4
    };

    renderPolygonBreakdown(cacheKey);
  } catch (error) {
    console.error('Error loading breakdown:', error);
    container.innerHTML = '<div class="text-red-500">Gagal memuat detail</div>';
  }
}

// Render breakdown with pagination
function renderPolygonBreakdown(cacheKey) {
  const containerId = `polygon-breakdown-${cacheKey}`;
  const container = document.getElementById(containerId);
  const data = polygonBreakdownCache[cacheKey];

  if (!container || !data) return;

  const { children, summary, wilayah, currentPage, itemsPerPage } = data;
  const totalPages = Math.ceil(children.length / itemsPerPage);
  const startIdx = currentPage * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, children.length);
  const pageItems = children.slice(startIdx, endIdx);

  // Determine child level label
  const parentLevel = wilayah?.level || 2;
  const childLevelLabel = parentLevel === 2 ? 'Kecamatan' : (parentLevel === 3 ? 'Desa' : 'Detail');

  container.innerHTML = `
    <div class="font-semibold text-gray-700 mb-2 flex justify-between items-center">
      <span><i class="fas fa-list mr-1"></i>${childLevelLabel}</span>
      <span class="text-[10px] font-normal text-gray-500">${children.length} total</span>
    </div>
    <div class="space-y-1">
      ${pageItems.map(c => `
        <div class="polygon-breakdown-item">
          <span class="polygon-breakdown-name" title="${c.nama}">${c.nama}</span>
          <div class="polygon-breakdown-stats">
            ${c.affected_population ? `<span class="text-red-600">${formatNumber(c.affected_population)}</span>` : ''}
            ${c.posko_count ? `<span class="text-indigo-600">${c.posko_count} posko</span>` : ''}
            ${!c.affected_population && !c.posko_count && c.total_desa ? `<span class="text-gray-500">${c.total_desa} desa</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    ${totalPages > 1 ? `
      <div class="polygon-pagination">
        <button class="polygon-pagination-btn" onclick="event.stopPropagation(); event.preventDefault(); polygonBreakdownPrev('${cacheKey}')" ${currentPage === 0 ? 'disabled' : ''}>
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="polygon-pagination-info">${currentPage + 1} / ${totalPages}</span>
        <button class="polygon-pagination-btn" onclick="event.stopPropagation(); event.preventDefault(); polygonBreakdownNext('${cacheKey}')" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    ` : ''}
    ${summary ? `
      <div class="mt-2 pt-2 border-t flex justify-between text-[10px]">
        <span><span class="text-gray-500">Terdampak:</span> <span class="font-medium text-red-600">${summary.total_terdampak || 0}</span></span>
        <span><span class="text-gray-500">Posko:</span> <span class="font-medium text-indigo-600">${summary.total_posko || 0}</span></span>
      </div>
    ` : ''}
  `;
}

// Pagination: Previous page
function polygonBreakdownPrev(cacheKey) {
  const data = polygonBreakdownCache[cacheKey];
  if (data && data.currentPage > 0) {
    data.currentPage--;
    renderPolygonBreakdown(cacheKey);
  }
}

// Pagination: Next page
function polygonBreakdownNext(cacheKey) {
  const data = polygonBreakdownCache[cacheKey];
  if (data) {
    const totalPages = Math.ceil(data.children.length / data.itemsPerPage);
    if (data.currentPage < totalPages - 1) {
      data.currentPage++;
      renderPolygonBreakdown(cacheKey);
    }
  }
}

// Toggle polygon layer on/off
function togglePolygonLayer() {
  const checkbox = document.getElementById('layer-polygon');
  if (!checkbox || !state.maps.operasi) return;

  const controls = document.getElementById('polygon-controls');
  const legend = document.getElementById('polygon-legend-content');

  if (checkbox.checked) {
    if (!polygonState.layer) {
      // Load polygon data if not already loaded
      initPolygonLayer(state.maps.operasi);
    }
    if (polygonState.layer) {
      state.maps.operasi.addLayer(polygonState.layer);
    }
    // Show polygon controls and legend
    if (controls) controls.style.display = 'flex';
    if (legend) legend.style.display = 'block';
  } else {
    if (polygonState.layer && state.maps.operasi.hasLayer(polygonState.layer)) {
      state.maps.operasi.removeLayer(polygonState.layer);
    }
    // Hide polygon controls and legend
    if (controls) controls.style.display = 'none';
    if (legend) legend.style.display = 'none';
  }
}

// Change polygon level
async function changePolygonLevel(level) {
  polygonState.level = parseInt(level);
  await initPolygonLayer(state.maps.operasi);

  // Re-add to map if checked
  const checkbox = document.getElementById('layer-polygon');
  if (checkbox?.checked && polygonState.layer) {
    state.maps.operasi.addLayer(polygonState.layer);
  }
}

// Search wilayah polygon
async function searchPolygon() {
  const input = document.getElementById('polygon-search-input');
  const resultsContainer = document.getElementById('polygon-search-results');

  if (!input || !resultsContainer) return;

  const query = input.value.trim();
  if (query.length < 2) {
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'none';
    return;
  }

  try {
    resultsContainer.innerHTML = '<div class="p-2 text-gray-500"><i class="fas fa-spinner fa-spin mr-1"></i>Mencari...</div>';
    resultsContainer.style.display = 'block';

    const result = await api.searchPolygon(query, 10);

    if (!result || !result.data || result.data.length === 0) {
      resultsContainer.innerHTML = '<div class="p-2 text-gray-500">Tidak ditemukan</div>';
      return;
    }

    polygonState.searchResults = result.data;

    resultsContainer.innerHTML = result.data.map((item, index) => `
      <div class="polygon-search-item p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
           onclick="selectPolygonSearchResult(${index})">
        <div class="font-medium text-sm">${item.nama}</div>
        <div class="text-xs text-gray-500">Kode: ${item.kode} | Level: ${item.level}</div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error searching polygon:', error);
    resultsContainer.innerHTML = '<div class="p-2 text-red-500">Error pencarian</div>';
  }
}

// Select a search result and zoom to it
async function selectPolygonSearchResult(index) {
  const item = polygonState.searchResults[index];
  if (!item) return;

  // Hide search results
  const resultsContainer = document.getElementById('polygon-search-results');
  if (resultsContainer) resultsContainer.style.display = 'none';

  // Clear search input
  const input = document.getElementById('polygon-search-input');
  if (input) input.value = item.nama;

  // Search result doesn't include geometry, need to fetch the full polygon detail
  try {
    const detailResult = await api.getPolygonDetail(item.kode);
    if (!detailResult || !detailResult.data || !detailResult.data.geometry) {
      console.warn('Could not fetch polygon geometry for:', item.kode);
      showToast('Tidak dapat memuat polygon', 'warning');
      return;
    }

    const polygonData = detailResult.data;

    // Create temporary highlight layer
    const highlightLayer = L.geoJSON(polygonData.geometry, {
      style: {
        color: '#1d4ed8',
        weight: 4,
        fillColor: '#3b82f6',
        fillOpacity: 0.4
      }
    }).addTo(state.maps.operasi);

    // Zoom to bounds
    const bounds = highlightLayer.getBounds();
    state.maps.operasi.fitBounds(bounds, { padding: [50, 50] });

    // Show popup with info from the detail response
    const center = bounds.getCenter();
    L.popup({ maxWidth: 600, minWidth: 400, className: 'polygon-popup' })
      .setLatLng(center)
      .setContent(createPolygonPopup(polygonData.properties))
      .openOn(state.maps.operasi);

    // Load breakdown data for the popup
    setTimeout(() => loadPolygonBreakdown(kode), 100);

    // Remove highlight after 5 seconds
    setTimeout(() => {
      if (state.maps.operasi.hasLayer(highlightLayer)) {
        state.maps.operasi.removeLayer(highlightLayer);
      }
    }, 5000);

  } catch (error) {
    console.error('Error highlighting polygon:', error);
  }
}

// Update polygon stats in UI
function updatePolygonStats(data) {
  const statEl = document.getElementById('stat-polygon');
  if (statEl) {
    statEl.textContent = data?.polygons?.features?.length || 0;
  }
}

// Add polygon legend to map
function addPolygonLegend(map) {
  const legend = L.control({ position: 'bottomleft' });

  legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'polygon-legend');
    div.innerHTML = `
      <div id="polygon-legend-content" style="background: white; padding: 8px 10px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); font-size: 10px; display: none;">
        <div style="font-weight: bold; margin-bottom: 6px;">Status Wilayah</div>
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span style="width: 14px; height: 14px; background: #dc2626; border-radius: 2px;"></span>
          <span>Terdampak Berat</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span style="width: 14px; height: 14px; background: #f59e0b; border-radius: 2px;"></span>
          <span>Terdampak Sedang</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span style="width: 14px; height: 14px; background: #22c55e; border-radius: 2px;"></span>
          <span>Aman / Ringan</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 14px; height: 14px; background: #9ca3af; border-radius: 2px;"></span>
          <span>Tidak ada data</span>
        </div>
      </div>
    `;
    return div;
  };

  legend.addTo(map);
}

// =====================================================
// REFRESH & INITIALIZATION
// =====================================================

// Debounced refresh to prevent multiple rapid calls
let isRefreshing = false;
const debouncedRefresh = debounce(async () => {
  if (isRefreshing) {
    showToast('Refresh sedang berjalan...', 'warning');
    return;
  }
  isRefreshing = true;

  // Clear both memory and localStorage cache before refresh
  apiCache.clear();
  localCache.clearAll();

  // Reset tab loaded states to force reload
  Object.keys(state.tabLoaded).forEach(key => {
    state.tabLoaded[key] = false;
  });

  // Reload current tab data
  await loadTabData(state.currentTab, true);
  switchTab(state.currentTab);

  isRefreshing = false;
}, 500);

async function refreshData() {
  debouncedRefresh();
}

/**
 * Refresh all tabs data (for manual full refresh)
 */
async function refreshAllTabsData() {
  if (isRefreshing) {
    showToast('Refresh sedang berjalan...', 'warning');
    return;
  }
  isRefreshing = true;

  // Clear all caches
  apiCache.clear();
  localCache.clearAll();

  // Load all data
  await loadAllData();
  switchTab(state.currentTab);

  isRefreshing = false;
}

function getKontrolSettings() {
  try {
    const raw = localStorage.getItem('desadigital-kontrol-settings');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[Init] Invalid kontrol settings:', e);
    return null;
  }
}

async function init() {
  // Performance: measure load time
  const startTime = performance.now();
  const kontrolSettings = getKontrolSettings();
  const initialTab = kontrolSettings?.defaultPublicTab || 'dampak';

  // Log cache stats
  console.log('[Init] LocalStorage cache stats:', localCache.stats());

  // OPTIMIZED: Only load data for the initial tab
  // Other tabs will be loaded on demand when user switches to them
  await loadTabData(initialTab);

  // Initialize first tab (respects panel kontrol default)
  await switchTab(initialTab);

  const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`[Init] Dashboard loaded in ${loadTime}s (lazy loading enabled)`);

  // Background preload other tabs after initial render (non-blocking)
  // This improves UX by having data ready when user switches tabs
  setTimeout(() => {
    preloadOtherTabs();
  }, 2000); // Wait 2 seconds after initial load

  const refreshMinutes = kontrolSettings?.autoRefreshMinutes;
  if (refreshMinutes && refreshMinutes > 0) {
    const intervalMs = refreshMinutes * 60 * 1000;
    setInterval(async () => {
      console.log('[Init] Auto-refresh from panel kontrol');
      await refreshAllTabsData();
    }, intervalMs);
    console.log(`[Init] Auto-refresh setiap ${refreshMinutes} menit`);
  }
}

/**
 * Preload other tabs in background (non-blocking)
 * This runs after initial load to prepare data for other tabs
 */
async function preloadOtherTabs() {
  const otherTabs = Object.keys(TAB_DATA_SOURCES).filter(
    tabId => tabId !== state.currentTab && !state.tabLoaded[tabId]
  );

  if (otherTabs.length === 0) {
    console.log('[Preload] All tabs already loaded');
    return;
  }

  console.log(`[Preload] Starting background preload for tabs: ${otherTabs.join(', ')}`);

  // Load tabs sequentially in background to avoid overwhelming the server
  for (const tabId of otherTabs) {
    // Skip if user has already switched to this tab
    if (state.tabLoaded[tabId]) continue;

    try {
      await loadTabData(tabId);
      console.log(`[Preload] Tab "${tabId}" preloaded successfully`);
    } catch (err) {
      console.warn(`[Preload] Failed to preload tab "${tabId}":`, err);
    }

    // Small delay between preloads to avoid server overload
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('[Preload] Background preload complete');
}

// Expose handlers for inline HTML attributes (onclick/onchange)
Object.assign(window, {
  switchTab,
  refreshData,
  focusMapOnCategory,
  changePopupPage,
  changeSektorPage,
  applyFilter,
  resetFilters,
  toggleLayer,
  toggleFaskesLayer,
  togglePolygonLayer,
  applyCluster6Filter,
  changePolygonLevel,
  searchPolygon,
  onBantuanFilterChange,
  renderBantuanTable,
  slideOrangHilang,
  changeDampakPolygonLevel,
});
window.__dashboardMainReady = true;

// Start the application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // If loaded dynamically after DOMContentLoaded, init immediately
  setTimeout(init, 0);
}

