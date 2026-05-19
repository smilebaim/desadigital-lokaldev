import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dashboard Monitoring Bencana Aceh",
  description: "Sistem Informasi Aceh Tanggap Bencana - Dashboard Monitoring Bencana Hidrometeorologi Aceh",
  keywords: "bencana, aceh, monitoring, hidrometeorologi, dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        {/* Core Libraries via CDN for simplicity in prototype */}
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" defer />
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" defer />
      </head>
      <body className="bg-white text-gray-800 font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
