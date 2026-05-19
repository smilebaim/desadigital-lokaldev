import { NextResponse } from "next/server";
import { KABUPATEN, rand } from "@/lib/dummy";
export async function GET() {
  const data = KABUPATEN.flatMap((kab)=>
    Array.from({length:rand(2,6)},(_,j)=>({
      id: `PTN-${kab.id}-${j}`,
      nama: ["Sawah","Kebun","Tambak","Ladang"][j%4],
      kabkota: kab.nama,
      kecamatan: `Kec. ${j+1}`,
      desa: `Desa ${j+1}`,
      jenis: ["Padi","Jagung","Kedelai","Cabai"][j%4],
      volume: rand(1,100),
      satuan: "Ha",
      taksir_kerugian: rand(5000000,500000000),
      kerusakan_berat: rand(0,30),
      kerusakan_sedang: rand(0,50),
      kerusakan_ringan: rand(0,80),
      lat: kab.lat+(Math.random()-0.5)*0.3,
      lng: kab.lng+(Math.random()-0.5)*0.3,
    }))
  );
  const summary = { total: data.length, total_volume: data.reduce((a,b)=>a+b.volume,0) };
  return NextResponse.json({ data, summary, total: data.length });
}
