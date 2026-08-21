"use client";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Download, FileSpreadsheet, FileText, BarChart3 } from "lucide-react";
import Papa from "papaparse";

export default function ReportsPage() {
  const { assets, bookings, categories, locations, custodians } = useStore();
  const { t, lang, assetStatus, bookingStatus } = useT();

  const exportCSV = (which: string) => {
    let data: any[] = [];
    let filename = "";
    if (which === "history") {
      data = bookings.map((b) => ({
        id: b.id,
        name: b.name,
        status: b.status,
        custodian: custodians.find((c) => c.id === b.custodianId)?.name,
        from: b.fromDate,
        to: b.toDate,
        assets: b.assetIds.length,
      }));
      filename = "laporan-riwayat-peminjaman.csv";
    } else if (which === "inventory") {
      data = categories.map((c) => ({
        category: c.name,
        total: assets.filter((a) => a.categoryId === c.id).length,
        available: assets.filter(
          (a) => a.categoryId === c.id && a.status === "AVAILABLE"
        ).length,
      }));
      filename = "laporan-inventaris.csv";
    } else if (which === "overdue") {
      data = bookings
        .filter((b) => b.status === "OVERDUE")
        .map((b) => ({
          booking: b.name,
          custodian: custodians.find((c) => c.id === b.custodianId)?.name,
          due: b.toDate,
          assets: b.assetIds.join(";"),
        }));
      filename = "laporan-overdue.csv";
    } else if (which === "utilisasi") {
      const counts: Record<string, number> = {};
      bookings.forEach((b) =>
        b.assetIds.forEach((aid) => (counts[aid] = (counts[aid] || 0) + 1))
      );
      data = assets
        .map((a) => ({
          asset: a.name,
          qr: a.qrCode,
          dipinjam: counts[a.id] || 0,
          status: a.status,
        }))
        .sort((a, b) => b.dipinjam - a.dipinjam);
      filename = "laporan-utilisasi.csv";
    }
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async (which: string) => {
    const XLSX = await import("xlsx");
    let data: any[] = [];
    if (which === "inventory")
      data = assets.map((a) => ({
        [t("colName")]: a.name,
        [t("colStatus")]: a.status,
        [t("colCategory")]: categories.find((c) => c.id === a.categoryId)?.name,
        [t("colLocation")]: locations.find((l) => l.id === a.locationId)?.name,
        [t("colQr")]: a.qrCode,
        [t("colValue")]: a.value,
      }));
    else
      data = bookings.map((b) => ({
        [t("colBooking")]: b.name,
        [t("colStatus")]: b.status,
        [t("colCustodian")]: custodians.find((c) => c.id === b.custodianId)
          ?.name,
        [t("colFrom")]: b.fromDate,
        [t("colTo")]: b.toDate,
      }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("sheetReport"));
    XLSX.writeFile(wb, `report-${which}.xlsx`);
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

  const utilization = (() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b) =>
      b.assetIds.forEach((aid) => (counts[aid] = (counts[aid] || 0) + 1))
    );
    return assets
      .map((a) => ({ ...a, count: counts[a.id] || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  })();

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
          <Card className="border-l-4 border-l-[#0a2240]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#0a2240]" />{" "}
                {t("reportHistoryTitle")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("reportHistorySub")}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                {t("reportHistoryStats", {
                  total: bookings.length,
                  complete: bookings.filter((b) => b.status === "COMPLETE")
                    .length,
                })}
                <span className="text-amber-600 font-medium">
                  {t("reportOverdueCount", {
                    count: bookings.filter((b) => b.status === "OVERDUE")
                      .length,
                  })}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportCSV("history")}
                  className="rounded-xl flex-1"
                >
                  <Download className="h-4 w-4" /> CSV
                </Button>
                <Button
                  size="sm"
                  onClick={() => exportExcel("history")}
                  className="rounded-xl flex-1 bg-[#0a2240] hover:bg-[#12345a] text-white"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Excel
                </Button>
              </div>
            </CardContent>
          </Card>

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
                  onClick={() => exportCSV("inventory")}
                  className="rounded-xl"
                >
                  <Download className="h-4 w-4" /> CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportExcel("inventory")}
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

          <Card className="border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="text-base text-red-700 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />{" "}
                {t("reportOverdueTitle")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("reportOverdueSub")}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {bookings.filter((b) => b.status === "OVERDUE").length === 0 ? (
                <p className="text-sm text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  {t("noOverdue")}
                </p>
              ) : (
                bookings
                  .filter((b) => b.status === "OVERDUE")
                  .map((b) => (
                    <div
                      key={b.id}
                      className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30 rounded-xl p-3 text-sm"
                    >
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {custodians.find((c) => c.id === b.custodianId)?.name} •{" "}
                        {t("dueOn", {
                          date: new Date(b.toDate).toLocaleDateString(
                            lang === "id" ? "id-ID" : "en-US"
                          ),
                        })}
                      </div>
                    </div>
                  ))
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportCSV("overdue")}
                className="rounded-xl w-full"
              >
                <Download className="h-4 w-4" /> {t("exportOverdueCsv")}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#0a2240]">
            <CardHeader>
              <CardTitle className="text-base">
                {t("reportUtilizationTitle")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("reportUtilizationSub")}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {utilization.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {assetStatus(a.status)} • {a.qrCode}
                    </div>
                  </div>
                  <Badge
                    variant={
                      a.count > 2
                        ? "success"
                        : a.count === 0
                        ? "secondary"
                        : "info"
                    }
                  >
                    {t("borrowedTimes", { count: a.count })}
                  </Badge>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportCSV("utilisasi")}
                className="rounded-xl w-full"
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
