import { NextResponse } from "next/server";
import { KABUPATEN, rand, pick, STATUS_JARINGAN } from "@/lib/dummy";
export async function GET() {
  const data = KABUPATEN.map((kab, i) => ({
    id: `JRG-${kab.id}`,
    nama: `Tower ${kab.nama}`,
    kabupaten_kota: kab.nama,
    status: pick(STATUS_JARINGAN),
    lat: kab.lat + (Math.random()-0.5)*0.2,
    lng: kab.lng + (Math.random()-0.5)*0.2,
    operator: ["Telkomsel","XL","Indosat","Smartfren"][i%4],
    tipe: ["BTS","NodeB","eNodeB"][i%3],
    signal_strength: rand(40,95),
    uptime_pct: rand(60,100),
    updated_at: new Date().toISOString(),
  }));
  const critical = data.filter(d=>d.status==="critical").length;
  const warning = data.filter(d=>d.status==="warning").length;
  const normal = data.filter(d=>d.status==="normal").length;
  return NextResponse.json({ data, summary: { critical, warning, normal, total: data.length }, updated_at: new Date().toISOString() });
}
