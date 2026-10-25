"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";

export type NoticeKind = "ok" | "err";

/**
 * Notifikasi singkat setelah admin menyimpan sesuatu — dipakai Panel Tiket dan
 * Pengaturan Akun supaya bentuknya sama di mana pun.
 *
 * Sengaja polos: warna kartu biasa, teks putih, dan hanya ikon kecil yang
 * berwarna. Versi sebelumnya (latar kaca buram, teks hijau menyala, tanda "✓"
 * di ujung kalimat) terlihat seperti template.
 *
 * Pakai seperti useConfirmDialog: render `noticeToast` sekali di halaman,
 * lalu panggil `showNotice("ok" | "err", teks)`. Hilang sendiri setelah 3 detik.
 */
export function useNoticeToast() {
  const [notice, setNotice] = useState<{
    kind: NoticeKind;
    text: string;
  } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((kind: NoticeKind, text: string) => {
    setNotice({ kind, text });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), 3000);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const noticeToast = notice ? (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-[60] flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-card-foreground shadow-md sm:max-w-sm"
    >
      {notice.kind === "ok" ? (
        <Check className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2} />
      ) : (
        <X className="h-4 w-4 shrink-0 text-red-400" strokeWidth={2} />
      )}
      <span>{notice.text}</span>
    </div>
  ) : null;

  return { showNotice, noticeToast };
}
