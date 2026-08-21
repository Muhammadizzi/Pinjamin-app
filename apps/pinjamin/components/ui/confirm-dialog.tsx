"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, HelpCircle, X } from "lucide-react";
import { Button } from "./button";
import { useT } from "@/lib/i18n";

/**
 * Dialog konfirmasi global untuk aksi CRUD.
 *
 * Dipakai lewat hook {@link useConfirmDialog}:
 *
 * ```tsx
 * const { ask, confirmDialog } = useConfirmDialog();
 * // ...
 * ask({
 *   title: "Hapus aset?",
 *   description: `"${asset.name}" akan dihapus permanen.`,
 *   confirmLabel: "Ya, Hapus",
 *   action: () => deleteAsset(asset.id),
 * });
 * // render sekali di bawah tree halaman: {confirmDialog}
 * ```
 */

export type ConfirmVariant = "danger" | "primary";

export type ConfirmRequest = {
  /** Judul dialog, mis. "Hapus aset?" */
  title: string;
  /** Penjelasan tambahan (opsional). */
  description?: string;
  /** Label tombol konfirmasi. Default mengikuti bahasa aktif: "Ya, Hapus" (danger) / "Ya, Lanjutkan" (primary). */
  confirmLabel?: string;
  /** Label tombol batal. Default mengikuti bahasa aktif ("Batal" / "Cancel"). */
  cancelLabel?: string;
  /** danger = aksi destruktif (merah), primary = aksi biasa (navy/gold). */
  variant?: ConfirmVariant;
  /** Aksi yang dijalankan setelah user menekan konfirmasi. */
  action: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  // Tombol Escape membatalkan; scroll body dikunci selama dialog terbuka.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = variant === "danger";
  const effectiveConfirmLabel =
    confirmLabel ?? (isDanger ? t("yesDelete") : t("yesContinue"));
  const Icon = isDanger ? AlertTriangle : HelpCircle;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop: klik = batal */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#12233f] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onCancel}
          aria-label={t("closeDialog")}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div
            className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${
              isDanger
                ? "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
                : "bg-[#1a365d]/10 text-[#1a365d] dark:bg-amber-400/15 dark:text-amber-300"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            {description && (
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onCancel} className="rounded-xl">
            {cancelLabel ?? t("cancel")}
          </Button>
          <Button
            // eslint-disable-next-line jsx-a11y/no-autofocus -- dialog modal: fokus awal pada aksi utama agar keyboard-friendly
            autoFocus
            variant={isDanger ? "destructive" : "default"}
            onClick={onConfirm}
            className="rounded-xl"
          >
            {effectiveConfirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook ringkas: kembalikan `ask()` untuk meminta konfirmasi dan elemen
 * `confirmDialog` yang dirender sekali di halaman.
 */
export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const ask = useCallback((req: ConfirmRequest) => setRequest(req), []);
  const close = useCallback(() => setRequest(null), []);

  const confirmDialog = (
    <ConfirmDialog
      open={request !== null}
      title={request?.title ?? ""}
      description={request?.description}
      confirmLabel={request?.confirmLabel}
      cancelLabel={request?.cancelLabel}
      variant={request?.variant ?? "danger"}
      onCancel={close}
      onConfirm={() => {
        const action = request?.action;
        close();
        action?.();
      }}
    />
  );

  return { ask, confirmDialog };
}
