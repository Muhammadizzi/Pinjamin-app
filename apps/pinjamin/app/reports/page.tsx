"use client";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { locationLabel } from "@/lib/location-path";
import { Download, FileSpreadsheet, FileText, BarChart3 } from "lucide-react";
import Papa from "papaparse";

/** Urutan kondisi di laporan — dari paling sehat ke akhir masa pakai. */
const CONDITIONS = ["GOOD", "DAMAGED", "MAINTENANCE"] as const;

export default function ReportsPage() {
  const { assets, categories, locations } = useStore();
  const { t, lang, assetStatus } = useT();

  const countByStatus = (status: string) =>
    assets.filter((a) => a.status === status).length;

  /** Rakit CSV lalu picu unduhan. Dipakai tiga kartu, jadi tidak diulang. */
  const unduhCsv = (rows: Record<string, unknown>[], filename: string) => {
    const blob = new Blob([Papa.unparse(rows)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const data = categories.map((c) => ({
      category: c.name,
      total: assets.filter((a) => a.categoryId === c.id).length,
      baik: assets.filter((a) => a.categoryId === c.id && a.status === "GOOD")
        .length,
      rusak: assets.filter(
        (a) => a.categoryId === c.id && a.status === "DAMAGED"
      ).length,
    }));
    unduhCsv(data, "laporan-inventaris.csv");
  };

  const exportKondisiCsv = () =>
    unduhCsv(
      CONDITIONS.map((sKode) => ({
        kondisi: assetStatus(sKode),
        jumlah: countByStatus(sKode),
      })),
      "laporan-kondisi-aset.csv"
    );

  const exportLokasiCsv = () =>
    unduhCsv(
      locations.map((l) => ({
        lokasi: locationLabel(locations, l.id),
        total: assets.filter((a) => a.locationId === l.id).length,
        rusak: assets.filter(
          (a) => a.locationId === l.id && a.status === "DAMAGED"
        ).length,
      })),
      "laporan-aset-per-lokasi.csv"
    );

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const data = assets.map((a) => ({
      [t("colName")]: a.name,
      [t("colStatus")]: assetStatus(a.status),
      [t("colCategory")]: categories.find((c) => c.id === a.categoryId)?.name,
      [t("colLocation")]: locationLabel(locations, a.locationId),
      [t("colQr")]: a.qrCode,
      [t("colSerial")]: a.serialNumber,
      [t("ownerLabel")]: a.owner,
      [t("specLabel")]: a.spec,
      [t("colValue")]: a.value,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("sheetReport"));
    XLSX.writeFile(wb, "report-inventory.xlsx");
  };

  const exportPDF = async () => {
    // jsPDF 4 tidak lagi mengekspor konstruktor sebagai `default` — harus
    // named export. Bentuk lama (.default) menghasilkan objek, bukan kelas,
    // sehingga `new` melempar "jsPDF is not a constructor".
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFillColor(10, 34, 64);
    doc.rect(0, 0, 210, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("SIGAP — Garudafood", 10, 10);
    doc.setFontSize(10);
    doc.text(t("pdfReportTitle"), 10, 16);
    doc.setTextColor(0, 0, 0);
    let y = 30;
    doc.setFontSize(11);
    doc.text(t("pdfTotalAssets", { count: assets.length }), 10, y);
    y += 7;
    doc.setFontSize(10);
    categories.forEach((c) => {
      const total = assets.filter((a) => a.categoryId === c.id).length;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(t("pdfCategoryLine", { name: c.name, count: total }), 10, y);
      y += 6;
    });
    y += 4;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      t("pdfPrintedAt", {
        date: new Date().toLocaleString(lang === "id" ? "id-ID" : "en-US"),
      }),
      10,
      y
    );
    doc.save("laporan-inventaris.pdf");
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
                  onClick={exportCSV}
                  className="rounded-xl"
                >
                  <Download className="h-4 w-4" /> CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportExcel}
                  className="rounded-xl"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Excel
                </Button>
                <Button
                  size="sm"
                  onClick={exportPDF}
                  className="rounded-xl bg-[#e6ad1a] hover:bg-amber-400 text-[#0a2240] font-semibold"
                >
                  <FileText className="h-4 w-4" /> PDF
                </Button>
              </div>
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
                {CONDITIONS.map((kode) => {
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
            <CardContent className="space-y-2">
              {locations.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("noLocationsYet")}
                </p>
              )}
              {locations.slice(0, 8).map((l) => {
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
