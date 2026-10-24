"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-client";
import {
  KONDISI,
  capTanggal,
  rekapLokasi,
  type LabelLaporan,
} from "@/lib/laporan";
import { FileSpreadsheet, FileText, BarChart3 } from "lucide-react";

export default function ReportsPage() {
  const { assets, categories, locations } = useStore();
  const { t, lang, assetStatus, formatDate, formatDateTime } = useT();
  const { user } = useAuth();
  const [menyusun, setMenyusun] = useState(false);
  const [gagalExcel, setGagalExcel] = useState(false);

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

  /**
   * Laporan siap cetak: lembar Ringkasan berkop dan lembar Daftar Aset.
   * Penyusunnya (dan ExcelJS) baru dimuat saat tombol ditekan — keduanya
   * cukup besar untuk tidak ikut membebani pembukaan halaman.
   */
  const exportExcel = async () => {
    setMenyusun(true);
    setGagalExcel(false);
    try {
      const { susunLaporanExcel } = await import("@/lib/laporan-excel");
      const logo = await fetch("/sigap-logo-kop.png")
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null);
      const sekarang = new Date();
      const tanggal = new Intl.DateTimeFormat(
        lang === "en" ? "en-GB" : "id-ID",
        { day: "numeric", month: "long", year: "numeric" }
      ).format(sekarang);
      const pembuat = user?.fullName || user?.username || "admin";

      const isi = await susunLaporanExcel(
        {
          aset: assets,
          kategori: categories,
          lokasi: locations,
          pembuat,
          tanggal: (iso) => formatDate(iso),
          logo,
        },
        {
          ...L,
          judul: t("lapCetakJudul"),
          keadaan: t("lapCetakKeadaan", { tanggal }),
          ringkasan: t("lapCetakRingkasan"),
          uraian: t("lapCetakUraian"),
          totalTerdaftar: t("lapCetakTotalTerdaftar"),
          bagianKategori: t("lapCetakKategori"),
          bagianLokasi: t("lapCetakLokasi"),
          tindakLanjut: t("lapCetakTindakLanjut"),
          tindakLanjutSub: t("lapCetakTindakLanjutSub"),
          tanpaTindakLanjut: t("lapCetakTanpaTindakLanjut"),
          kotaTanggal: t("lapCetakKotaTanggal", { tanggal }),
          dibuatOleh: t("lapCetakDibuatOleh"),
          mengetahui: t("lapCetakMengetahui"),
          dicetakOtomatis: t("lapCetakOtomatis", {
            waktu: formatDateTime(sekarang),
            nama: pembuat,
          }),
          halaman: t("lapCetakHalaman"),
          judulDaftar: t("lapCetakDaftarJudul"),
          sheetRingkasan: t("lapSheetRingkasan"),
          sheetAset: t("lapSheetAset"),
        }
      );
      unduh(
        new Blob([isi], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `laporan-aset-${capTanggal()}.xlsx`
      );
    } catch (e) {
      console.error("[laporan] Excel gagal disusun", e);
      setGagalExcel(true);
    } finally {
      setMenyusun(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Satu laporan saja: berkas Excel sudah memuat ringkasan kondisi,
            kategori, lokasi, dan daftar aset. Kartu di bawah hanya pratinjau
            di layar — dulu tiap kartu punya tombol CSV sendiri, isinya sama
            dengan bagian-bagian Excel dan cuma membuat bingung. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {t("reports")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("lapExcelHint")}</p>
            {gagalExcel && (
              <p className="mt-1 text-xs text-red-600">{t("lapExcelGagal")}</p>
            )}
          </div>
          <Button
            onClick={exportExcel}
            disabled={menyusun}
            className="shrink-0 rounded-xl bg-[#e6ad1a] hover:bg-amber-400 text-[#0a2240] font-semibold"
          >
            <FileSpreadsheet className="h-4 w-4" />{" "}
            {menyusun ? t("lapExcelMenyusun") : t("lapUnduh")}
          </Button>
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
                {categories.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("noCategoriesYet")}
                  </p>
                )}
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
              {rekapLokasi(assets, locations).map((b, i) => (
                <div
                  key={`${i}-${b.nama}`}
                  className="flex items-center gap-3 py-1"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{b.nama}</div>
                    {b.jumlah.DAMAGED > 0 && (
                      <div className="text-xs text-red-600">
                        {b.jumlah.DAMAGED}{" "}
                        {assetStatus("DAMAGED").toLowerCase()}
                      </div>
                    )}
                  </div>
                  <Badge variant={b.total > 0 ? "info" : "secondary"}>
                    {b.total}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
