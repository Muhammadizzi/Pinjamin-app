"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-client";
import {
  ISSUE_UNSET,
  TICKET_STATUSES,
  WORKING_ORDERS,
  type TicketPriority,
  type LaporanTrafficUnit,
  type TicketStatus,
  type TrafficBulanan,
  type TrafficHari,
  type WorkingOrder,
} from "@/lib/ticket-shared";
import { BarChart3, FileSpreadsheet, Loader2, RefreshCw } from "lucide-react";

/**
 * Warna tiap unit di grafik. Urutan tetap GA → Utility → IT dan warnanya
 * mengikuti unit, bukan peringkat — unit yang sepi bulan ini tidak berganti
 * warna. Tiga slot pertama palet kategorikal versi gelap; lolos uji buta warna
 * (ΔE CVD ≥ 9,4) dan kontras ≥ 3:1 di latar kartu #1a2d4a.
 */
const WARNA_UNIT: Record<WorkingOrder, string> = {
  GA: "#3987e5",
  Utility: "#d95926",
  IT: "#199e70",
};

/** Mendesak dulu — yang paling perlu dilirik ada di kiri. */
const URUTAN_PRIORITAS: TicketPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];

/** Tinggi area plot grafik harian, px. */
const TINGGI_PLOT = 200;

/** Batas atas sumbu Y yang bulat, dan jarak antar garis bantunya. */
function skalaY(maks: number): { atas: number; langkah: number } {
  if (maks <= 4) return { atas: 4, langkah: 1 };
  for (const langkah of [1, 2, 5, 10, 20, 50, 100, 200, 500]) {
    if (maks / langkah <= 5) {
      return { atas: Math.ceil(maks / langkah) * langkah, langkah };
    }
  }
  return { atas: Math.ceil(maks / 1000) * 1000, langkah: 1000 };
}

const totalHari = (h: TrafficHari) =>
  WORKING_ORDERS.reduce((n, wo) => n + h[wo], 0);

