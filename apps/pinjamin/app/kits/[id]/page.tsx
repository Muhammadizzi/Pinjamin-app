"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function KitDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { kits, assets, categories, locations, deleteKit } = useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const kit = kits.find((k) => k.id === id) as any;
  if (!kit)
    return (
      <AppShell>
        <div className="p-8 text-center">Kit tidak ditemukan</div>
      </AppShell>
    );
  const cat = categories.find((c) => c.id === kit.categoryId);
  const loc = locations.find((l) => l.id === kit.locationId);
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/kits"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#1a365d] dark:text-white hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Kit
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{kit.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{kit.description}</p>
            {(kit.categoryId || kit.locationId) && (
              <div className="flex gap-2 mt-3">
                {cat && <Badge variant="outline">Kategori: {cat.name}</Badge>}
                {loc && <Badge variant="outline">Lokasi: {loc.name}</Badge>}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {kit.image && (
              <div className="rounded-2xl overflow-hidden border shadow-sm">
                <img
                  src={kit.image}
                  alt={kit.name}
                  className="w-full h-56 object-cover"
                />
              </div>
            )}
            <div className="flex flex-col items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-2xl p-6">
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG value={kit.qrCode} size={160} />
              </div>
              <div className="font-mono text-sm font-bold">{kit.qrCode}</div>
              <Badge>{kit.status}</Badge>
            </div>
            <div>
              <div className="font-medium mb-2">
                Anggota ({kit.assetIds.length})
              </div>
              {kit.assetIds.length === 0 ? (
                <div className="text-sm text-muted-foreground border rounded-xl p-4 text-center">
                  Kit ini belum ada anggota aset. Edit belum tersedia untuk
                  tambah anggota — bisa dihapus dan buat baru.
                </div>
              ) : (
                kit.assetIds.map((aid: string) => {
                  const a = assets.find((x) => x.id === aid);
                  return a ? (
                    <Link
                      key={aid}
                      href={`/assets/${a.id}`}
                      className="block border rounded-xl p-3 mb-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div className="font-medium text-sm">{a.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.status} • {a.qrCode}
                      </div>
                    </Link>
                  ) : null;
                })
              )}
            </div>
            <Button
              variant="destructive"
              className="w-full rounded-xl"
              onClick={() =>
                ask({
                  title: "Hapus kit?",
                  description: `"${kit.name}" beserta seluruh isinya (${
                    kit.assetIds?.length ?? 0
                  } aset) akan dihapus permanen.`,
                  confirmLabel: "Ya, Hapus",
                  action: () => {
                    deleteKit(kit.id);
                    router.push("/kits");
                  },
                })
              }
            >
              <Trash2 className="h-4 w-4" /> Hapus Kit
            </Button>
          </CardContent>
        </Card>
      </div>

      {confirmDialog}
    </AppShell>
  );
}
