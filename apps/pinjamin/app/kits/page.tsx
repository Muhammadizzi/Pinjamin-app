"use client";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { Boxes, Trash2, Eye, MapPin, QrCode } from "lucide-react";
import { AssetImage } from "@/components/ui/asset-image";

export default function KitsPage() {
  const { kits, assets, categories, locations, deleteKit } = useStore();
  const { t, assetStatus } = useT();
  const { ask, confirmDialog } = useConfirmDialog();

  const confirmDeleteKit = (k: any) =>
    ask({
      title: t("confirmDeleteKit"),
      description: t("confirmDeleteKitBody", {
        name: k.name,
        count: k.assetIds?.length ?? 0,
      }),
      confirmLabel: t("yesDelete"),
      action: () => deleteKit(k.id),
    });

  const catName = (k: any) =>
    categories.find((c) => c.id === k.categoryId)?.name || "-";
  const locName = (k: any) =>
    locations.find((l) => l.id === k.locationId)?.name || "-";

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t("kits")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("kitsSub", { count: kits.length })}
            </p>
          </div>
          <Link href="/kits/new">
            <Button className="rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white shadow">
              {t("createKit")}
            </Button>
          </Link>
        </div>

        {kits.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center space-y-3">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Boxes className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <div className="font-semibold">{t("noKitsYet")}</div>
                <div className="text-sm text-muted-foreground">
                  {t("noKitsHint")}
                </div>
              </div>
              <Link href="/kits/new">
                <Button className="rounded-xl">{t("createFirstKit")}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop table — gaya sama seperti halaman Aset */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border bg-white dark:bg-slate-900">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 w-14">{t("photo")}</th>
                    <th className="px-4 py-3">{t("name")}</th>
                    <th className="px-4 py-3">{t("category")}</th>
                    <th className="px-4 py-3">{t("status")}</th>
                    <th className="px-4 py-3">{t("location")}</th>
                    <th className="px-4 py-3">{t("kitContents")}</th>
                    <th className="px-4 py-3 text-right">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {kits.map((k) => (
                    <tr
                      key={k.id}
                      className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/kits/${k.id}`}
                          aria-label={t("viewItem", { name: k.name })}
                        >
                          <AssetImage
                            src={(k as any).image}
                            alt={k.name}
                            size="md"
                          />
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{k.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <QrCode className="h-3 w-3" /> {k.qrCode}
                        </div>
                      </td>
                      <td className="px-4 py-3">{catName(k)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={(k as any).status}
                          label={assetStatus((k as any).status ?? "")}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />{" "}
                          {locName(k)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">
                          {t("assetCountLabel", { count: k.assetIds.length })}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link href={`/kits/${k.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => confirmDeleteKit(k)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards — thumbnail di kiri seperti halaman Aset */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {kits.map((k) => (
                <Card key={k.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Link
                        href={`/kits/${k.id}`}
                        aria-label={t("viewItem", { name: k.name })}
                      >
                        <AssetImage
                          src={(k as any).image}
                          alt={k.name}
                          size="md"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{k.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {k.qrCode} •{" "}
                          {t("assetCountLabel", { count: k.assetIds.length })}
                        </div>
                      </div>
                      <StatusBadge
                        status={(k as any).status}
                        label={assetStatus((k as any).status ?? "")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                        <div className="text-muted-foreground">
                          {t("category")}
                        </div>
                        <div className="font-medium truncate">{catName(k)}</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                        <div className="text-muted-foreground">
                          {t("location")}
                        </div>
                        <div className="font-medium truncate">{locName(k)}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/kits/${k.id}`} className="flex-1">
                        <Button
                          variant="outline"
                          className="w-full rounded-xl"
                          size="sm"
                        >
                          <Eye className="h-4 w-4" /> {t("detail")}
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDeleteKit(k)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {confirmDialog}
    </AppShell>
  );
}

function StatusBadge({ status, label }: { status?: string; label?: string }) {
  const map: Record<string, string> = {
    AVAILABLE: "success",
    CHECKED_OUT: "info",
    MAINTENANCE: "warning",
    RETIRED: "secondary",
  };
  return (
    <Badge variant={(map[status || ""] as any) || "secondary"}>
      {label || status || "-"}
    </Badge>
  );
}
