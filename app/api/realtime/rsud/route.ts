import { NextResponse } from "next/server";
import { KABUPATEN, rand } from "@/lib/dummy";
export async function GET() {
  const data = KABUPATEN.slice(0,15).map((kab,i)=>({
    id: `RSUD-${kab.id}`,
    nama: `RSUD ${kab.nama}`,
    kabupaten_kota: kab.nama,
    tipe: i<5?"Tipe B":"Tipe C",
    lat: kab.lat+(Math.random()-0.5)*0.15,
    lng: kab.lng+(Math.random()-0.5)*0.15,
    status: "aktif",
    kapasitas_bed: rand(50,200),
    bed_terpakai: rand(20,180),
    tenaga_dokter: rand(5,30),
    kondisi: "normal",
  }));
  return NextResponse.json({ data, total: data.length });
}
