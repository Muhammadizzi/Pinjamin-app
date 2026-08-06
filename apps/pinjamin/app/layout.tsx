import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Pinjamin — Smart Asset Lending | Garuda Food",
  description: "Sistem peminjaman aset Garuda Food — kelola aset, kit, booking, audit, dan laporan dengan QR. Modern, glass, animasi animejs, bilingual ID/EN.",
  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a365d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className="h-full">
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <I18nProvider>
            <StoreProvider>{children}</StoreProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
