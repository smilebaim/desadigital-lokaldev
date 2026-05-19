import { NextResponse } from "next/server";
import { KABUPATEN, rand } from "@/lib/dummy";

export async function GET() {
  const penduduk = KABUPATEN.map(kab => ({
    kode: kab.id,
    wilayah: kab.nama,
    nama: kab.nama,
    level: 2,
    jumlah: rand(50000, 400000),
    lat: kab.lat,
    lng: kab.lng,
  }));

  const penduduk_kk = KABUPATEN.map(kab => ({
    kode: kab.id,
    wilayah: kab.nama,
    nama: kab.nama,
    level: 2,
    jumlah: rand(12000, 100000),
  }));

  const penduduk_disabilitas = KABUPATEN.map(kab => ({
    kode: kab.id,
    wilayah: kab.nama,
    DISABILITAS_FISIK_JML: rand(50, 500),
    DISABILITAS_NETRA_BUTA_JML: rand(10, 100),
    DISABILITAS_RUNGU_WICARA_JML: rand(20, 150),
    DISABILITAS_MENTAL_JIWA_JML: rand(10, 80),
    DISABILITAS_FISIK_DAN_MENTAL_JML: rand(5, 50),
    DISABILITAS_LAINNYA_JML: rand(10, 100),
  }));

  const penduduk_umur = KABUPATEN.map(kab => ({
    kode: kab.id,
    wilayah: kab.nama,
    usia_0_4: rand(1000, 10000),
    usia_5_9: rand(1000, 10000),
    usia_10_14: rand(1000, 10000),
    usia_15_19: rand(1000, 10000),
    usia_20_24: rand(1000, 10000),
    usia_above_25: rand(20000, 200000),
  }));

  const summary = {
    total_penduduk: penduduk.reduce((a, b) => a + b.jumlah, 0),
    total_kk: penduduk_kk.reduce((a, b) => a + b.jumlah, 0),
    total_disabilitas: penduduk_disabilitas.reduce((a, b) => 
      a + b.DISABILITAS_FISIK_JML + b.DISABILITAS_NETRA_BUTA_JML + b.DISABILITAS_RUNGU_WICARA_JML + 
      b.DISABILITAS_MENTAL_JIWA_JML + b.DISABILITAS_FISIK_DAN_MENTAL_JML + b.DISABILITAS_LAINNYA_JML, 0),
  };

  return NextResponse.json({ 
    penduduk, 
    penduduk_kk, 
    penduduk_disabilitas, 
    penduduk_umur, 
    summary 
  });
}
