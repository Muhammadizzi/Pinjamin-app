"use client";
import { useCallback, useState } from "react";
import { ATTACHMENTS_MAX, type TicketAttachment } from "@/lib/ticket-shared";

/**
 * State lampiran untuk satu form (tiket baru atau satu balasan).
 *
 * Berkas diunggah SAAT dipilih, bukan saat form dikirim: kalau menunggu
 * submit, pengguna baru tahu berkasnya ditolak setelah menulis panjang lebar,
 * dan kegagalan unggah ikut menggagalkan tiketnya. Yang dikirim bersama form
 * akhirnya hanya daftar URL.
 *
 * Dipakai landing page, portal pelapor, dan panel admin — ketiganya menembak
 * endpoint publik yang sama (/api/tickets/upload).
 */
export function useAttachments(labels: { tooMany: string; failed: string }) {
  const [items, setItems] = useState<TicketAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const add = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError("");

      const room = ATTACHMENTS_MAX - items.length;
      if (room <= 0) {
        setError(labels.tooMany);
        return;
      }

      setUploading(true);
      try {
        for (const file of Array.from(files).slice(0, room)) {
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/tickets/upload", {
            method: "POST",
            body: form,
          });
          const j = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(j.error || labels.failed);
            // Berhenti di kegagalan pertama: kalau sebabnya rate limit atau
            // Storage mati, berkas berikutnya pasti gagal juga.
            break;
          }
          setItems((prev) =>
            prev.length >= ATTACHMENTS_MAX
              ? prev
              : [...prev, { url: j.url as string, name: j.name as string }]
          );
        }
        if (files.length > room) setError(labels.tooMany);
      } catch {
        setError(labels.failed);
      } finally {
        setUploading(false);
      }
    },
    [items.length, labels.failed, labels.tooMany]
  );

  const remove = useCallback((url: string) => {
    setItems((prev) => prev.filter((a) => a.url !== url));
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setError("");
  }, []);

  return { items, uploading, error, add, remove, reset, setError };
}