export default function TrafficPage() {
  const { t, lang, ticketStatus, ticketPriority, issueType, formatDateTime } =
    useT();
  const { user } = useAuth();
  const [data, setData] = useState<
    (TrafficBulanan & { unitSaya?: string }) | null
  >(null);
  const [menyusun, setMenyusun] = useState(false);
  const [gagalUnduh, setGagalUnduh] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gagal, setGagal] = useState(false);
  const [sorot, setSorot] = useState<number | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/tickets/traffic");
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setGagal(false);
    } catch {
      setGagal(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const locale = lang === "en" ? "en-GB" : "id-ID";

  /** "1–10 November 2026" — rentang bulan berjalan sampai hari ini. */
  const periode = useMemo(() => {
    if (!data) return "";
    const hariIni = new Date(`${data.hariIni}T12:00:00+07:00`);
    const teks = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(hariIni);
    return hariIni.getUTCDate() === 1 ? teks : `1–${teks}`;
  }, [data, locale]);

  const formatTanggal = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "Asia/Jakarta",
      }),
    [locale]
  );
  const labelTanggal = (tanggal: string) =>
    formatTanggal.format(new Date(`${tanggal}T12:00:00+07:00`));

  /**
   * Laporan Excel untuk unit admin ini saja — daftar tiketnya diambil dari
   * endpoint terpisah yang mengunci unit dari sesi. ExcelJS dan penyusunnya
   * baru dimuat saat tombol ditekan.
   */
  const unduhLaporan = async () => {
    setMenyusun(true);
    setGagalUnduh(false);
    try {
      const res = await fetch("/api/tickets/traffic/unit");
      if (!res.ok) throw new Error(String(res.status));
      const laporan: LaporanTrafficUnit = await res.json();
      const { susunLaporanTraffic } = await import(
        "@/lib/laporan-traffic-excel"
      );
      const sekarang = new Date();
      const tanggalPanjang = (d: Date) =>
        new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Jakarta",
        }).format(d);
      const awal = new Date(`${laporan.hariIni}T12:00:00+07:00`);
      const rentang =
        awal.getUTCDate() === 1
          ? tanggalPanjang(awal)
          : `1–${tanggalPanjang(awal)}`;
      const unit = laporan.workingOrder;
      const pembuat = user?.fullName || user?.username || "admin";

      const isi = await susunLaporanTraffic(
        {
          laporan,
          pembuat,
          tanggalJam: (iso) => formatDateTime(iso),
          tanggalHari: (tgl) =>
            new Intl.DateTimeFormat(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Asia/Jakarta",
            }).format(new Date(`${tgl}T12:00:00+07:00`)),
        },
        {
          judul: t("lapTrafJudul", { unit: unit.toUpperCase() }),
          kopUnit: t("lapTrafKopUnit", { unit: unit.toUpperCase() }),
          periode: t("lapTrafPeriode", { rentang }),
          ringkasan: t("lapTrafRingkasan"),
          uraian: t("lapCetakUraian"),
          jumlah: t("lapJumlah"),
          persentase: t("lapPersen"),
          totalMasuk: t("lapTrafTotal"),
          bagianJenis: t("lapTrafJenis"),
          bagianPrioritas: t("lapTrafPrioritas"),
          no: t("lapNo"),
          total: t("lapTotal"),
          status: Object.fromEntries(
            TICKET_STATUSES.map((st) => [st, ticketStatus(st)])
          ) as Record<TicketStatus, string>,
          prioritas: Object.fromEntries(
            URUTAN_PRIORITAS.map((p) => [p, ticketPriority(p)])
          ) as Record<TicketPriority, string>,
          jenis: (kode) => issueType(kode),
          kolomJenis: t("lapTrafKolomJenis"),
          kolomNomor: t("lapTrafKolomNomor"),
          kolomMasuk: t("lapTrafKolomMasuk"),
          kolomSubjek: t("lapTrafKolomSubjek"),
          kolomPrioritas: t("lapTrafKolomPrioritas"),
          kolomStatus: t("lapTrafKolomStatus"),
          kolomSelesai: t("lapTrafKolomSelesai"),
          kolomTanggal: t("lapTrafKolomTanggal"),
          tanpaTiket: t("trafficEmpty"),
          kotaTanggal: t("lapCetakKotaTanggal", {
            tanggal: tanggalPanjang(sekarang),
          }),
          dibuatOleh: t("lapCetakDibuatOleh"),
          mengetahui: t("lapCetakMengetahui"),
          dicetakOtomatis: t("lapCetakOtomatis", {
            waktu: formatDateTime(sekarang),
            nama: pembuat,
          }),
          halaman: t("lapCetakHalaman"),
          judulDaftar: t("lapTrafDaftarJudul", { unit: unit.toUpperCase() }),
          judulHarian: t("lapTrafHarianJudul", { unit: unit.toUpperCase() }),
          sheetRingkasan: t("lapSheetRingkasan"),
          sheetTiket: t("lapTrafSheetTiket"),
          sheetHarian: t("lapTrafSheetHarian"),
        }
      );

      const url = URL.createObjectURL(
        new Blob([isi], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `traffic-helpdesk-${unit.toLowerCase()}-${
        laporan.bulan
      }.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[traffic] Excel gagal disusun", e);
      setGagalUnduh(true);
    } finally {
      setMenyusun(false);
    }
  };

  const selesaiSemua = data
    ? WORKING_ORDERS.reduce((n, wo) => n + data.unit[wo].status.RESOLVED, 0)
    : 0;

  const maksHarian = data ? Math.max(0, ...data.harian.map(totalHari)) : 0;
  const { atas, langkah } = skalaY(maksHarian);
  const garisY = Array.from(
    { length: atas / langkah + 1 },
    (_, i) => i * langkah
  );

  return (
    <AppShell>
      <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-amber-300" />
            {t("trafficTitle")}
            {periode && (
              <span className="rounded-full border border-[#CBA12C]/40 bg-[#CBA12C]/15 px-2.5 py-0.5 text-xs font-bold text-[#CBA12C]">
                {periode}
              </span>
            )}
          </h1>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={refreshing}
              className="rounded-xl flex-1 sm:flex-none"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {t("reload")}
            </Button>
            {data?.unitSaya && (
              <Button
                size="sm"
                onClick={unduhLaporan}
                disabled={menyusun}
                className="rounded-xl flex-1 sm:flex-none bg-[#e6ad1a] hover:bg-amber-400 text-[#0a2240] font-semibold"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {menyusun
                  ? t("lapExcelMenyusun")
                  : t("trafficDownload", { unit: data.unitSaya })}
              </Button>
            )}
          </div>
        </div>

        {gagalUnduh && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {t("lapExcelGagal")}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            {t("trafficLoading")}
          </div>
        ) : !data ? (
          <Card>
            <CardContent className="py-16 text-center text-slate-400">
              {t("trafficLoadFailed")}
            </CardContent>
          </Card>
        ) : (
          <>
            {gagal && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {t("trafficLoadFailed")}
              </div>
            )}

            {/* Ringkasan: semua unit + per unit */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="text-xs text-slate-400">
                    {t("trafficAllUnits")}
                  </div>
                  <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-white leading-none">
                    {data.total}
                  </div>
                  <div className="mt-1.5 text-xs text-slate-400">
                    {t("trafficResolvedOf", { n: selesaiSemua })}
                  </div>
                </CardContent>
              </Card>
              {WORKING_ORDERS.map((wo) => (
                <Card key={wo}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: WARNA_UNIT[wo] }}
                      />
                      {wo}
                    </div>
                    <div className="mt-1 text-2xl sm:text-3xl font-extrabold text-white leading-none">
                      {data.unit[wo].total}
                    </div>
                    <div className="mt-1.5 text-xs text-slate-400">
                      {t("trafficResolvedOf", {
                        n: data.unit[wo].status.RESOLVED,
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Kendala yang paling sering dilaporkan, per unit */}
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">
                {t("trafficByIssue")}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {WORKING_ORDERS.map((wo) => (
                  <JenisKendalaUnit
                    key={wo}
                    wo={wo}
                    jenis={data.unit[wo].jenis}
                    label={issueType}
                    kosong={t("trafficEmpty")}
                  />
                ))}
              </div>
            </div>

            {/* Grafik tiket masuk per hari, ditumpuk per unit */}
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base text-white">
                    {t("trafficDaily")}
                  </CardTitle>
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    {WORKING_ORDERS.map((wo) => (
                      <span key={wo} className="flex items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ background: WARNA_UNIT[wo] }}
                        />
                        {wo}
                      </span>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {data.total === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-400">
                    {t("trafficEmpty")}
                  </div>
                ) : (
                  <div className="relative">
                    {/* Tooltip hari yang disorot */}
                    {sorot !== null && data.harian[sorot] && (
                      <div
                        className="pointer-events-none absolute -top-1 z-10 min-w-[140px] rounded-xl border border-[#35507c] bg-[#0f1d33] px-3 py-2 text-xs shadow-lg"
                        style={{
                          left: `calc(2rem + (100% - 2rem) * ${
                            (sorot + 0.5) / data.harian.length
                          })`,
                          transform: `translate(${
                            sorot < data.harian.length / 4
                              ? "-15%"
                              : sorot > (data.harian.length * 3) / 4
                              ? "-85%"
                              : "-50%"
                          }, -100%)`,
                        }}
                      >
                        <div className="font-semibold text-white">
                          {labelTanggal(data.harian[sorot].tanggal)}
                        </div>
                        {WORKING_ORDERS.map((wo) => (
                          <div
                            key={wo}
                            className="mt-1 flex items-center justify-between gap-4 text-slate-300"
                          >
                            <span className="flex items-center gap-1.5">
                              <span
                                aria-hidden="true"
                                className="h-2 w-2 rounded-full"
                                style={{ background: WARNA_UNIT[wo] }}
                              />
                              {wo}
                            </span>
                            <span className="tabular-nums text-white">
                              {data.harian[sorot][wo]}
                            </span>
                          </div>
                        ))}
                        <div className="mt-1.5 flex justify-between gap-4 border-t border-[#243a5e] pt-1.5 text-slate-300">
                          <span>{t("trafficColTotal")}</span>
                          <span className="tabular-nums font-semibold text-white">
                            {totalHari(data.harian[sorot])}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="relative" style={{ height: TINGGI_PLOT }}>
                      {/* Garis bantu + angka sumbu Y */}
                      {garisY.map((v) => (
                        <div
                          key={v}
                          aria-hidden="true"
                          className="absolute left-0 right-0 flex items-center"
                          style={{ bottom: (v / atas) * TINGGI_PLOT }}
                        >
                          <span className="w-8 -translate-y-px pr-2 text-right text-[10px] tabular-nums text-slate-500">
                            {v}
                          </span>
                          <span
                            className={`h-px flex-1 ${
                              v === 0 ? "bg-[#35507c]" : "bg-[#243a5e]"
                            }`}
                          />
                        </div>
                      ))}

                      {/* Kolom per hari */}
                      <div
                        className="absolute inset-y-0 left-8 right-0 flex items-end"
                        onMouseLeave={() => setSorot(null)}
                      >
                        {data.harian.map((h, i) => {
                          const isi = WORKING_ORDERS.filter((wo) => h[wo] > 0);
                          return (
                            <div
                              key={h.tanggal}
                              tabIndex={0}
                              role="img"
                              aria-label={`${labelTanggal(
                                h.tanggal
                              )}: ${WORKING_ORDERS.map(
                                (wo) => `${wo} ${h[wo]}`
                              ).join(", ")}`}
                              onMouseEnter={() => setSorot(i)}
                              onFocus={() => setSorot(i)}
                              onBlur={() => setSorot(null)}
                              className={`flex h-full flex-1 cursor-default items-end justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#CBA12C] ${
                                sorot === i ? "bg-white/5" : ""
                              }`}
                            >
                              {/* GA di dasar, lalu Utility, IT di puncak.
                                  Celah 2px memisahkan segmen. */}
                              <div className="flex w-[70%] max-w-[24px] flex-col-reverse gap-[2px]">
                                {isi.map((wo, k) => (
                                  <div
                                    key={wo}
                                    className={
                                      k === isi.length - 1
                                        ? "rounded-t-[4px]"
                                        : ""
                                    }
                                    style={{
                                      height: Math.max(
                                        2,
                                        (h[wo] / atas) * TINGGI_PLOT - 2
                                      ),
                                      background: WARNA_UNIT[wo],
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tanggal di sumbu X: tanggal 1, kelipatan 5, dan hari ini */}
                    <div className="mt-1.5 ml-8 flex" aria-hidden="true">
                      {data.harian.map((h, i) => {
                        const d = i + 1;
                        const tampil =
                          d === 1 ||
                          d % 5 === 0 ||
                          i === data.harian.length - 1;
                        return (
                          <div
                            key={h.tanggal}
                            className="flex-1 whitespace-nowrap text-center text-[10px] tabular-nums text-slate-500"
                          >
                            {tampil ? d : ""}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rincian per status dan per prioritas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TabelRekap
                judul={t("trafficByStatus")}
                kolom={TICKET_STATUSES.map((s) => ({
                  kunci: s,
                  label: ticketStatus(s),
                }))}
                nilai={(wo, k) => data.unit[wo].status[k as TicketStatus]}
                total={(wo) => data.unit[wo].total}
                t={t}
              />
              <TabelRekap
                judul={t("trafficByPriority")}
                kolom={URUTAN_PRIORITAS.map((p) => ({
                  kunci: p,
                  label: ticketPriority(p),
                }))}
                nilai={(wo, k) => data.unit[wo].prioritas[k as TicketPriority]}
                total={(wo) => data.unit[wo].total}
                t={t}
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

/** Satu baris: nama jenis, batang sepanjang jumlahnya, lalu angkanya. */
function BarisJenis({
  teks,
  n,
  maks,
  warna,
}: {
  teks: string;
  n: number;
  maks: number;
  warna: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-xs">
      <span className="truncate text-slate-300" title={teks}>
        {teks}
      </span>
      <span className="flex items-center gap-2">
        {n > 0 && (
          <span
            aria-hidden="true"
            className="h-2.5 rounded-r-[4px]"
            style={{ width: `${(n / maks) * 85}%`, background: warna }}
          />
        )}
        <span className="tabular-nums text-white">{n}</span>
      </span>
    </div>
  );
}

/**
 * Batang horizontal berperingkat untuk satu unit: jenis terbanyak di atas,
 * satu warna (warna unitnya). "Belum ditentukan" selalu paling bawah dan
 * abu-abu — ia bukan jenis kendala, melainkan tiket yang belum dipilahkan
 * admin, jadi tidak boleh tampil bersaing dengan jenis yang sebenarnya.
 */
function JenisKendalaUnit({
  wo,
  jenis,
  label,
  kosong,
}: {
  wo: WorkingOrder;
  jenis: Record<string, number>;
  label: (kode: string) => string;
  kosong: string;
}) {
  const baris = Object.entries(jenis)
    .filter(([k]) => k !== ISSUE_UNSET)
    .map(([k, n], urutan) => ({ k, n, urutan }))
    .sort((a, b) => b.n - a.n || a.urutan - b.urutan);
  const belum = jenis[ISSUE_UNSET] ?? 0;
  const maks = Math.max(1, belum, ...baris.map((b) => b.n));
  const total = baris.reduce((n, b) => n + b.n, 0) + belum;

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="flex items-center gap-1.5 text-base text-white">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: WARNA_UNIT[wo] }}
          />
          {wo}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {total === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">
            {kosong}
          </div>
        ) : (
          <>
            {baris.map((b) => (
              <BarisJenis
                key={b.k}
                teks={label(b.k)}
                n={b.n}
                maks={maks}
                warna={WARNA_UNIT[wo]}
              />
            ))}
            {belum > 0 && (
              <div className="border-t border-[#243a5e] pt-2">
                <BarisJenis
                  teks={label(ISSUE_UNSET)}
                  n={belum}
                  maks={maks}
                  warna="#64748b"
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TabelRekap({
  judul,
  kolom,
  nilai,
  total,
  t,
}: {
  judul: string;
  kolom: { kunci: string; label: string }[];
  nilai: (wo: WorkingOrder, kunci: string) => number;
  total: (wo: WorkingOrder) => number;
  t: ReturnType<typeof useT>["t"];
}) {
  const jumlahKolom = (kunci: string) =>
    WORKING_ORDERS.reduce((n, wo) => n + nilai(wo, kunci), 0);
  const jumlahTotal = WORKING_ORDERS.reduce((n, wo) => n + total(wo), 0);

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-base text-white">{judul}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#243a5e] text-xs text-slate-400">
              <th className="py-2 pr-3 text-left font-medium">
                {t("trafficUnit")}
              </th>
              {kolom.map((k) => (
                <th
                  key={k.kunci}
                  className="whitespace-nowrap px-2 py-2 text-right font-medium"
                >
                  {k.label}
                </th>
              ))}
              <th className="py-2 pl-2 text-right font-medium">
                {t("trafficColTotal")}
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {WORKING_ORDERS.map((wo) => (
              <tr key={wo} className="border-b border-[#243a5e]/60">
                <td className="py-2 pr-3">
                  <span className="flex items-center gap-1.5 text-slate-200">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: WARNA_UNIT[wo] }}
                    />
                    {wo}
                  </span>
                </td>
                {kolom.map((k) => (
                  <td
                    key={k.kunci}
                    className="px-2 py-2 text-right text-slate-300"
                  >
                    {nilai(wo, k.kunci)}
                  </td>
                ))}
                <td className="py-2 pl-2 text-right font-semibold text-white">
                  {total(wo)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="py-2 pr-3 font-semibold text-white">
                {t("trafficColTotal")}
              </td>
              {kolom.map((k) => (
                <td
                  key={k.kunci}
                  className="px-2 py-2 text-right font-semibold text-white"
                >
                  {jumlahKolom(k.kunci)}
                </td>
              ))}
              <td className="py-2 pl-2 text-right font-semibold text-white">
                {jumlahTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
