import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Dropdown SIGAP.
 *
 * Warna latar dan ikon panahnya TIDAK ditulis sebagai utility background,
 * melainkan sebagai CSS elemen di app/globals.css. Alasannya konkret: dulu
 * komponen ini menumpuk TIGA utility background sekaligus dalam satu kelas —
 * warna latar, gambar panah, dan varian dark-nya. tailwind-merge di dalam
 * cn() menganggap ketiganya saling bertabrakan lalu MEMBUANG semuanya, jadi
 * yang sampai ke browser adalah select tanpa warna latar dan tanpa panah.
 * Tak terlihat di halaman gelap, tapi di perangkat ber-setelan terang
 * browser mengisi kekosongan itu dengan warna sistem, dan popup pilihannya
 * muncul putih di atas form gelap.
 *
 * Kelas di bawah karena itu sengaja tidak menyentuh grup background sama
 * sekali. Catatan: contoh kelas yang bermasalah TIDAK ditulis harfiah di
 * komentar ini — Tailwind v4 memindai seluruh isi berkas, termasuk komentar,
 * dan akan menerbitkan aturan CSS dari contoh yang ditulis apa adanya.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-11 w-full appearance-none rounded-xl border border-input pl-4 pr-10 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
