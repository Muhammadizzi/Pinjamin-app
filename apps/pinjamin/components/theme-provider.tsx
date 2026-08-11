"use client";
import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      // Tema tunggal dark navy: paksa "dark" supaya varian `dark:` Tailwind
      // SELALU aktif (sebelumnya default light menghapus class .dark →
      // komponen ber-varian dark: jadi putih/tidak terbaca).
      defaultTheme="dark"
      forcedTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
