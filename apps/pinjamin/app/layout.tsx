import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "Pinjamin — Smart Asset Lending | Garuda Food",
  description:
    "Sistem peminjaman aset Garuda Food — kelola aset, kit, booking, audit, dan laporan dengan QR.",
  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning className="h-full">
      <body className="min-h-screen antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
