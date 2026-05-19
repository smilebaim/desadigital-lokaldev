import { NextResponse } from "next/server";
import { KABUPATEN, rand } from "@/lib/dummy";

export async function GET() {
  const data = Array.from({ length: 20 }, (_, i) => ({
    id: `BAN-${i + 1}`,
    desa: `Desa ${i + 1}`,
    kecamatan: `Kec. ${i + 1}`,
    kabupaten_kota: KABUPATEN[i % KABUPATEN.length].nama,
    satuan: "Paket",
    volume: rand(100, 1000),
    status: ["kuning", "biru", "biru_keabuan", "putih"][i % 4],
    lat: KABUPATEN[i % KABUPATEN.length].lat + (Math.random() - 0.5) * 0.2,
    lng: KABUPATEN[i % KABUPATEN.length].lng + (Math.random() - 0.5) * 0.2,
  }));

  return NextResponse.json({ data, total: data.length, updated_at: new Date().toISOString() });
}
