"use client";
import { useParams, useRouter } from "next/navigation";
import { useRef } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  QrCode,
  MapPin,
  Tag as TagIcon,
  User,
  DollarSign,
  Calendar,
} from "lucide-react";

export default function AssetDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const {
    assets,
    categories,
    locations,
    tags,
    custodians,
    assetModels,
    customFields,
    deleteAsset,
  } = useStore();
  const { t } = useT();
  const qrRef = useRef<HTMLDivElement>(null);
  const asset = assets.find((a) => a.id === id);
  if (!asset)
    return (
      <AppShell>
        <div className="p-8 text-center">
          Aset tidak ditemukan.{" "}
          <Link href="/assets" className="text-primary underline">
            Kembali
          </Link>
        </div>
      </AppShell>
    );
  const cat = categories.find((c) => c.id === asset.categoryId);
  const loc = locations.find((l) => l.id === asset.locationId);
  const model = assetModels.find((m) => m.id === asset.assetModelId);
  const cust = custodians.find((c) => c.id === asset.custodianId);

  const handleDelete = () => {
    if (confirm("Hapus aset ini?")) {
      deleteAsset(asset.id);
      router.push("/assets");
    }
  };

  const downloadQr = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = svgUrl;
      });

      const width = 320;
      const height = 420;
      const qrSize = 200;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.textAlign = "center";

      ctx.fillStyle = "#1a365d";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(asset.name, width / 2, 36, width - 32);

      ctx.drawImage(img, (width - qrSize) / 2, 64, qrSize, qrSize);

      ctx.fillStyle = "#1a365d";
      ctx.font = "bold 16px monospace";
      ctx.fillText(asset.qrCode, width / 2, 64 + qrSize + 32);

      ctx.fillStyle = "#CBA12C";
      ctx.font = "600 13px sans-serif";
      ctx.fillText("GARUDA FOOD", width / 2, 64 + qrSize + 56);

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `${asset.qrCode}.png`;
      a.click();
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        <Link
          href="/assets"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Assets
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden">
              <div className="h-64 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 flex items-center justify-center relative">
                {asset.mainImage ? (
                  <img
                    src={asset.mainImage}
                    alt={asset.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-6xl">📦</div>
                )}
                <Badge
                  className="absolute top-4 right-4"
                  variant={
                    asset.status === "AVAILABLE"
                      ? "success"
                      : asset.status === "CHECKED_OUT"
                      ? "info"
                      : asset.status === "MAINTENANCE"
                      ? "warning"
                      : "secondary"
                  }
                >
                  {asset.status}
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-xl">{asset.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {asset.description || "Tanpa deskripsi"}
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TagIcon className="h-4 w-4 text-muted-foreground" />{" "}
                    Kategori:{" "}
                    <span className="font-medium">{cat?.name || "-"}</span>{" "}
                    {cat && (
                      <span
                        className="h-3 w-3 rounded-full inline-block"
                        style={{ background: cat.color }}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" /> Lokasi:{" "}
                    <span className="font-medium">{loc?.name || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />{" "}
                    Custodian:{" "}
                    <span className="font-medium">{cust?.name || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />{" "}
                    Dibuat: {formatDate(asset.createdAt)}
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    Model:{" "}
                    <span className="font-medium">{model?.name || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />{" "}
                    Nilai:{" "}
                    <span className="font-medium">
                      Rp {asset.value?.toLocaleString("id-ID") || "-"}
                    </span>
                  </div>
                  <div>
                    Serial:{" "}
                    <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {asset.serialNumber || "-"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {asset.tagIds.map((tid) => {
                      const t = tags.find((x) => x.id === tid);
                      return t ? (
                        <Badge key={tid} variant="secondary">
                          {t.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
                {customFields.length > 0 && (
                  <div className="sm:col-span-2 border-t pt-4 space-y-2">
                    <div className="font-medium text-sm">Custom Fields</div>
                    {customFields.map((cf) => (
                      <div
                        key={cf.id}
                        className="flex justify-between text-sm border-b py-1"
                      >
                        <span className="text-muted-foreground">{cf.name}</span>
                        <span className="font-medium">
                          {asset.customValues[cf.id] || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Riwayat & Catatan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {asset.notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada catatan.
                  </p>
                ) : (
                  asset.notes.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-xl border p-3 bg-slate-50 dark:bg-slate-800/50"
                    >
                      <div className="text-sm">{n.content}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(n.createdAt)} • {n.type}
                      </div>
                    </div>
                  ))
                )}
                <div className="text-xs text-muted-foreground">
                  Update terakhir: {formatDate(asset.updatedAt)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="h-4 w-4" /> QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div ref={qrRef} className="bg-white p-4 rounded-2xl shadow">
                  <QRCodeSVG
                    value={`${
                      typeof window !== "undefined"
                        ? window.location.origin
                        : ""
                    }/assets/${asset.id}?qr=${asset.qrCode}`}
                    size={160}
                  />
                </div>
                <div className="text-center">
                  <div className="font-mono text-sm font-bold">
                    {asset.qrCode}
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
                <Link href={`/assets/${asset.id}/edit`}>
                  <Button className="w-full rounded-xl">
                    <Pencil className="h-4 w-4" /> Edit Aset
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  className="w-full rounded-xl"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" /> Hapus
                </Button>
                <Link href="/bookings/new">
                  <Button variant="outline" className="w-full rounded-xl">
                    Booking Aset Ini
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
