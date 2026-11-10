"use client";
import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { locationLabel } from "@/lib/location-path";
import { normalSerial, ringkasKondisi } from "@/lib/asset-model";
import type { Asset, AssetStatus } from "@/lib/types";
import { Boxes, ChevronRight } from "lucide-react";

const KONDISI: AssetStatus[] = ["GOOD", "DAMAGED", "MAINTENANCE"];

/**
 * Semua unit dari model yang sama dengan aset ini — koreksi dosen pembimbing
 * (11 Nov 2026): dari satu unit, admin harus bisa melihat unit lain bermodel
 * sama beserta kondisinya (berapa Baik, Rusak, Dalam Perbaikan), dibedakan
 * lewat serial number.
 */
export function ModelUnitsCard({ asset }: { asset: Asset }) {
  const { assets, locations } = useStore();
  const { t, assetStatus } = useT();

  const units = useMemo(
    () =>
      asset.assetModelId
        ? assets
            .filter((a) => a.assetModelId === asset.assetModelId)
            .sort((a, b) =>
              normalSerial(a.serialNumber).localeCompare(
                normalSerial(b.serialNumber),
                undefined,
                { numeric: true }
              )
            )
        : [asset],
    [assets, asset]
  );
  const r = ringkasKondisi(units);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Boxes className="h-4 w-4" /> {t("otherUnits")}
          </CardTitle>
          {asset.assetModelId && (
            <Link
              href={`/assets?model=${encodeURIComponent(asset.assetModelId)}`}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              {t("viewUnits")}
            </Link>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          <span className="text-sm font-semibold mr-1">
            {t("unitCount", { count: r.total })}
          </span>
          {KONDISI.filter((k) => r[k] > 0).map((k) => (
            <StatusBadge
              key={k}
              status={k}
              label={`${assetStatus(k)} ${r[k]}`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="max-h-80 overflow-y-auto -mx-2 px-2 space-y-1.5">
          {units.map((u) => {
            const ini = u.id === asset.id;
            const lokasi = locationLabel(locations, u.locationId) || "-";
            const isi = (
              <>
                <span className="font-mono text-xs font-semibold w-24 shrink-0 truncate">
                  {u.serialNumber || "-"}
                </span>
                <StatusBadge
                  status={u.status}
                  label={assetStatus(u.status)}
                  className="shrink-0"
                />
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {lokasi}
                  {u.owner ? ` · ${u.owner}` : ""}
                </span>
                {ini ? (
                  <span className="shrink-0 text-[11px] font-semibold text-amber-300">
                    {t("thisUnit")}
                  </span>
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </>
            );
            const kelas =
              "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm";
            return ini ? (
              <div
                key={u.id}
                className={`${kelas} border-amber-300/40 bg-amber-300/5`}
              >
                {isi}
              </div>
            ) : (
              <Link
                key={u.id}
                href={`/assets/${u.id}`}
                className={`${kelas} hover:bg-muted/50 transition-colors`}
              >
                {isi}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
