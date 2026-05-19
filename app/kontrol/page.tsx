import type { Metadata } from "next";
import KontrolWrapper from "./KontrolWrapper";

export const metadata: Metadata = {
  title: "Dashboard Kontrol | Monitoring Bencana Aceh",
  description: "Panel kontrol administrasi dashboard monitoring bencana hidrometeorologi Aceh",
};

export default function KontrolPage() {
  return <KontrolWrapper />;
}
