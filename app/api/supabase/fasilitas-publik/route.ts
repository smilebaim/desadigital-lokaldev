import { NextResponse } from "next/server";
import { KABUPATEN, rand } from "@/lib/dummy";
export async function GET() {
  const types = ["Jembatan", "Jalan", "Gedung Sekolah", "Kantor Desa", "Mesjid", "Pasar"];
  const data = KABUPATEN.flatMap((kab) =>
    Array.from({ length: rand(2, 5) }, (_, j) => {
      const type = types[j % types.length];
      return {
        id: `FP-${kab.id}-${j}`,
        name: `${type} ${kab.nama} ${j + 1}`,
        nama: `${type} ${kab.nama} ${j + 1}`,
        type: type,
        tipe: type,
        regency: kab.nama,
        kabupaten: kab.nama,
        kabupaten_kota: kab.nama,
        district: `Kec. ${j + 1}`,
        kecamatan: `Kec. ${j + 1}`,
        latitude: kab.lat + (Math.random() - 0.5) * 0.3,
        longitude: kab.lng + (Math.random() - 0.5) * 0.3,
        condition: ["rusak_berat", "rusak_sedang", "rusak_ringan"][j % 3],
        kondisi: ["rusak_berat", "rusak_sedang", "rusak_ringan"][j % 3],
        nilai_kerusakan: rand(10000000, 2000000000),
      };
    })
  );
  return NextResponse.json({ data, total: data.length });
}
