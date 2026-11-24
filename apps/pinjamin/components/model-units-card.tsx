"use client";
import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { locationLabel } from "@/lib/location-path";
import { ringkasKondisi, urutkanUnit } from "@/lib/asset-model";
import type { Asset, AssetStatus } from "@/lib/types";
import { Boxes, ChevronRight } from "lucide-react";

const KONDISI: AssetStatus[] = ["GOOD", "DAMAGED", "MAINTENANCE"];

/**
 * Semua unit dari model yang sama dengan aset ini — koreksi dosen pembimbing
 * (11 Nov 2026): dari satu unit, admin harus bisa melihat unit lain bermodel
 * sama beserta kondisinya (berapa Baik, Rusak, Dalam Perbaikan), dibedakan
 * lewat serial number.
 *
 * Revisi penguji (24 Nov 2026): daftar diberi judul kolom (Unit, Nomor Seri,
 * Kondisi, Lokasi) dan nomor "Unit ke-n". Urutannya dari urutkanUnit(), sama
 * dengan yang dipakai halaman pindai QR.
 */
export function ModelUnitsCard({ asset }: { asset: Asset }) {
  const { assets, locations } = useStore();
  const { t, assetStatus } = useT();

  const units = useMemo(
    () =>
      asset.assetModelId
        ? urutkanUnit(
            assets.filter((a) => a.assetModelId === asset.assetModelId)
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
        {/* Judul kolom. Lebarnya sama dengan sel di baris unit di bawah;
            ruang kanan disisakan untuk penanda "Unit ini" / panah. */}
        <div
          aria-hidden
          className="flex items-center gap-3 px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
        >
          <span className="w-14 shrink-0">{t("unitColUnit")}</span>
          <span className="w-20 shrink-0">{t("unitColSerial")}</span>
          <span className="w-28 shrink-0">{t("unitColCondition")}</span>
          <span className="min-w-0 flex-1">{t("unitColLocation")}</span>
          <span className="w-12 shrink-0" />
        </div>
        <div className="max-h-80 overflow-y-auto -mx-2 px-2 space-y-1.5">
          {units.map((u, i) => {
            const ini = u.id === asset.id;
            const lokasi = locationLabel(locations, u.locationId) || "-";
            const isi = (
              <>
                <span className="w-14 shrink-0 text-xs font-semibold">
                  {t("unitNumber", { n: i + 1 })}
                </span>
                <span className="font-mono text-xs font-semibold w-20 shrink-0 truncate">
                  {u.serialNumber || "-"}
                </span>
                <span className="w-28 shrink-0">
                  <StatusBadge
                    status={u.status}
                    label={assetStatus(u.status)}
                  />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {lokasi}
                  {u.owner ? ` · ${u.owner}` : ""}
                </span>
                {ini ? (
                  <span className="w-12 shrink-0 text-right text-[11px] font-semibold text-amber-300">
                    {t("thisUnit")}
                  </span>
                ) : (
                  <span className="flex w-12 shrink-0 justify-end">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </span>
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
