"use client";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { Download, FileSpreadsheet, FileText, BarChart3 } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

export default function ReportsPage() {
  const { assets, bookings, categories, locations, custodians } = useStore();

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
  };

  const exportExcel = (which: string) => {
    let data: any[] = [];
    if (which === "inventory")
      data = assets.map((a) => ({
        Nama: a.name,
        Status: a.status,
        Kategori: categories.find((c) => c.id === a.categoryId)?.name,
        Lokasi: locations.find((l) => l.id === a.locationId)?.name,
        QR: a.qrCode,
        Nilai: a.value,
      }));
    else
      data = bookings.map((b) => ({
        Booking: b.name,
        Status: b.status,
        Peminjam: custodians.find((c) => c.id === b.custodianId)?.name,
        Pinjam: b.fromDate,
        Kembali: b.toDate,
      }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `report-${which}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Pinjamin - Laporan Inventaris", 10, 10);
    doc.setFontSize(10);
    let y = 20;
    doc.text(`Total Aset: ${assets.length}`, 10, y);
    y += 6;
    categories.forEach((c) => {
      const total = assets.filter((a) => a.categoryId === c.id).length;
      doc.text(`${c.name}: ${total} aset`, 10, y);
      y += 6;
    });
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
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Laporan & export mengikuti gaya shelf.nu
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-red-600" /> Riwayat
                Peminjaman
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Per periode, per aset, per custodian
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                {bookings.length} total booking •{" "}
                {bookings.filter((b) => b.status === "COMPLETE").length} selesai
                • {bookings.filter((b) => b.status === "OVERDUE").length}{" "}
                overdue
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportCSV("history")}
                  className="rounded-xl"
                >
                  <Download className="h-4 w-4" /> CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportExcel("history")}
                  className="rounded-xl"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" /> Inventaris Aset
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Jumlah per kategori/lokasi/status
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1 text-sm">
                {categories.map((c) => {
                  const total = assets.filter(
                    (a) => a.categoryId === c.id
                  ).length;
                  return (
                    <div key={c.id} className="flex justify-between">
                      <span>{c.name}</span>
                      <Badge variant="secondary">{total}</Badge>
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
                  variant="outline"
                  onClick={exportPDF}
                  className="rounded-xl"
                >
                  <FileText className="h-4 w-4" /> PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base text-red-600">Overdue</CardTitle>
              <p className="text-xs text-muted-foreground">
                Aset telat & pemegangnya
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {bookings.filter((b) => b.status === "OVERDUE").length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tidak ada overdue 🎉
                </p>
              ) : (
                bookings
                  .filter((b) => b.status === "OVERDUE")
                  .map((b) => (
                    <div key={b.id} className="border rounded-xl p-2 text-sm">
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {custodians.find((c) => c.id === b.custodianId)?.name} •
                        jatuh tempo{" "}
                        {new Date(b.toDate).toLocaleDateString("id-ID")}
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
                <Download className="h-4 w-4" /> Export Overdue CSV
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Utilisasi Aset</CardTitle>
              <p className="text-xs text-muted-foreground">
                Paling sering / jarang dipinjam
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {utilization.map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.status} • {a.qrCode}
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
                    {a.count}x dipinjam
                  </Badge>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportCSV("utilisasi")}
                className="rounded-xl w-full"
              >
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
