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
import { AssetImage } from "@/components/ui/asset-image";
import {
  ArrowLeft,
  Trash2,
  QrCode,
  MapPin,
  Tag as TagIcon,
  Boxes,
  Pencil,
} from "lucide-react";

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

  const downloadQr = () => {
    const svg = document.querySelector("#kit-qr svg");
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${kit.qrCode}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        <Link
          href="/kits"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#1a365d] dark:text-amber-200 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Kit
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Hero: foto kotak rapi + identitas kit */}
            <Card>
              <CardContent className="p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
                  <div className="relative shrink-0 mx-auto sm:mx-0">
                    <AssetImage src={kit.image} alt={kit.name} size="xxl" />
                    <Badge className="absolute -top-2.5 -right-2.5 shadow">
                      {kit.status}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                    <h1 className="text-xl font-bold truncate">{kit.name}</h1>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {kit.description || "Tanpa deskripsi"}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1 justify-center sm:justify-start">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                        <Boxes className="h-3 w-3" />
                        {kit.assetIds.length} aset
                      </span>
                      {cat && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                          <TagIcon className="h-3 w-3" />
                          {cat.name}
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: cat.color }}
                          />
                        </span>
                      )}
                      {loc && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                          <MapPin className="h-3 w-3" />
                          {loc.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Anggota kit */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Anggota ({kit.assetIds.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {kit.assetIds.length === 0 ? (
                  <div className="text-sm text-muted-foreground border rounded-xl p-4 text-center">
                    Kit ini belum ada anggota aset.
                  </div>
                ) : (
                  kit.assetIds.map((aid: string) => {
                    const a = assets.find((x) => x.id === aid);
                    return a ? (
                      <Link
                        key={aid}
                        href={`/assets/${a.id}`}
                        className="flex items-center gap-3 border rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <AssetImage src={a.mainImage} alt={a.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {a.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {a.status} • {a.qrCode}
                          </div>
                        </div>
                      </Link>
                    ) : null;
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar kanan: QR + Aksi */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="h-4 w-4" /> QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div id="kit-qr" className="bg-white p-4 rounded-2xl shadow">
                  <QRCodeSVG
                    value={`${
                      typeof window !== "undefined"
                        ? window.location.origin
                        : ""
                    }/kits/${kit.id}?qr=${kit.qrCode}`}
                    size={160}
                  />
                </div>
                <div className="text-center">
                  <div className="font-mono text-sm font-bold">
                    {kit.qrCode}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Scan untuk aksi cepat
                  </div>
                </div>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl text-xs"
                    onClick={() => window.print()}
                  >
                    Print
                  </Button>
                  <Button
                    className="flex-1 rounded-xl text-xs"
                    onClick={downloadQr}
                  >
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col gap-2">
                <Link href="/bookings/new">
                  <Button variant="outline" className="w-full rounded-xl">
                    <Pencil className="h-4 w-4" /> Booking Kit Ini
                  </Button>
                </Link>
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
        </div>
      </div>

      {confirmDialog}
    </AppShell>
  );
}
