import type { Metadata } from "next";
import { Geist, Geist_Mono, Great_Vibes } from "next/font/google";
import PWALinks from "./pwa-links";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Cave à vin",
  description: "Ma cave à vin",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cave à vin",
  },
  icons: {
    apple: "/icon-192.png",
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport = {
  themeColor: "#d4af37",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${greatVibes.variable} antialiased`}
      >
        <PWALinks />
        <AuthProvider>
          <div className="h-screen flex flex-col relative z-10 overflow-hidden">
          <header className="sticky top-0 z-50 w-full bg-transparent relative flex-shrink-0">
            <div className="mx-auto max-w-5xl px-6 pt-8">
              <h1 
                className="text-center relative z-10"
                style={{ 
                  fontFamily: 'var(--font-great-vibes), cursive',
                  color: '#d4af37',
                  fontSize: '56px',
                  letterSpacing: '0.5px',
                  lineHeight: '1',
                  marginTop: '0',
                  marginBottom: '32px',
                  padding: '0',
                  textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                }}
              >
                La Cave à Tournel
              </h1>
            </div>
          </header>
          <div className="flex-1 mx-auto w-full max-w-5xl px-4 pt-0 pb-12 overflow-y-auto min-h-0">
            <div className="bg-[#fbf7f0] border-2 border-[#d4af37] rounded-2xl shadow-2xl p-6 md:p-8 lg:p-10 relative">
              <div className="absolute inset-2 border border-[#d4af37]/40 rounded-xl pointer-events-none"></div>
              <div className="relative z-10">
                {children}
              </div>
            </div>
          </div>
        </div>
        </AuthProvider>
      </body>
    </html>
  );
}
