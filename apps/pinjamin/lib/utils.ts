import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Tanggal + jam dalam locale Indonesia — khusus halaman publik (landing
 * tiket) yang memang hanya berbahasa Indonesia.
 *
 * Di halaman admin JANGAN pakai ini: pakai `formatDate` / `formatDateTime`
 * dari `useT()` (lib/i18n.tsx) supaya formatnya ikut bahasa yang dipilih.
 */
export function formatDateTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Id entitas = UUID v4.
 *
 * WAJIB UUID: kolom id di Postgres bertipe uuid, dan server menerima id yang
 * dikirim client (lihat clientIdRow di lib/resource-config.ts) supaya id
 * lokal dan id DB identik. Dengan id acak non-UUID seperti sebelumnya,
 * server terpaksa membuat id sendiri sehingga edit/hapus tepat setelah
 * "tambah" mengenai baris yang tidak ada sampai halaman di-reload.
 */
export function generateId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback (browser lama / konteks non-secure): UUID v4 dari getRandomValues.
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    ""
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateQRCode() {
  return "PIN-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

/**
 * Pilih warna teks paling kontras (putih atau navy gelap) untuk background
 * warna tertentu — dipakai chip kategori/tag berwarna agar teks tetap
 * terbaca walaupun pengguna memilih warna terang (mis. putih/kuning).
 * Membandingkan rasio kontras WCAG antara teks terang vs gelap.
 */
export function contrastTextColor(
  bg?: string | null,
  dark = "#0f172a",
  light = "#ffffff"
): string {
  const rgb = parseHexColor(bg);
  if (!rgb) return light;
  const lum = relativeLuminance(rgb[0], rgb[1], rgb[2]);
  const darkLum = relativeLuminance(15, 23, 42); // #0f172a
  const contrastLight = (1 + 0.05) / (lum + 0.05);
  const contrastDark = (lum + 0.05) / (darkLum + 0.05);
  return contrastDark > contrastLight ? dark : light;
}

function parseHexColor(hex?: string | null): [number, number, number] | null {
  if (!hex) return null;
  let h = hex.trim();
  if (h.startsWith("#")) h = h.slice(1);
  if (h.length === 3)
    h = h
      .split("")
      .map((ch) => ch + ch)
      .join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
