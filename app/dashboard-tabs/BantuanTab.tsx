const BADGE: Record<string, string> = {
  kuning: 'bg-yellow-100 text-yellow-800',
  biru: 'bg-blue-100 text-blue-800',
  biru_keabuan: 'bg-gray-200 text-gray-700',
  putih: 'bg-white text-gray-600 border border-gray-200',
};

type Props = {
  bantuan: any;
  filtered: any[];
  kabOptions: string[];
  filterKab: string;
  filterWarna: string;
  onFilterKab: (v: string) => void;
  onFilterWarna: (v: string) => void;
  fmt: (n: number | undefined | null) => string;
};

function KPI({ label, value, icon, color }: { label: string; value: any; icon: string; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-emerald-100 text-emerald-600',
  };
  return (
    <div className="kpi-card flex items-center justify-between">
      <div>
        <p className="text-[10px] md:text-xs text-gray-500 uppercase font-medium">{label}</p>
        <p className="text-lg md:text-xl font-bold text-gray-800">
          {value !== undefined && value !== null ? value.toLocaleString('id-ID') : '-'}
        </p>
      </div>
      <div className={`${colors[color] || 'bg-gray-100 text-gray-600'} p-2 md:p-3 rounded-full`}>
        <i className={`fas ${icon} text-sm md:text-base`} />
      </div>
    </div>
  );
}

export default function BantuanTab({
  bantuan,
  filtered,
  kabOptions,
  filterKab,
  filterWarna,
  onFilterKab,
  onFilterWarna,
  fmt,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPI label="Titik Distribusi" value={bantuan?.total_desa} icon="fa-map-marker-alt" color="primary" />
        <KPI label="Kuning" value={bantuan?.total_kuning} icon="fa-circle" color="orange" />
        <KPI label="Biru" value={bantuan?.total_biru} icon="fa-circle" color="blue" />
        <KPI label="Abu-abu" value={bantuan?.total_biru_keabuan} icon="fa-circle" color="purple" />
        <KPI label="Putih" value={bantuan?.total_putih} icon="fa-circle" color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <div className="panel p-4 h-[220px]">
            <h3 className="text-sm font-semibold mb-2"><i className="fas fa-chart-pie text-green-600 mr-2" />Status Distribusi</h3>
            <div className="h-[150px]"><canvas id="chartBantuanStatus" /></div>
          </div>
          <div className="panel p-4 h-[220px]">
            <h3 className="text-sm font-semibold mb-2"><i className="fas fa-chart-bar text-green-600 mr-2" />Top Kabupaten</h3>
            <div className="h-[150px]"><canvas id="chartBantuanKab" /></div>
          </div>
        </div>

        <div className="lg:col-span-2 panel h-[520px]">
          <div id="mapBantuan" className="h-full w-full" />
        </div>

        <div className="lg:col-span-1 panel p-4">
          <h3 className="text-sm font-semibold mb-3"><i className="fas fa-filter text-green-600 mr-2" />Filter</h3>
          <div className="space-y-2 text-xs">
            <label className="block text-gray-500">Kabupaten</label>
            <select value={filterKab} onChange={(e) => onFilterKab(e.target.value)} className="w-full border rounded-lg px-2 py-1.5">
              <option value="">Semua Kabupaten</option>
              {kabOptions.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <label className="block text-gray-500 mt-2">Status Warna</label>
            <select value={filterWarna} onChange={(e) => onFilterWarna(e.target.value)} className="w-full border rounded-lg px-2 py-1.5">
              <option value="">Semua Status</option>
              <option value="kuning">Kuning</option>
              <option value="biru">Biru</option>
              <option value="biru_keabuan">Abu-abu</option>
              <option value="putih">Putih</option>
            </select>
            <p className="text-gray-400 mt-3">Menampilkan {filtered.length} titik</p>
            <p className="text-gray-500">Penerima: {fmt(bantuan?.total_penerima_jiwa)} jiwa</p>
          </div>
        </div>
      </div>

      <div className="panel overflow-auto max-h-[320px]">
        <h3 className="text-sm font-semibold p-4 border-b sticky top-0 bg-white">
          <i className="fas fa-truck text-green-600 mr-2" />Distribusi Bantuan
        </h3>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase">
            <tr>
              <th className="p-3 text-left">Desa</th>
              <th className="p-3 text-left">Kabupaten</th>
              <th className="p-3 text-left">Jenis</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Volume</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.slice(0, 50).map((row: any) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="p-3 font-medium">{row.desa}</td>
                <td className="p-3">{row.kabupaten}</td>
                <td className="p-3">{row.jenis_bantuan}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${BADGE[row.kategori] || 'bg-gray-100'}`}>
                    {row.kategori}
                  </span>
                </td>
                <td className="p-3 text-right font-semibold">{fmt(row.volume)} {row.satuan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
