"use client";
import { Badge } from "@/components/ui/badge";

/**
 * Warna kondisi aset — satu-satunya tempat pemetaan ini hidup.
 *
 * Sebelumnya blok yang sama disalin di beberapa halaman. Saat status
 * peminjaman (AVAILABLE/CHECKED_OUT) diganti kondisi barang, salinan yang
 * tertinggal akan diam-diam menampilkan semuanya abu-abu tanpa error apa pun.
 */
const VARIANT: Record<string, string> = {
  GOOD: "success",
  DAMAGED: "destructive",
  MAINTENANCE: "warning",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status?: string;
  label?: string;
  className?: string;
}) {
  return (
    <Badge
      variant={(VARIANT[status || ""] as any) || "secondary"}
      className={className}
    >
      {label || status || "-"}
    </Badge>
  );
}
