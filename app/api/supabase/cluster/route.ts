import { NextResponse } from "next/server";
import { KABUPATEN, SEKTOR, rand, pick } from "@/lib/dummy";
export async function GET() {
  const cluster6 = KABUPATEN.flatMap((kab, i) =>
    Array.from({ length: rand(3, 8) }, (_, j) => {
      const rr = rand(10000000, 500000000);
      const rs = rand(50000000, 1000000000);
      const rb = rand(100000000, 3000000000);
      const ker = rr + rs + rb;
      const keru = rand(10000000, 2000000000);
      const sektor = pick(SEKTOR);
      return {
        id: `C6-${kab.id}-${j}`,
        kode_reg: `REG-${kab.id}-${j}`,
        sektor: sektor,
        sub_sektor: `Sub ${sektor}`,
        sub_klaster: `Klaster ${sektor}`,
        kewenangan: ["Provinsi", "Kabupaten", "Pusat"][j % 3],
        kabupaten_kota: kab.nama,
        kecamatan: `Kec. ${j + 1}`,
        desa: `Desa ${j + 1}`,
        alamat_lengkap: `Jl. Sektor ${sektor} No.${rand(1, 100)}, ${kab.nama}`,
        status_layanan: ["Aktif", "Terbatas", "Non-Aktif"][j % 3],
        status_fisik: ["Baik", "Rusak", "Dalam Perbaikan"][j % 3],
        status_kerusakan: ["kuning", "biru", "biru_keabuan", "putih"][j % 4],
        kondisi: ["Ringan", "Sedang", "Berat"][j % 3],
        lat: kab.lat + (Math.random() - 0.5) * 0.3,
        lng: kab.lng + (Math.random() - 0.5) * 0.3,
        nilai_kerusakan_ringan: rr,
        nilai_kerusakan_sedang: rs,
        nilai_kerusakan_berat: rb,
        nilai_kerusakan: ker,
        nilai_kerugian: keru,
        total_kerusakan_kerugian: ker + keru,
        estimasi_biaya_rehab: ker * 0.8,
        keterangan: `Kerusakan pada sektor ${sektor} di ${kab.nama}`,
        link_maps: `https://www.google.com/maps?q=${kab.lat},${kab.lng}`,
        status: ["kuning", "biru", "biru_keabuan", "putih"][j % 4],
        satuan: "Unit",
        volume: rand(1, 50),
      };
    })
  );
  const cluster1 = KABUPATEN.map(kab => ({
    id: `C1-${kab.id}`,
    kabupaten_kota: kab.nama,
    lat: kab.lat,
    lng: kab.lng,
    korban_meninggal: rand(0, 8),
    korban_luka: rand(0, 30),
    pengungsi: rand(0, 1000),
    rumah_rb: rand(0, 60),
    rumah_rs: rand(0, 100),
    rumah_rr: rand(0, 150),
  }));
  return NextResponse.json({ cluster6, cluster1, cluster6Icons: cluster6, total: cluster6.length });
}
