"use client";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { locationLabel } from "@/lib/location-path";
import {
  KONDISI,
  barisAset,
  barisPerKategori,
  barisPerKondisi,
  barisPerLokasi,
  capTanggal,
  lebarKolom,
  type Baris,
  type LabelLaporan,
} from "@/lib/laporan";
import { Download, FileSpreadsheet, FileText, BarChart3 } from "lucide-react";
import Papa from "papaparse";

/**
 * Penanda UTF-8 di awal berkas CSV. Tanpanya Excel membaca CSV sebagai ANSI,
 * dan karakter seperti "›" pada jalur lokasi berubah menjadi "â€º".
 */
const BOM = "\uFEFF";

export default function ReportsPage() {
  const { assets, categories, locations, tags } = useStore();
  const { t, assetStatus, formatDate } = useT();

  const L: LabelLaporan = {
    kondisi: {
      GOOD: assetStatus("GOOD"),
      DAMAGED: assetStatus("DAMAGED"),
      MAINTENANCE: assetStatus("MAINTENANCE"),
    },
    kolomKondisi: t("colStatus"),
    kategori: t("colCategory"),
    lokasi: t("colLocation"),
    jumlah: t("lapJumlah"),
    persentase: t("lapPersen"),
    total: t("lapTotal"),
    no: t("lapNo"),
    kodeQr: t("colQr"),
    nama: t("colName"),
    pemakai: t("custodian"),
    spesifikasi: t("specLabel"),
    nomorSeri: t("colSerial"),
    tag: t("colTags"),
    deskripsi: t("colDescription"),
    terdaftar: t("lapTerdaftar"),
    tanpaKategori: t("lapTanpaKategori"),
    tanpaLokasi: t("lapTanpaLokasi"),
  };

  const countByStatus = (status: string) =>
    assets.filter((a) => a.status === status).length;

  const unduh = (blob: Blob, nama: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nama;
    a.click();
    URL.revokeObjectURL(url);
  };

  const unduhCsv = (rows: Baris[], nama: string) =>
    unduh(
      new Blob([BOM + Papa.unparse(rows)], { type: "text/csv;charset=utf-8" }),
      `${nama}-${capTanggal()}.csv`
    );

  const exportKategoriCsv = () =>
    unduhCsv(barisPerKategori(assets, categories, L), "laporan-per-kategori");
  const exportKondisiCsv = () =>
    unduhCsv(barisPerKondisi(assets, L), "laporan-per-kondisi");
  const exportLokasiCsv = () =>
    unduhCsv(barisPerLokasi(assets, locations, L), "laporan-per-lokasi");

  /**
   * Seluruh laporan dalam satu berkas Excel, satu lembar per bagian.
   * Tiap tabel diberi lebar kolom sesuai isinya dan filter di baris judul.
   */
  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const kondisi = barisPerKondisi(assets, L);
    const ringkasan = XLSX.utils.aoa_to_sheet([
      [t("lapJudul")],
      [t("lapDicetak"), formatDate(new Date().toISOString())],
      [t("lapTotalAset"), assets.length],
      [],
      Object.keys(kondisi[0]),
      ...kondisi.map((b) => Object.values(b)),
    ]);
    ringkasan["!cols"] = [{ wch: 32 }, { wch: 18 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ringkasan, t("lapSheetRingkasan"));

    const lembar = (rows: Baris[], nama: string) => {
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = lebarKolom(rows);
      if (ws["!ref"]) ws["!autofilter"] = { ref: ws["!ref"] };
      XLSX.utils.book_append_sheet(wb, ws, nama);
    };
    lembar(barisPerKategori(assets, categories, L), t("lapSheetKategori"));
    lembar(barisPerLokasi(assets, locations, L), t("lapSheetLokasi"));
    lembar(
      barisAset(assets, categories, locations, tags, L, (iso) =>
        formatDate(iso)
      ),
      t("lapSheetAset")
    );

    XLSX.writeFile(wb, `laporan-aset-${capTanggal()}.xlsx`);
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t("reports")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("reportsSub")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-[#e6ad1a]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#e6ad1a]" />{" "}
                {t("reportInventoryTitle")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("reportInventorySub")}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5 text-sm">
                {categories.map((c) => {
                  const total = assets.filter(
                    (a) => a.categoryId === c.id
                  ).length;
                  return (
                    <div
                      key={c.id}
                      className="flex justify-between items-center"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: c.color }}
                        />
                        {c.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="bg-[#0a2240] text-white"
                      >
                        {total}
                      </Badge>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportKategoriCsv}
                  className="rounded-xl"
                >
                  <Download className="h-4 w-4" /> CSV
                </Button>
                <Button
                  size="sm"
                  onClick={exportExcel}
                  title={t("lapExcelHint")}
                  className="rounded-xl bg-[#e6ad1a] hover:bg-amber-400 text-[#0a2240] font-semibold"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Excel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("lapExcelHint")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#0a2240]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#0a2240]" />{" "}
                {t("reportConditionTitle")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("reportConditionSub")}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                {KONDISI.map((kode) => {
                  const jumlah = countByStatus(kode);
                  const persen = Math.round(
                    (jumlah / Math.max(1, assets.length)) * 100
                  );
                  return (
                    <div key={kode} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <StatusBadge status={kode} label={assetStatus(kode)} />
                        <span className="tabular-nums text-muted-foreground">
                          {jumlah} • {persen}
                          {t("percentOfTotal")}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-[#0a2240] dark:bg-[#CBA12C]"
                          style={{ width: `${persen}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={exportKondisiCsv}
                className="w-full rounded-xl"
              >
                <Download className="h-4 w-4" /> {t("exportCsv")}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#0a2240]">
            <CardHeader>
              <CardTitle className="text-base">
                {t("reportLocationTitle")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("reportLocationSub")}
              </p>
            </CardHeader>
            {/* Dulu dipotong di 8 lokasi tanpa keterangan apa pun. Laporan yang
                menghilangkan baris diam-diam lebih berbahaya daripada laporan
                yang panjang — jadi semuanya ditampilkan, dan daftarnya yang
                digulung bila kebanyakan. */}
            <CardContent className="max-h-96 space-y-2 overflow-y-auto">
              {locations.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("noLocationsYet")}
                </p>
              )}
              {locations.map((l) => {
                const total = assets.filter(
                  (a) => a.locationId === l.id
                ).length;
                const rusak = assets.filter(
                  (a) => a.locationId === l.id && a.status === "DAMAGED"
                ).length;
                return (
                  <div key={l.id} className="flex items-center gap-3 py-1">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {locationLabel(locations, l.id) || l.name}
                      </div>
                      {rusak > 0 && (
                        <div className="text-xs text-red-600">
                          {rusak} {assetStatus("DAMAGED").toLowerCase()}
                        </div>
                      )}
                    </div>
                    <Badge variant={total > 0 ? "info" : "secondary"}>
                      {total}
                    </Badge>
                  </div>
                );
              })}
              <Button
                size="sm"
                variant="outline"
                onClick={exportLokasiCsv}
                className="w-full rounded-xl"
              >
                <Download className="h-4 w-4" /> {t("exportCsv")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
