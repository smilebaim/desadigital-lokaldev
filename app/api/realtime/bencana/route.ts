import { NextResponse } from "next/server";
import { KABUPATEN, rand } from "@/lib/dummy";

export async function GET() {
  const affected = KABUPATEN.filter((_, i) => i < 12);
  const data = affected.flatMap(kab => {
    const count = rand(1, 4);
    return Array.from({ length: count }, (_, j) => ({
      id: `BNC-${kab.id}-${j + 1}`,
      kabupaten_kota: kab.nama,
      kabkota: kab.nama,
      kecamatan: `Kec. ${["Mutiara","Johan Pahlawan","Bebesen","Kuta Makmur","Peusangan"][j % 5]}`,
      desa: `Desa ${["Paya","Blang","Meureudu","Langkak","Pasie"][j % 5]} ${j + 1}`,
      jenis_bencana: "Banjir",
      status: ["critical","warning","normal"][j % 3],
      lat: kab.lat + (Math.random() - 0.5) * 0.3,
      lng: kab.lng + (Math.random() - 0.5) * 0.3,
      korban_meninggal: rand(0, 5),
      korban_luka: rand(0, 20),
      korban_hilang: rand(0, 3),
      pengungsi: rand(50, 800),
      rumah_rusak_berat: rand(0, 50),
      rumah_rusak_sedang: rand(0, 80),
      rumah_rusak_ringan: rand(0, 120),
      sawah_ha: parseFloat((Math.random() * 50).toFixed(1)),
      kebun_ha: parseFloat((Math.random() * 30).toFixed(1)),
      tambak_ha: parseFloat((Math.random() * 20).toFixed(1)),
      fasum_rusak: rand(0, 10),
      tanggal: "2026-04-28",
      updated_at: new Date().toISOString(),
    }));
  });
  let total_jiwa = 0, total_pengungsi = 0, total_titik_pengungsian = 0, total_rumah = 0, total_sawah = 0, total_fasum = 0, total_kebun = 0, total_tambak = 0;
  
  data.forEach(d => {
    total_jiwa += (d.korban_meninggal + d.korban_luka + d.korban_hilang + d.pengungsi);
    total_pengungsi += d.pengungsi;
    total_titik_pengungsian += 1;
    total_rumah += (d.rumah_rusak_berat + d.rumah_rusak_sedang + d.rumah_rusak_ringan);
    total_sawah += d.sawah_ha;
    total_fasum += d.fasum_rusak;
    total_kebun += d.kebun_ha;
    total_tambak += d.tambak_ha;
    d.jiwa_terdampak = d.korban_meninggal + d.korban_luka + d.korban_hilang + d.pengungsi;
    d.rumah = d.rumah_rusak_berat + d.rumah_rusak_sedang + d.rumah_rusak_ringan;
  });

  return NextResponse.json({ 
    data, 
    total: data.length, 
    updated_at: new Date().toISOString(),
    total_jiwa,
    total_pengungsi,
    total_titik_pengungsian,
    total_rumah,
    total_sawah,
    total_fasum,
    total_kebun,
    total_tambak
  });
}
