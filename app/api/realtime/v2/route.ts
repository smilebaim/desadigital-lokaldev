import { NextResponse } from "next/server";
import { KABUPATEN, rand } from "@/lib/dummy";
export async function GET() {
  const types = ["Klinik","Apotek","Posyandu","Polindes"];
  const data = KABUPATEN.flatMap((kab)=>
    types.map((t,j)=>({
      id: `FSY-${kab.id}-${j}`,
      nama: `${t} ${kab.nama}`,
      tipe: t,
      kabupaten_kota: kab.nama,
      lat: kab.lat+(Math.random()-0.5)*0.3,
      lng: kab.lng+(Math.random()-0.5)*0.3,
      status: j%5===0?"terdampak":"aktif",
    }))
  );
  return NextResponse.json({ data, total: data.length });
}
