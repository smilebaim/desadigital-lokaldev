import { NextResponse } from "next/server";
import { KABUPATEN, rand } from "@/lib/dummy";
export async function GET() {
  const data = KABUPATEN.slice(0, 12).flatMap((kab, i) =>
    Array.from({ length: rand(1, 3) }, (_, j) => {
      const tents = rand(1, 10);
      return {
        id: `TND-${kab.id}-${j}`,
        name: `Tenda Pengungsian ${kab.nama} ${j + 1}`,
        nama: `Tenda Pengungsian ${kab.nama} ${j + 1}`,
        type: "Tenda Pengungsian",
        tipe: "Tenda Pengungsian",
        regency: kab.nama,
        kabupaten: kab.nama,
        kabupaten_kota: kab.nama,
        district: `Kec. ${j + 1}`,
        kecamatan: `Kec. ${j + 1}`,
        address: `Jl. Pengungsian No.${rand(1, 50)}, ${kab.nama}`,
        alamat: `Jl. Pengungsian No.${rand(1, 50)}, ${kab.nama}`,
        latitude: kab.lat + (Math.random() - 0.5) * 0.2,
        longitude: kab.lng + (Math.random() - 0.5) * 0.2,
        tentCount: tents,
        jumlah_tenda: tents,
        capacity: tents * rand(10, 20),
        kapasitas: tents * rand(10, 20),
        organizationName: ["BNPB", "PMI", "TNI", "Swadaya"][j % 4],
        organisasi: ["BNPB", "PMI", "TNI", "Swadaya"][j % 4],
        description: `Tenda bantuan dari ${["BNPB", "PMI", "TNI", "Swadaya"][j % 4]}`,
        keterangan: `Tenda bantuan dari ${["BNPB", "PMI", "TNI", "Swadaya"][j % 4]}`,
        terisi: rand(20, 150),
        kondisi: ["baik", "rusak_ringan"][j % 2],
        sumber: ["BNPB", "PMI", "TNI", "Swadaya"][j % 4],
      };
    })
  );
  return NextResponse.json({ data, total: data.length });
}
