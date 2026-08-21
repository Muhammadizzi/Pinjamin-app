"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { contrastTextColor } from "@/lib/utils";
import { downloadQrPng, printQrPng } from "@/lib/qr-download";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  QrCode,
  MapPin,
  Tag as TagIcon,
  User,
  Calendar,
  Download,
  Printer,
} from "lucide-react";
import { AssetImage } from "@/components/ui/asset-image";

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
  const { t, formatDate, assetStatus } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [printingQr, setPrintingQr] = useState(false);
  const asset = assets.find((a) => a.id === id);
  if (!asset)
    return (
      <AppShell>
        <div className="p-8 text-center">
          {t("assetNotFound")}{" "}
          <Link href="/assets" className="text-primary underline">
            {t("back")}
          </Link>
        </div>
      </AppShell>
    );
  const cat = categories.find((c) => c.id === asset.categoryId);
  const loc = locations.find((l) => l.id === asset.locationId);
  const model = assetModels.find((m) => m.id === asset.assetModelId);
  const cust = custodians.find((c) => c.id === asset.custodianId);

  const handleDelete = () => {
    ask({
      title: t("confirmDeleteAsset"),
      description: t("confirmDeleteAssetBody", {
        name: asset.name,
        qr: asset.qrCode,
      }),
      confirmLabel: t("yesDelete"),
      action: () => {
        deleteAsset(asset.id);
        router.push("/assets");
      },
    });
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        <Link
          href="/assets"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("backToAssets")}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-5 sm:p-6 space-y-5">
                {/* Foto kotak rapi (bukan banner memanjang) + identitas aset */}
                <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
                  <div className="relative shrink-0 mx-auto sm:mx-0">
                    <AssetImage
                      src={asset.mainImage}
                      alt={asset.name}
                      size="xxl"
                    />
                    <Badge
                      className="absolute -top-2.5 -right-2.5 shadow"
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
                      {assetStatus(asset.status)}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                    <h1 className="text-xl font-bold truncate">{asset.name}</h1>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {asset.description || t("noDescription")}
                    </p>
                    {asset.tagIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 justify-center sm:justify-start">
                        {asset.tagIds.map((tid) => {
                          const tg = tags.find((x) => x.id === tid);
                          return tg ? (
                            <span
                              key={tid}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm"
                              style={{
                                background: tg.color || "#64748b",
                                color: contrastTextColor(tg.color || "#64748b"),
                              }}
                            >
                              <TagIcon className="h-3 w-3" />
                              {tg.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <TagIcon className="h-4 w-4 text-muted-foreground" />{" "}
                      {t("category")}:{" "}
                      <span className="font-medium">{cat?.name || "-"}</span>{" "}
                      {cat && (
                        <span
                          className="h-3 w-3 rounded-full inline-block"
                          style={{ background: cat.color }}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />{" "}
                      {t("location")}:{" "}
                      <span className="font-medium">{loc?.name || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />{" "}
                      {t("custodian")}:{" "}
                      <span className="font-medium">{cust?.name || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />{" "}
                      {t("createdLabel")}: {formatDate(asset.createdAt)}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      {t("model")}:{" "}
                      <span className="font-medium">{model?.name || "-"}</span>
                    </div>
                    <div>
                      {t("serialLabel")}:{" "}
                      <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {asset.serialNumber || "-"}
                      </span>
                    </div>
                  </div>
                  {(() => {
                    const visibleCustomFields = customFields.filter(
                      (cf) =>
                        !cf.categoryIds?.length ||
                        (!!asset.categoryId &&
                          cf.categoryIds.includes(asset.categoryId))
                    );
                    return visibleCustomFields.length > 0 ? (
                      <div className="sm:col-span-2 border-t pt-4 space-y-2">
                        <div className="font-medium text-sm">
                          {t("customFields")}
                        </div>
                        {visibleCustomFields.map((cf) => (
                          <div
                            key={cf.id}
                            className="flex justify-between text-sm border-b py-1"
                          >
                            <span className="text-muted-foreground">
                              {cf.name}
                            </span>
                            <span className="font-medium">
                              {asset.customValues[cf.id] || "-"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("historyAndNotes")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {asset.notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("noNotesYet")}
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
                  {t("lastUpdate", { date: formatDate(asset.updatedAt) })}
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
                <div id="asset-qr" className="bg-white p-4 rounded-2xl shadow">
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
                    {t("scanForQuickAction")}
                  </div>
                </div>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl text-xs"
                    disabled={downloadingQr}
                    onClick={async () => {
                      try {
                        setDownloadingQr(true);
                        await downloadQrPng({
                          svgSelector: "#asset-qr svg",
                          code: asset.qrCode,
                          title: asset.name,
                        });
                      } catch (e) {
                        console.error(e);
                        alert(t("qrPngFailed"));
                      } finally {
                        setDownloadingQr(false);
                      }
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {downloadingQr ? t("generating") : t("download")}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl text-xs"
                    disabled={printingQr}
                    onClick={async () => {
                      try {
                        setPrintingQr(true);
                        await printQrPng({
                          svgSelector: "#asset-qr svg",
                          code: asset.qrCode,
                          title: asset.name,
                        });
                      } catch (e) {
                        console.error(e);
                        alert(t("qrPrintFailed"));
                      } finally {
                        setPrintingQr(false);
                      }
                    }}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    {printingQr ? t("preparing") : t("print")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col gap-2">
                <Link href={`/assets/${asset.id}/edit`}>
                  <Button className="w-full rounded-xl">
                    <Pencil className="h-4 w-4" /> {t("editAsset")}
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  className="w-full rounded-xl"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" /> {t("delete")}
                </Button>
                <Link href="/bookings/new">
                  <Button variant="outline" className="w-full rounded-xl">
                    {t("bookThisAsset")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {confirmDialog}
    </AppShell>
  );
}
