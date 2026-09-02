"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { History, Trash2 } from "lucide-react";

interface Pemakai {
  id: string;
  name: string;
  department?: string | null;
  fromDate: string;
  toDate?: string | null;
  note?: string | null;
}

/**
 * Riwayat pemakai aset — sisi admin.
 *
 * Daftar ini terisi OTOMATIS saat kolom Pemilik pada form aset diubah —
 * tidak ada pencatatan manual. Yang tersisa di sini hanya menampilkan dan
 * menghapus baris yang keliru.
 *
 * Riwayat adalah sumber kebenaran "siapa pemilik sekarang"; kolom
 * `assets.owner` disamakan server setiap kali daftar ini berubah.
 */
export function AssetHoldersCard({ assetId }: { assetId: string }) {
  const { t, formatDate } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [daftar, setDaftar] = useState<Pemakai[]>([]);
  const [memuat, setMemuat] = useState(true);

  const muat = useCallback(async () => {
    try {
      const res = await fetch(`/api/data/assets/${assetId}/holders`, {
        cache: "no-store",
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) setDaftar(j.holders || []);
    } catch {
      /* daftar ini pelengkap — kegagalannya tidak menahan halaman */
    } finally {
      setMemuat(false);
    }
  }, [assetId]);

  useEffect(() => {
    void muat();
  }, [muat]);

  const hapus = (p: Pemakai) =>
    ask({
      title: t("confirmDeleteHolder", { name: p.name }),
      description: t("confirmDeleteHolderBody"),
      confirmLabel: t("yesDelete"),
      action: async () => {
        await fetch(`/api/data/assets/${assetId}/holders/${p.id}`, {
          method: "DELETE",
        });
        await muat();
      },
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" /> {t("holderHistory")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {memuat ? (
          <p className="text-sm text-muted-foreground">{t("loadingShort")}</p>
        ) : daftar.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noHolderYet")}</p>
        ) : (
          <ul className="space-y-2">
            {daftar.map((p) => (
              <li
                key={p.id}
                className={`flex items-start gap-3 rounded-xl border p-3 ${
                  p.toDate
                    ? "bg-slate-50 dark:bg-slate-800/50"
                    : "border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/20"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {p.name}
                    {p.department ? ` — ${p.department}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.toDate
                      ? `${formatDate(p.fromDate)} → ${formatDate(p.toDate)}`
                      : t("holderSince", { date: formatDate(p.fromDate) })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => hapus(p)}
                  title={t("delete")}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {confirmDialog}
    </Card>
  );
}
