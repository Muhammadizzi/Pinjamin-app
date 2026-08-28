"use client";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import Papa from "papaparse";

export default function ReportsPage() {
  const { assets, categories, locations } = useStore();
  const { t, lang } = useT();

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
    const filename = "laporan-inventaris.csv";
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const data = assets.map((a) => ({
      [t("colName")]: a.name,
      [t("colStatus")]: a.status,
      [t("colCategory")]: categories.find((c) => c.id === a.categoryId)?.name,
      [t("colLocation")]: locations.find((l) => l.id === a.locationId)?.name,
      [t("colQr")]: a.qrCode,
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

        <div className="grid grid-cols-1 gap-4">
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
        </div>
      </div>
    </AppShell>
  );
}
