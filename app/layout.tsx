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
        {/* Google Fonts - Inter */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Tailwind CSS CDN - untuk memastikan kompatibilitas kelas yang sama */}
        <script src="https://cdn.tailwindcss.com/" async></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.tailwindConfigReady = false;
              document.addEventListener('DOMContentLoaded', function() {
                if (typeof tailwind !== 'undefined') {
                  tailwind.config = {
                    theme: {
                      extend: {
                        colors: {
                          primary: {
                            50: '#f0fdf4',
                            100: '#dcfce7',
                            200: '#bbf7d0',
                            300: '#86efac',
                            400: '#4ade80',
                            500: '#22c55e',
                            600: '#16a34a',
                            700: '#15803d',
                            800: '#166534',
                            900: '#14532d',
                          }
                        }
                      }
                    }
                  };
                }
              });
            `,
          }}
        />

        {/* Leaflet CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />

        {/* Leaflet MarkerCluster CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"
        />

        {/* Font Awesome */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body className="bg-white text-gray-800 font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
