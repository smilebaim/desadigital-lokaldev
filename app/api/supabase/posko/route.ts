import { NextResponse } from "next/server";
import { KABUPATEN, rand } from "@/lib/dummy";
export async function GET() {
  const data = KABUPATEN.flatMap((kab, i) =>
    Array.from({ length: rand(1, 3) }, (_, j) => {
      const male = rand(20, 200);
      const female = rand(20, 200);
      const child = rand(10, 100);
      return {
        id: `PSK-${kab.id}-${j}`,
        name: `Posko ${kab.nama} ${j + 1}`,
        nama: `Posko ${kab.nama} ${j + 1}`,
        type: "Posko Pengungsian",
        organizationName: ["BPBD", "Dinas Sosial", "PMI"][j % 3],
        regency: kab.nama,
        kabupaten_kota: kab.nama,
        district: `Kec. ${j + 1}`,
        kecamatan: `Kec. ${j + 1}`,
        address: `Jl. Banda Aceh No.${rand(1, 99)}, ${kab.nama}`,
        alamat: `Jl. Banda Aceh No.${rand(1, 99)}, ${kab.nama}`,
        latitude: kab.lat + (Math.random() - 0.5) * 0.25,
        longitude: kab.lng + (Math.random() - 0.5) * 0.25,
        maleRefugee: male,
        femaleRefugee: female,
        childRefugee: child,
        total_pengungsi: male + female + child,
        jumlah_pengungsi: male + female + child,
        jumlah_kk: rand(15, 180),
        capacity: rand(100, 800),
        kapasitas: rand(100, 800),
        status: "aktif",
        titik_pengungsian: rand(1, 5),
        accessWater: Math.random() > 0.2,
        accessSanitation: Math.random() > 0.3,
        accessElectricity: Math.random() > 0.1,
      };
    })
  );
  const summary = {
    total: data.length,
    total_posko: data.length,
    total_pengungsi: data.reduce((a, b) => a + b.total_pengungsi, 0),
    titik_pengungsian: data.reduce((a, b) => a + b.titik_pengungsian, 0),
  };
  return NextResponse.json({ data, summary, total: data.length });
}
