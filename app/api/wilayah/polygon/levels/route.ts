import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ data:[{level:2,nama:"Kabupaten/Kota",count:23},{level:3,nama:"Kecamatan",count:289},{level:4,nama:"Desa/Kelurahan",count:6497}]});
}
