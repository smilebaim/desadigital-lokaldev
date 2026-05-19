import { NextResponse } from "next/server";
const WILAYAH = ["Simeulue","Aceh Singkil","Aceh Selatan","Aceh Tenggara","Aceh Timur","Aceh Tengah","Aceh Barat","Aceh Besar","Pidie","Bireuen","Aceh Utara","Aceh Barat Daya","Gayo Lues","Aceh Tamiang","Nagan Raya","Aceh Jaya","Bener Meriah","Pidie Jaya","Kota Banda Aceh","Kota Sabang","Kota Langsa","Kota Lhokseumawe","Kota Subulussalam"];
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q")||"").toLowerCase();
  const results = WILAYAH.filter(w=>w.toLowerCase().includes(q)).slice(0,10).map((nama,i)=>({
    kode: `110${i+1}`, nama, level: 2, parent: "11"
  }));
  return NextResponse.json({ data: results, total: results.length });
}
