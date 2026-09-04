"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { History, Plus, Trash2, LogOut, X } from "lucide-react";

interface Pemakai {
  id: string;
  name: string;
  department?: string | null;
  fromDate: string;
  toDate?: string | null;
  note?: string | null;
}

const KOSONG = { name: "", department: "", fromDate: "", note: "" };

/**
 * Riwayat pemakaian aset — sisi admin, dan satu-satunya tempat pemilik aset
 * ditentukan.
 *
 * Form aset tidak lagi punya kolom Pemilik. Yang dicatat di sini adalah
 * siapa memakai aset dan sejak kapan; `assets.owner` cuma cerminan baris yang
 * masih terbuka, disamakan server setiap kali daftar ini berubah. Dengan
 * begitu tidak ada dua tempat yang bisa bercerita berbeda.
 *
 * Ini bukan peminjaman: tidak ada tanggal kembali yang ditunggu sistem, dan
 * pencatatannya dilakukan setelah perpindahan terjadi, bukan sebelum.
 */
export function AssetHoldersCard({ assetId }: { assetId: string }) {
  const { t, formatDate } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [daftar, setDaftar] = useState<Pemakai[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [form, setForm] = useState(KOSONG);
  const [buka, setBuka] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);

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

  const simpan = async () => {
    const nama = form.name.trim();
    if (!nama) return alert(t("holderNameRequired"));
    setMenyimpan(true);
    try {
      const res = await fetch(`/api/data/assets/${assetId}/holders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, name: nama }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return alert(j.error || t("holderSaveFailed"));
      setForm(KOSONG);
      setBuka(false);
      await muat();
    } finally {
      setMenyimpan(false);
    }
  };

  const akhiri = (p: Pemakai) =>
    ask({
      title: t("confirmEndHolder", { name: p.name }),
      description: t("confirmEndHolderBody"),
      confirmLabel: t("yesEnd"),
      variant: "primary",
      action: async () => {
        await fetch(`/api/data/assets/${assetId}/holders/${p.id}`, {
          method: "PATCH",
        });
        await muat();
      },
    });

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
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" /> {t("holderHistory")}
        </CardTitle>
        <Button
          type="button"
          size="sm"
          variant={buka ? "ghost" : "outline"}
          onClick={() => setBuka((v) => !v)}
        >
          {buka ? (
            <>
              <X className="mr-1.5 h-3.5 w-3.5" /> {t("cancel")}
            </>
          ) : (
            <>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> {t("addHolder")}
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {buka && (
          <div className="space-y-3 rounded-xl border bg-muted/40 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("holderName")}</Label>
                <Input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("holderDept")}</Label>
                <Input
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  placeholder={t("holderDeptPlaceholder")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("holderFrom")}</Label>
              <Input
                type="date"
                value={form.fromDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("holderNote")}</Label>
              <Textarea
                rows={2}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder={t("holderNotePlaceholder")}
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={simpan}
              disabled={menyimpan}
            >
              {menyimpan ? t("loadingShort") : t("save")}
            </Button>
          </div>
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
                  {p.note && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.note}
                    </p>
                  )}
                </div>
                {!p.toDate && (
                  <button
                    type="button"
                    onClick={() => akhiri(p)}
                    title={t("endHolder")}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
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

        <p className="text-xs text-muted-foreground">{t("holderIsOwner")}</p>
      </CardContent>
      {confirmDialog}
    </Card>
  );
}
