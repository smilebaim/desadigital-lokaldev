import { NextResponse } from "next/server";
import {
  KABUPATEN,
  JENIS_BANTUAN,
  STATUS_BANTUAN,
  rand,
  pick,
  jitter,
  desaLabel,
  kecLabel,
  UPDATED_AT,
} from "@/lib/dummy";

export async function GET() {
  const data = KABUPATEN.flatMap((kab, kabIdx) =>
    Array.from({ length: rand(4, 9) }, (_, j) => {
      const kategori = STATUS_BANTUAN[(kabIdx + j) % STATUS_BANTUAN.length];
      const coords = jitter(kab.lat, kab.lng);
      const volume = rand(80, 2500);
      return {
        id: `BAN-${kab.id}-${j + 1}`,
        desa: desaLabel(j),
        kecamatan: kecLabel(j),
        kabupaten: kab.nama,
        kabupaten_kota: kab.nama,
        jenis_bantuan: pick(JENIS_BANTUAN),
        satuan: pick(["Paket", "Dus", "Karton", "Liter", "Unit"]),
        volume,
        jumlah: volume,
        kategori,
        status: kategori,
        latitude: coords.lat,
        longitude: coords.lng,
        lat: coords.lat,
        lng: coords.lng,
        penerima_kk: rand(15, 120),
        penerima_jiwa: rand(40, 450),
        tanggal_distribusi: `2026-04-${String(rand(20, 28)).padStart(2, "0")}`,
        sumber: pick(["BNPB", "Kemensos", "PMI", "TNI", "CSR"]),
        keterangan: `Distribusi ${pick(JENIS_BANTUAN)} ke ${kab.nama}`,
      };
    })
  );

  const summary = {
    total_desa: data.length,
    total_kuning: data.filter((d) => d.kategori === "kuning").length,
    total_biru: data.filter((d) => d.kategori === "biru").length,
    total_biru_keabuan: data.filter((d) => d.kategori === "biru_keabuan").length,
    total_putih: data.filter((d) => d.kategori === "putih").length,
    total_volume: data.reduce((a, b) => a + b.volume, 0),
    total_penerima_jiwa: data.reduce((a, b) => a + b.penerima_jiwa, 0),
  };

  return NextResponse.json({
    data,
    ...summary,
    summary,
    total: data.length,
    updated_at: UPDATED_AT(),
  });
}
