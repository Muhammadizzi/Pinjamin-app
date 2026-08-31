"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { History, Plus, Trash2, Loader2 } from "lucide-react";

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
 * Riwayat adalah sumber kebenaran "siapa pemilik sekarang"; kolom
 * `assets.owner` disamakan server setiap kali daftar ini berubah. Karena itu
 * form ini tidak menyentuh kolom owner secara langsung — kalau ia ikut
 * menulis, dua tempat akan saling menimpa dan yang menang tergantung urutan
 * request.
 */
export function AssetHoldersCard({ assetId }: { assetId: string }) {
  const { t, formatDate } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [daftar, setDaftar] = useState<Pemakai[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [buka, setBuka] = useState(false);
  const [form, setForm] = useState({ name: "", department: "", fromDate: "" });

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

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setMenyimpan(true);
    setGalat(null);
    try {
      const res = await fetch(`/api/data/assets/${assetId}/holders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          department: form.department,
          fromDate: form.fromDate || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGalat(j.error || t("genericFailed"));
        return;
      }
      setForm({ name: "", department: "", fromDate: "" });
      setBuka(false);
      await muat();
    } catch {
      setGalat(t("genericFailed"));
    } finally {
      setMenyimpan(false);
    }
  };

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
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" /> {t("holderHistory")}
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl"
          onClick={() => setBuka((v) => !v)}
        >
          <Plus className="h-4 w-4" /> {t("addHandover")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {buka && (
          <form
            onSubmit={simpan}
            className="rounded-xl border bg-slate-50 dark:bg-slate-800/50 p-3 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("holderName")}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("ownerPlaceholder")}
                  className="h-10 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("holderDepartment")}</Label>
                <Input
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  placeholder={t("holderDepartmentPlaceholder")}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("holderFromDate")}</Label>
                <Input
                  type="date"
                  value={form.fromDate}
                  onChange={(e) =>
                    setForm({ ...form, fromDate: e.target.value })
                  }
                  className="h-10 rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  {t("holderFromDateHint")}
                </p>
              </div>
            </div>
            {galat && <p className="text-xs text-red-500">{galat}</p>}
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={menyimpan}
                className="rounded-xl"
              >
                {menyimpan && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("save")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => setBuka(false)}
              >
                {t("cancel")}
              </Button>
            </div>
          </form>
        )}

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
