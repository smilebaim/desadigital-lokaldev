import { NextResponse } from "next/server";
import { KABUPATEN, rand } from "@/lib/dummy";
export async function GET() {
  const data = KABUPATEN.flatMap((kab, i) => {
    const n = Math.floor(Math.random()*3)+1;
    return Array.from({length:n},(_,j)=>({
      id: `PKM-${kab.id}-${j+1}`,
      nama: `Puskesmas ${kab.nama} ${j+1}`,
      kabupaten_kota: kab.nama,
      kecamatan: `Kec. ${["Induk","Pembantu","Rawat Inap"][j%3]}`,
      tipe: j===0?"Puskesmas Induk":"Puskesmas Pembantu",
      lat: kab.lat+(Math.random()-0.5)*0.25,
      lng: kab.lng+(Math.random()-0.5)*0.25,
      status: "aktif",
      kapasitas_bed: rand(10,50),
      tenaga_dokter: rand(1,5),
      kondisi: ["normal","terdampak"][j%2===0?0:1],
    }));
  });
  return NextResponse.json({ data, total: data.length });
}
