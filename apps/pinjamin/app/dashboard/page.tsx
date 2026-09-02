"use client";
import { useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import Link from "next/link";
import {
  Package,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Plus,
  TrendingUp,
  Sparkles,
} from "lucide-react";

function KartuAngka({
  label,
  nilai,
  catatan,
  ikon: Ikon,
  kelasIkon,
  kelasAngka,
  href,
}: {
  label: string;
  nilai: number;
  catatan: string;
  ikon: typeof Package;
  kelasIkon: string;
  kelasAngka?: string;
  href?: string;
}) {
  const isi = (
    <Card className="stat-card h-full border shadow-lg backdrop-blur-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all hover:-translate-y-1">
      <CardHeader className="p-3 pb-1.5 sm:p-6 sm:pb-2 flex flex-row items-start justify-between gap-2">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
          {label}
        </CardTitle>
        <div
          className={`h-7 w-7 sm:h-9 sm:w-9 shrink-0 rounded-lg sm:rounded-xl text-white flex items-center justify-center ${kelasIkon}`}
        >
          <Ikon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        <div
          className={`text-2xl sm:text-3xl font-extrabold ${kelasAngka || ""}`}
        >
          {nilai}
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
          {catatan}
        </p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{isi}</Link> : isi;
}

function RingkasKurang({ label, jumlah }: { label: string; jumlah: number }) {
  return (
    <div className="rounded-xl border p-2">
      <div
        className={`text-lg font-extrabold ${
          jumlah > 0 ? "text-amber-600 dark:text-amber-400" : ""
        }`}
      >
        {jumlah}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { assets } = useStore();
  const { t, lang, assetStatus } = useT();
  const statsRef = useRef<HTMLDivElement>(null);

  const total = assets.length;
  const good = assets.filter((a) => a.status === "GOOD").length;
  const damaged = assets.filter((a) => a.status === "DAMAGED").length;
  const maintenance = assets.filter((a) => a.status === "MAINTENANCE").length;

  /**
   * Aset yang datanya belum lengkap.
   *
   * Registri yang setengah terisi adalah masalah nyata di sistem seperti ini:
   * stikernya sudah tertempel dan bisa dipindai siapa saja, tapi halaman yang
   * muncul kosong melompong. Karena itu home menampilkannya sebagai daftar
   * kerja, bukan sekadar angka.
   */
  const tanpaPemilik = assets.filter((a) => !a.owner?.trim());
  const tanpaLokasi = assets.filter((a) => !a.locationId);
  const tanpaFoto = assets.filter((a) => !a.mainImage);
  const belumLengkap = assets
    .filter((a) => !a.owner?.trim() || !a.locationId || !a.mainImage)
    .slice(0, 5);

  useEffect(() => {
    (async () => {
      try {
        const { animate, stagger } = await import("animejs");
        if (statsRef.current) {
          animate(statsRef.current.querySelectorAll(".stat-card"), {
            translateY: [16, 0],
            opacity: [0, 1],
            duration: 650,
            delay: stagger(90),
            easing: "easeOutExpo",
          });
        }
        animate(".anime-fade", {
          opacity: [0, 1],
          translateY: [10, 0],
          duration: 600,
          delay: 350,
          easing: "easeOutExpo",
        });
      } catch {}
    })();
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#1a365d]/5 dark:bg-white/5 border border-[#1a365d]/10 dark:border-white/10 px-3 py-1.5 text-xs backdrop-blur">
              <Sparkles className="h-3 w-3 text-[#CBA12C]" strokeWidth={1.5} />
              <span className="font-semibold tracking-wide">
                {t("dashboard")} • Garudafood
              </span>
              <span className="h-3 w-px bg-slate-200 dark:bg-white/10" />
              <span className="text-muted-foreground">
                {t("todayIs", {
                  date: new Date().toLocaleDateString(
                    lang === "id" ? "id-ID" : "en-US",
                    { weekday: "long", day: "numeric", month: "short" }
                  ),
                })}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {t("dashboard")}
            </h1>
            {/* Subjudul disembunyikan di ponsel — tidak menambah informasi
                yang dicari, tapi mendorong statistik turun. */}
            <p className="hidden sm:block text-sm text-muted-foreground">
              {t("dashboardSub")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
            <Link href="/assets/new" className="contents sm:block">
              <Button className="rounded-xl w-full sm:w-auto bg-[#1a365d] hover:bg-[#243a5e] text-white shadow-lg">
                <Plus className="h-4 w-4" strokeWidth={1.5} /> {t("newAsset")}
              </Button>
            </Link>
          </div>
        </div>

        <div
          ref={statsRef}
          className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4"
        >
          <KartuAngka
            label={t("totalAsset")}
            nilai={total}
            catatan={t("allAssetsTracked")}
            ikon={Package}
            kelasIkon="bg-[#1a365d]"
          />
          <KartuAngka
            label={assetStatus("GOOD")}
            nilai={good}
            catatan={`${Math.round((good / Math.max(1, total)) * 100)}${t(
              "percentOfTotal"
            )}`}
            ikon={CheckCircle2}
            kelasIkon="bg-emerald-500"
            kelasAngka="text-emerald-600"
            href="/assets?status=GOOD"
          />
          <KartuAngka
            label={assetStatus("DAMAGED")}
            nilai={damaged}
            catatan={damaged > 0 ? t("needsRepair") : t("noDamagedAssets")}
            ikon={AlertTriangle}
            kelasIkon="bg-red-500"
            kelasAngka="text-red-600"
            href="/assets?status=DAMAGED"
          />
          <KartuAngka
            label={assetStatus("MAINTENANCE")}
            nilai={maintenance}
            catatan={t("needsCheck")}
            ikon={Wrench}
            kelasIkon="bg-amber-500"
            kelasAngka="text-amber-600"
            href="/assets?status=MAINTENANCE"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 anime-fade">
          <Card className="backdrop-blur-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">
                {t("needsCompleting")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("needsCompletingSub")}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <RingkasKurang
                  label={t("ownerLabel")}
                  jumlah={tanpaPemilik.length}
                />
                <RingkasKurang
                  label={t("location")}
                  jumlah={tanpaLokasi.length}
                />
                <RingkasKurang
                  label={t("assetPhoto")}
                  jumlah={tanpaFoto.length}
                />
              </div>

              {belumLengkap.length === 0 ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30">
                  {t("allAssetsComplete")}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {belumLengkap.map((a) => {
                    const kurang = [
                      !a.owner?.trim() && t("ownerLabel"),
                      !a.locationId && t("location"),
                      !a.mainImage && t("assetPhoto"),
                    ].filter(Boolean) as string[];
                    return (
                      <li key={a.id}>
                        <Link
                          href={`/assets/${a.id}/edit`}
                          className="flex items-center gap-3 rounded-xl border p-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {a.name}
                            </div>
                            <div className="truncate font-mono text-[11px] text-muted-foreground">
                              {a.qrCode}
                            </div>
                          </div>
                          <span className="shrink-0 text-[11px] text-amber-600 dark:text-amber-400">
                            {t("missingFields", { fields: kurang.join(", ") })}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">{t("needAttention")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {damaged === 0 && maintenance === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("allAssetsGood")}
                </p>
              ) : (
                assets
                  .filter(
                    (a) => a.status === "DAMAGED" || a.status === "MAINTENANCE"
                  )
                  // Rusak lebih mendesak daripada sedang diperbaiki.
                  .sort(
                    (a, b) =>
                      Number(b.status === "DAMAGED") -
                      Number(a.status === "DAMAGED")
                  )
                  .slice(0, 5)
                  .map((a) => (
                    <Link
                      key={a.id}
                      href={`/assets/${a.id}`}
                      className={`block rounded-xl border-l-4 p-2.5 transition-colors ${
                        a.status === "DAMAGED"
                          ? "border-red-500 bg-red-50/80 hover:bg-red-100/80 dark:bg-red-950/20"
                          : "border-amber-500 bg-amber-50/80 hover:bg-amber-100/80 dark:bg-amber-950/20"
                      }`}
                    >
                      <div className="truncate text-sm font-medium">
                        {a.name}
                      </div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground">
                        {a.qrCode} • {assetStatus(a.status)}
                      </div>
                    </Link>
                  ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
