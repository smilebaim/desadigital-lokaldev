import { NextResponse } from "next/server";

const KABUPATEN_POLYGONS = [
  { id:"1101",nama:"Simeulue",lat:2.69,lng:96.05 },
  { id:"1102",nama:"Aceh Singkil",lat:2.38,lng:97.79 },
  { id:"1103",nama:"Aceh Selatan",lat:3.17,lng:97.43 },
  { id:"1104",nama:"Aceh Tenggara",lat:3.55,lng:97.83 },
  { id:"1105",nama:"Aceh Timur",lat:4.62,lng:97.81 },
  { id:"1106",nama:"Aceh Tengah",lat:4.63,lng:96.85 },
  { id:"1107",nama:"Aceh Barat",lat:4.09,lng:96.22 },
  { id:"1108",nama:"Aceh Besar",lat:5.44,lng:95.63 },
  { id:"1109",nama:"Pidie",lat:5.23,lng:96.13 },
  { id:"1110",nama:"Bireuen",lat:5.21,lng:96.69 },
  { id:"1111",nama:"Aceh Utara",lat:5.01,lng:97.12 },
  { id:"1112",nama:"Aceh Barat Daya",lat:3.79,lng:96.83 },
  { id:"1113",nama:"Gayo Lues",lat:3.92,lng:97.22 },
  { id:"1114",nama:"Aceh Tamiang",lat:4.29,lng:98.10 },
  { id:"1115",nama:"Nagan Raya",lat:4.00,lng:96.42 },
  { id:"1116",nama:"Aceh Jaya",lat:4.71,lng:95.62 },
  { id:"1117",nama:"Bener Meriah",lat:4.72,lng:96.83 },
  { id:"1118",nama:"Pidie Jaya",lat:5.28,lng:96.30 },
  { id:"1171",nama:"Kota Banda Aceh",lat:5.55,lng:95.32 },
  { id:"1172",nama:"Kota Sabang",lat:5.89,lng:95.33 },
  { id:"1173",nama:"Kota Langsa",lat:4.47,lng:97.97 },
  { id:"1174",nama:"Kota Lhokseumawe",lat:5.18,lng:97.15 },
  { id:"1175",nama:"Kota Subulussalam",lat:2.65,lng:98.00 },
];

function makeBox(lat: number, lng: number, size = 0.35) {
  return [[
    [lng-size, lat-size],[lng+size, lat-size],
    [lng+size, lat+size],[lng-size, lat+size],[lng-size, lat-size]
  ]];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = parseInt(searchParams.get("level") || "2");

  const features = KABUPATEN_POLYGONS.map(kab => ({
    type: "Feature",
    properties: {
      kode: kab.id,
      nama: kab.nama,
      level,
      korban_meninggal: Math.floor(Math.random()*8),
      korban_luka: Math.floor(Math.random()*30),
      pengungsi: Math.floor(Math.random()*1000),
      rumah_rb: Math.floor(Math.random()*60),
      rumah_rs: Math.floor(Math.random()*100),
      rumah_rr: Math.floor(Math.random()*150),
      status: ["critical","warning","normal"][Math.floor(Math.random()*3)],
      total_penduduk: Math.floor(Math.random()*300000)+50000,
    },
    geometry: { type:"Polygon", coordinates: makeBox(kab.lat, kab.lng) }
  }));

  return NextResponse.json({ 
    polygons: { type:"FeatureCollection", features }, 
    total: features.length 
  });
}
