"use client";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { Boxes, Trash2, Eye, Package, MapPin, Tag } from "lucide-react";

export default function KitsPage() {
  const { kits, assets, categories, locations, deleteKit } = useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();

  const confirmDeleteKit = (k: any) =>
    ask({
      title: "Hapus kit?",
      description: `"${k.name}" beserta seluruh isinya (${
        k.assetIds?.length ?? 0
      } aset) akan dihapus permanen.`,
      confirmLabel: "Ya, Hapus",
      action: () => deleteKit(k.id),
    });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("kits")}</h1>
            <p className="text-sm text-muted-foreground">
              Bundel aset yang dipinjam sebagai paket • {kits.length} kit
            </p>
          </div>
          <Link href="/kits/new">
            <Button className="rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white shadow">
              + Buat Kit
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
                <div className="font-semibold">Belum ada kit</div>
                <div className="text-sm text-muted-foreground">
                  Kit adalah bundel aset yang dipinjam bersamaan
                </div>
              </div>
              <Link href="/kits/new">
                <Button className="rounded-xl">Buat Kit Pertama</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {kits.map((k) => {
              const cat = categories.find(
                (c) => c.id === (k as any).categoryId
              );
              const loc = locations.find((l) => l.id === (k as any).locationId);
              return (
                <Card
                  key={k.id}
                  className="hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden group"
                >
                  {(k as any).image ? (
                    <div className="h-36 w-full overflow-hidden bg-slate-100">
                      <img
                        src={(k as any).image}
                        alt={k.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-2 w-full bg-gradient-to-r from-[#1a365d] to-[#CBA12C]" />
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Boxes className="h-5 w-5 text-[#1a365d] dark:text-[#CBA12C]" />
                      <span className="truncate">{k.name}</span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                      {k.description || "-"}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="font-mono text-xs">
                        {k.qrCode}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {k.assetIds.length} aset
                      </Badge>
                      {cat && (
                        <Badge
                          variant="outline"
                          className="text-xs flex items-center gap-1"
                        >
                          <Tag className="h-3 w-3" /> {cat.name}
                        </Badge>
                      )}
                      {loc && (
                        <Badge
                          variant="outline"
                          className="text-xs flex items-center gap-1"
                        >
                          <MapPin className="h-3 w-3" /> {loc.name}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 max-h-24 overflow-auto pr-1">
                      {k.assetIds.slice(0, 3).map((aid) => {
                        const a = assets.find((x) => x.id === aid);
                        return a ? (
                          <div
                            key={aid}
                            className="text-xs flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1.5"
                          >
                            <Package className="h-3 w-3 shrink-0 text-slate-500" />
                            <span className="truncate">{a.name}</span>
                          </div>
                        ) : null;
                      })}
                      {k.assetIds.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{k.assetIds.length - 3} aset lagi
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Link href={`/kits/${k.id}`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-xl"
                        >
                          <Eye className="h-4 w-4" /> Detail
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDeleteKit(k)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {confirmDialog}
    </AppShell>
  );
}
