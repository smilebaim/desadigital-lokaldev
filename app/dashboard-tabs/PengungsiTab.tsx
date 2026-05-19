type Props = {
  penduduk: any;
  posko: any;
  tenda: any;
  orangHilang: any;
  bencana: any;
  fmt: (n: number | undefined | null) => string;
};

function KPI({ label, value, icon, color }: { label: string; value: any; icon: string; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
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

export default function PengungsiTab({ penduduk, posko, tenda, orangHilang, bencana, fmt }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Total Penduduk" value={penduduk?.summary?.total_penduduk} icon="fa-users" color="primary" />
        <KPI label="Total KK" value={penduduk?.summary?.total_kk} icon="fa-id-card" color="orange" />
        <KPI label="Disabilitas" value={penduduk?.summary?.total_disabilitas} icon="fa-wheelchair" color="blue" />
        <KPI label="Pengungsi" value={posko?.summary?.total_pengungsi ?? bencana?.total_pengungsi} icon="fa-campground" color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <div className="panel p-4 h-[220px]">
            <h3 className="text-sm font-semibold mb-2"><i className="fas fa-wheelchair text-green-600 mr-2" />Disabilitas</h3>
            <div className="h-[150px]"><canvas id="chartDisabilitas" /></div>
          </div>
          <div className="panel p-4 h-[220px]">
            <h3 className="text-sm font-semibold mb-2"><i className="fas fa-id-card text-green-600 mr-2" />KK per Kabupaten</h3>
            <div className="h-[150px]"><canvas id="chartKK" /></div>
          </div>
          <div className="panel p-4 max-h-[280px] overflow-auto">
            <h3 className="text-sm font-semibold mb-2">
              <i className="fas fa-search text-amber-600 mr-2" />
              Orang Hilang ({orangHilang?.summary?.dicari ?? 0} dicari)
            </h3>
            <div className="space-y-2">
              {(orangHilang?.data || []).slice(0, 8).map((o: any) => (
                <div key={o.id} className="text-xs border-b border-gray-100 pb-2">
                  <div className="flex justify-between font-medium">
                    <span>{o.nama}</span>
                    <span className={o.status === 'dicari' ? 'text-amber-600' : 'text-green-600'}>{o.status}</span>
                  </div>
                  <p className="text-gray-500">{o.kabupaten_kota} · {o.usia} thn</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 panel h-[520px]">
          <div id="mapPengungsi" className="h-full w-full" />
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="panel p-4 max-h-[250px] overflow-auto">
            <h3 className="text-sm font-semibold mb-2"><i className="fas fa-campground text-purple-600 mr-2" />Posko ({posko?.data?.length ?? 0})</h3>
            <div className="space-y-2 text-xs">
              {(posko?.data || []).slice(0, 10).map((p: any) => (
                <div key={p.id} className="flex justify-between border-b border-gray-50 py-1">
                  <span className="truncate mr-2 text-gray-600">{p.nama}</span>
                  <span className="font-semibold text-purple-600">{fmt(p.total_pengungsi)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="panel p-4 max-h-[250px] overflow-auto">
            <h3 className="text-sm font-semibold mb-2"><i className="fas fa-tent text-amber-600 mr-2" />Lokasi Tenda ({tenda?.data?.length ?? 0})</h3>
            <div className="space-y-2 text-xs">
              {(tenda?.data || []).slice(0, 10).map((t: any) => (
                <div key={t.id} className="flex justify-between border-b border-gray-50 py-1">
                  <span className="truncate mr-2 text-gray-600">{t.nama}</span>
                  <span className="font-semibold text-amber-600">{t.jumlah_tenda} tenda</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel overflow-auto">
        <h3 className="text-sm font-semibold p-4 border-b"><i className="fas fa-table text-green-600 mr-2" />Rekap Penduduk per Kabupaten</h3>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase">
            <tr>
              <th className="p-3 text-left">Wilayah</th>
              <th className="p-3 text-right">Penduduk</th>
              <th className="p-3 text-right">KK</th>
              <th className="p-3 text-right">Pengungsi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(penduduk?.penduduk || []).filter((r: any) => r.level === 2).map((row: any) => {
              const kab = (row.wilayah || row.nama || '').toUpperCase();
              const peng = (bencana?.data || [])
                .filter((b: any) => (b.kabupaten || b.kabkota || '').toUpperCase() === kab)
                .reduce((s: number, b: any) => s + (b.pengungsi || 0), 0);
              const kk = (penduduk?.penduduk_kk || []).find((k: any) => k.kode === row.kode);
              return (
                <tr key={row.kode} className="hover:bg-gray-50">
                  <td className="p-3 font-medium">{row.wilayah || row.nama}</td>
                  <td className="p-3 text-right">{fmt(row.jumlah)}</td>
                  <td className="p-3 text-right">{fmt(kk?.jumlah)}</td>
                  <td className="p-3 text-right text-orange-600 font-semibold">{fmt(peng)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
