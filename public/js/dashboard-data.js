/**
 * API Service Module for AcehCMS
 * Handles all API calls with caching, retry logic, and error handling
 */

class APIService {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
    this.cache = new Map();
    this.cacheTTL = 60 * 1000; // 60 seconds default
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  /**
   * Fetch data with caching and retry logic
   */
  async fetch(endpoint, options = {}) {
    const {
      cache = true,
      cacheTTL = this.cacheTTL,
      retry = true,
      retryAttempts = this.retryAttempts,
    } = options;

    const cacheKey = `${endpoint}`;

    // Check cache first
    if (cache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      const now = Date.now();

      if (now - cached.timestamp < cacheTTL) {
        console.log(`[API] Cache hit: ${endpoint}`);
        return cached.data;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    // Fetch with retry logic
    let attempt = 0;
    let lastError;

    while (attempt < (retry ? retryAttempts : 1)) {
      try {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Cache the result
        if (cache) {
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
          });
        }

        return data;
      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt < retryAttempts) {
          console.warn(
            `[API] Retry ${attempt}/${retryAttempts} for ${endpoint}`
          );
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    throw new Error(`Failed to fetch ${endpoint}: ${lastError.message}`);
  }

  /**
   * Delay helper for retry logic
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Clear specific cache entry
   */
  clearCacheEntry(endpoint) {
    this.cache.delete(endpoint);
  }

  // === API Endpoints ===

  /**
   * Get disaster/bencana data
   */
  async getBencana() {
    return this.fetch('/realtime/bencana');
  }

  /**
   * Get complaints/pengaduan data
   */
  async getPengaduan() {
    return this.fetch('/realtime/pengaduan');
  }

  /**
   * Get network/jaringan status
   */
  async getJaringan() {
    return this.fetch('/realtime/jaringan');
  }

  /**
   * Get network history
   */
  async getJaringanHistory() {
    return this.fetch('/realtime/jaringan-history');
  }

  /**
   * Get puskesmas (health centers) data
   */
  async getPuskesmas() {
    return this.fetch('/realtime/puskesmas');
  }

  /**
   * Get RSUD (hospitals) data
   */
  async getRSUD() {
    return this.fetch('/realtime/rsud');
  }

  /**
   * Get fasyankes v2 (combined healthcare facilities)
   */
  async getFasyankesV2() {
    return this.fetch('/realtime/v2');
  }

  /**
   * Get bantuan logistik (logistics aid) data
   */
  async getBantuanLogistik() {
    return this.fetch('/realtime/bantuan-logistik');
  }

  /**
   * Get full dashboard data
   */
  async getDashboard() {
    return this.fetch('/api/dashboard');
  }

  /**
   * Get telco data (multiple tables)
   */
  async getTelcoData() {
    return this.fetch('/api/telco/convert-multiple');
  }

  /**
   * Health check
   */
  async healthCheck() {
    return this.fetch('/health', { cache: false });
  }

  /**
   * Get banjir detail data (per kabupaten/kecamatan/desa)
   * @param {Object} options - Filter options
   * @param {string} options.kabupaten - Filter by kabupaten name
   * @param {string} options.kecamatan - Filter by kecamatan name
   * @param {string} options.level - Filter by level (kabupaten, kecamatan, desa)
   * @param {string} options.source - Data source ('db' or 'sheet')
   */
  async getBanjirDetail(options = {}) {
    const params = new URLSearchParams();
    if (options.kabupaten) params.set('kabupaten', options.kabupaten);
    if (options.kecamatan) params.set('kecamatan', options.kecamatan);
    if (options.level) params.set('level', options.level);
    if (options.source) params.set('source', options.source);

    const query = params.toString();
    return this.fetch(`/api/banjir-detail${query ? '?' + query : ''}`);
  }

  /**
   * Get banjir detail summary only
   */
  async getBanjirDetailSummary(source = 'sheet') {
    return this.fetch(`/api/banjir-detail/summary?source=${source}`);
  }

  /**
   * Get banjir detail for specific kabupaten
   */
  async getBanjirDetailByKabupaten(kabupaten, source = 'sheet') {
    return this.fetch(
      `/api/banjir-detail/kabupaten/${encodeURIComponent(kabupaten)}?source=${source}`
    );
  }

  /**
   * Get lokasi tenda data
   */
  async getLokasiTenda() {
    return this.fetch('/api/supabase/lokasi-tenda');
  }

  /**
   * Get fasilitas publik data
   */
  async getFasilitasPublik() {
    return this.fetch('/api/supabase/fasilitas-publik');
  }

  /**
   * Get village distribution data
   */
  async getVillageDistribution() {
    return this.fetch('/api/supabase/village-distribution');
  }

  // ============================================
  // WILAYAH POLYGON ENDPOINTS
  // ============================================

  /**
   * Get polygon GeoJSON with all merged data (penduduk, kondisi, posko)
   * @param {Object} options - Filter options
   * @param {number} options.level - Level: 1=prov, 2=kabkota, 3=kec, 4=desa
   * @param {string} options.parent - Parent kode to filter (e.g., "11" for Aceh)
   */
  async getPolygonGeoJSON(options = {}) {
    const params = new URLSearchParams();
    if (options.level) params.set('level', options.level);
    if (options.parent) params.set('parent', options.parent);
    const query = params.toString();
    return this.fetch(
      `/api/wilayah/polygon/geojson${query ? '?' + query : ''}`,
      { cacheTTL: 5 * 60 * 1000 }
    );
    // return this.fetch(
    //   `/api/wilayah/geojson/${options.level}/${options.parent || ''}`
    // );
  }

  /**
   * Search polygon by nama wilayah
   * @param {string} q - Search query (min 2 chars)
   * @param {number} limit - Max results (default 20)
   */
  async searchPolygon(q, limit = 20) {
    const params = new URLSearchParams({ q, limit });
    return this.fetch(`/api/wilayah/polygon/search?${params}`, {
      cache: false,
    });
  }

  /**
   * Get single polygon with full data by kode
   * @param {string} kode - Wilayah kode kemendagri
   */
  async getPolygonDetail(kode) {
    return this.fetch(`/api/wilayah/polygon/detail/${kode}`);
  }

  /**
   * Get wilayah breakdown (kecamatan/desa list with full data)
   * @param {string} kode - Wilayah kode kemendagri
   */
  async getWilayahBreakdown(kode) {
    return this.fetch(`/api/wilayah/polygon/breakdown/${kode}`);
  }

  /**
   * Get polygon levels summary (count per level)
   */
  async getPolygonLevelsSummary() {
    return this.fetch('/api/wilayah/polygon/levels');
  }
}

// Create singleton instance
const api = new APIService();

// Expose to window for ES modules access
window.api = api;

// Auto-refresh manager
class AutoRefresh {
  constructor() {
    this.intervals = new Map();
  }

  /**
   * Start auto-refresh for a callback
   */
  start(id, callback, intervalMs = 60000) {
    this.stop(id); // Clear existing interval

    // Run immediately
    callback();

    // Set interval
    const intervalId = setInterval(callback, intervalMs);
    this.intervals.set(id, intervalId);

    console.log(`[AutoRefresh] Started: ${id} (${intervalMs}ms)`);
  }

  /**
   * Stop auto-refresh
   */
  stop(id) {
    if (this.intervals.has(id)) {
      clearInterval(this.intervals.get(id));
      this.intervals.delete(id);
      console.log(`[AutoRefresh] Stopped: ${id}`);
    }
  }

  /**
   * Stop all auto-refreshes
   */
  stopAll() {
    this.intervals.forEach((intervalId, id) => {
      clearInterval(intervalId);
      console.log(`[AutoRefresh] Stopped: ${id}`);
    });
    this.intervals.clear();
  }
}

// Create singleton instance
const autoRefresh = new AutoRefresh();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  autoRefresh.stopAll();
});
