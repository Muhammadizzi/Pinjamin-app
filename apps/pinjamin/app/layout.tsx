import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth-client";

export const metadata: Metadata = {
  title: "Pinjamin — Smart Asset Lending | Garuda Food",
  description:
    "Sistem peminjaman aset Garuda Food — kelola aset, kit, booking, audit, dan laporan dengan QR. Single dark theme, bilingual ID/EN.",
  manifest: "/site.webmanifest",
  icons: {
    // ?v=3 → cache-buster: Safari menyimpan cache favicon sangat agresif;
    // URL yang belum pernah dilihat memaksa browser fetch ulang ikon baru.
    icon: [
      { url: "/favicon-32x32.png?v=3", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png?v=3", type: "image/png", sizes: "16x16" },
      { url: "/favicon.ico?v=3", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png?v=3",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a365d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark h-full" style={{ colorScheme: "dark" }}>
      <body className="min-h-screen antialiased bg-[#0f1d33] text-white">
        <I18nProvider>
          <AuthProvider>
            <StoreProvider>{children}</StoreProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
