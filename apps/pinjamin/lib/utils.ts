import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

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

export function generateId() {
  return (
    Math.random().toString(36).slice(2, 9).toUpperCase() +
    "-" +
    Date.now().toString(36).slice(-4).toUpperCase()
  );
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
