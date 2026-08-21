"use client";
import { useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import Link from "next/link";
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  CalendarRange,
  ArrowRight,
  QrCode,
  Plus,
  TrendingUp,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const { assets, bookings } = useStore();
  const { t, lang, formatDate, bookingStatus } = useT();
  const statsRef = useRef<HTMLDivElement>(null);

  const total = assets.length;
  const available = assets.filter((a) => a.status === "AVAILABLE").length;
  const checked = assets.filter((a) => a.status === "CHECKED_OUT").length;
  const overdue = bookings.filter((b) => b.status === "OVERDUE").length;
  const maintenance = assets.filter((a) => a.status === "MAINTENANCE").length;

  const recentBookings = [...bookings]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);
  const upcomingOverdue = bookings
    .filter((b) => b.status === "OVERDUE" || b.status === "ONGOING")
    .slice(0, 4);

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
                {t("dashboard")} • Garuda Food
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
            <Link href="/scanner" className="contents sm:block">
              <Button variant="outline" className="rounded-xl w-full sm:w-auto">
                <QrCode className="h-4 w-4" strokeWidth={1.5} /> {t("scanQr")}
              </Button>
            </Link>
          </div>
        </div>

        <div
          ref={statsRef}
          className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4"
        >
          <Card className="stat-card border shadow-lg backdrop-blur-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="p-3 pb-1.5 sm:p-6 sm:pb-2 flex flex-row items-start justify-between gap-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
                {t("totalAsset")}
              </CardTitle>
              <div className="h-7 w-7 sm:h-9 sm:w-9 shrink-0 rounded-lg sm:rounded-xl bg-[#1a365d] text-white flex items-center justify-center">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl font-extrabold">{total}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" strokeWidth={1.5} />{" "}
                {t("allAssetsTracked")}
              </p>
            </CardContent>
          </Card>

          <Card className="stat-card border shadow-lg backdrop-blur-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="p-3 pb-1.5 sm:p-6 sm:pb-2 flex flex-row items-start justify-between gap-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
                {t("available")}
              </CardTitle>
              <div className="h-7 w-7 sm:h-9 sm:w-9 shrink-0 rounded-lg sm:rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  strokeWidth={1.5}
                />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                {available}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                {Math.round((available / Math.max(1, total)) * 100)}
                {t("percentOfTotal")}
              </p>
            </CardContent>
          </Card>

          <Card className="stat-card border shadow-lg backdrop-blur-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="p-3 pb-1.5 sm:p-6 sm:pb-2 flex flex-row items-start justify-between gap-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
                {t("checkedOut")}
              </CardTitle>
              <div className="h-7 w-7 sm:h-9 sm:w-9 shrink-0 rounded-lg sm:rounded-xl bg-blue-500 text-white flex items-center justify-center">
                <CalendarRange
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  strokeWidth={1.5}
                />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-600">
                {checked}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                {t("currentlyBorrowed")}
              </p>
            </CardContent>
          </Card>

          <Card className="stat-card border shadow-lg backdrop-blur-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="p-3 pb-1.5 sm:p-6 sm:pb-2 flex flex-row items-start justify-between gap-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
                {t("overdue")}
              </CardTitle>
              <div className="h-7 w-7 sm:h-9 sm:w-9 shrink-0 rounded-lg sm:rounded-xl bg-red-500 text-white flex items-center justify-center">
                <AlertTriangle
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  strokeWidth={1.5}
                />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl font-extrabold text-red-600">
                {overdue}
              </div>
              <p className="text-[10px] sm:text-xs text-red-500 mt-0.5 sm:mt-1">
                {overdue > 0 ? t("needFollowUp") : t("noDelay")}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 backdrop-blur-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg anime-fade">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t("recentBookings")}</CardTitle>
              <Link
                href="/bookings"
                className="text-sm text-[#1a365d] dark:text-[#CBA12C] hover:underline flex items-center gap-1 font-medium"
              >
                {t("viewAll")}{" "}
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentBookings.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {t("noBookings")}
                </p>
              )}
              {recentBookings.map((b) => (
                <Link
                  key={b.id}
                  href={`/bookings/${b.id}`}
                  className="flex items-center gap-4 rounded-xl border bg-white dark:bg-slate-800 backdrop-blur p-4 hover:bg-white dark:hover:bg-slate-700 transition-all hover:shadow-md hover:scale-[1.01]"
                >
                  <div className="h-10 w-10 rounded-xl bg-[#1a365d] text-white flex items-center justify-center shrink-0">
                    <CalendarRange
                      className="h-4 w-4 sm:h-5 sm:w-5"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate text-sm">
                      {b.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {formatDate(b.fromDate)} → {formatDate(b.toDate)} •{" "}
                      {b.assetIds.length} {t("assets").toLowerCase()}
                    </div>
                  </div>
                  <Badge
                    variant={
                      b.status === "OVERDUE"
                        ? "destructive"
                        : b.status === "ONGOING"
                        ? "info"
                        : b.status === "RESERVED"
                        ? "warning"
                        : b.status === "COMPLETE"
                        ? "success"
                        : "secondary"
                    }
                  >
                    {bookingStatus(b.status)}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6 anime-fade">
            <Card className="backdrop-blur-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">
                  {t("needAttention")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingOverdue.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("allSafe")}
                  </p>
                )}
                {upcomingOverdue.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border-l-4 border-red-500 bg-red-50/80 dark:bg-red-950/20 p-3 backdrop-blur"
                  >
                    <div className="text-sm font-semibold truncate">
                      {b.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("due")} {formatDate(b.toDate)}
                    </div>
                    <Badge variant="destructive" className="mt-2 text-[11px]">
                      {bookingStatus(b.status)}
                    </Badge>
                  </div>
                ))}
                {maintenance > 0 && (
                  <div className="rounded-xl border bg-amber-50/80 dark:bg-amber-950/20 p-3 flex items-center gap-3 backdrop-blur">
                    <Wrench
                      className="h-5 w-5 text-amber-600"
                      strokeWidth={1.5}
                    />
                    <div>
                      <div className="text-sm font-medium">
                        {t("maintenanceCount", { count: maintenance })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("needsCheck")}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="backdrop-blur-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">{t("lastActivity")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-3 p-2 rounded-xl hover:bg-white/60 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mt-2 animate-pulse" />
                  <div>
                    <div className="font-medium">{t("assetCreated")}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("justNowBy")}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 p-2 rounded-xl hover:bg-white/60 transition-colors">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                  <div>
                    <div className="font-medium">{t("bookingOngoing")}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("yesterday")}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 p-2 rounded-xl hover:bg-white/60 transition-colors">
                  <div className="h-2 w-2 rounded-full bg-amber-500 mt-2" />
                  <div>
                    <div className="font-medium">{t("auditOpened")}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("twoDaysAgo")}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
