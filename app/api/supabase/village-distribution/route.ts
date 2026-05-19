import { NextResponse } from "next/server";
import { KABUPATEN, rand } from "@/lib/dummy";
export async function GET() {
  const data = KABUPATEN.map(kab=>({
    kabupaten_kota: kab.nama,
    total_desa: rand(50,200),
    desa_kuning: rand(10,80),
    desa_biru: rand(5,40),
    desa_abu: rand(2,20),
    desa_putih: rand(10,60),
    lat: kab.lat, lng: kab.lng,
  }));
  return NextResponse.json({ data, total: data.length });
}
