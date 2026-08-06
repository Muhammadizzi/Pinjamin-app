"use client";
import { useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Package, CheckCircle2, AlertTriangle, Wrench, CalendarRange, ArrowRight, QrCode, Plus, TrendingUp, Sparkles } from "lucide-react";

export default function DashboardPage() {
  const { assets, bookings } = useStore();
  const statsRef = useRef<HTMLDivElement>(null);

  const total = assets.length;
  const available = assets.filter((a) => a.status === "AVAILABLE").length;
  const checked = assets.filter((a) => a.status === "CHECKED_OUT").length;
  const overdue = bookings.filter((b) => b.status === "OVERDUE").length;
  const maintenance = assets.filter((a) => a.status === "MAINTENANCE").length;

  const recentBookings = [...bookings].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 5);
  const upcomingOverdue = bookings.filter((b) => b.status === "OVERDUE" || b.status === "ONGOING").slice(0, 4);

  useEffect(() => {
    (async () => {
      try {
        const { animate, stagger } = await import("animejs");
        if (statsRef.current) {
          animate(statsRef.current.querySelectorAll(".stat-card"), {
            translateY: [16, 0],
            opacity: [0, 1],
            duration: 600,
            delay: stagger(80),
            easing: "easeOutExpo",
          });
        }
        animate(".anime-fade", {
          opacity: [0, 1],
          translateY: [8, 0],
          duration: 500,
          delay: 400,
          easing: "easeOutQuad",
        });
      } catch {}
    })();
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0a2240]/5 dark:bg-white/5 border border-[#0a2240]/10 px-3 py-1 text-xs backdrop-blur">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span className="font-medium">Dashboard • Garuda Food</span>
              <span className="h-3 w-px bg-slate-200 dark:bg-white/10" />
              <span className="text-muted-foreground">Hari ini {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Ringkasan aset & peminjaman — glass modern, responsif</p>
          </div>
          <div className="flex gap-2">
            <Link href="/assets/new">
              <Button className="rounded-xl bg-[#0a2240] hover:bg-[#12345a] text-white shadow-lg">
                <Plus className="h-4 w-4" /> Aset Baru
              </Button>
            </Link>
            <Link href="/scanner">
              <Button variant="outline" className="rounded-xl bg-white/70 backdrop-blur border-white/20 hover:bg-white">
                <QrCode className="h-4 w-4" /> Scan QR
              </Button>
            </Link>
          </div>
        </div>

        <div ref={statsRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="stat-card border-0 shadow-lg backdrop-blur-xl bg-white/70 dark:bg-slate-900/50 border-white/20 hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Aset</CardTitle>
              <div className="h-9 w-9 rounded-xl bg-[#0a2240] text-white flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold">{total}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Semua aset terdata
              </p>
            </CardContent>
          </Card>

          <Card className="stat-card border-0 shadow-lg backdrop-blur-xl bg-white/70 dark:bg-slate-900/50 border-white/20 hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tersedia</CardTitle>
              <div className="h-9 w-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-emerald-600">{available}</div>
              <p className="text-xs text-muted-foreground mt-1">{Math.round((available / Math.max(1, total)) * 100)}% dari total</p>
            </CardContent>
          </Card>

          <Card className="stat-card border-0 shadow-lg backdrop-blur-xl bg-white/70 dark:bg-slate-900/50 border-white/20 hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Dipinjam</CardTitle>
              <div className="h-9 w-9 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                <CalendarRange className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-blue-600">{checked}</div>
              <p className="text-xs text-muted-foreground mt-1">Sedang dipinjam</p>
            </CardContent>
          </Card>

          <Card className="stat-card border-0 shadow-lg backdrop-blur-xl bg-white/70 dark:bg-slate-900/50 border-white/20 hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
              <div className="h-9 w-9 rounded-xl bg-red-500 text-white flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-red-600">{overdue}</div>
              <p className="text-xs text-red-500 mt-1">{overdue > 0 ? "Perlu tindak lanjut" : "Tidak ada keterlambatan"}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 backdrop-blur-xl bg-white/70 dark:bg-slate-900/50 border-white/20 shadow-lg anime-fade">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Booking Terbaru</CardTitle>
              <Link href="/bookings" className="text-sm text-[#0a2240] dark:text-amber-200 hover:underline flex items-center gap-1 font-medium">
                Lihat semua <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentBookings.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Belum ada booking</p>}
              {recentBookings.map((b) => (
                <Link key={b.id} href={`/bookings/${b.id}`} className="flex items-center gap-4 rounded-xl border bg-white/60 dark:bg-slate-800/50 backdrop-blur p-4 hover:bg-white dark:hover:bg-slate-800 transition-all hover:shadow-md hover:scale-[1.01]">
                  <div className="h-10 w-10 rounded-xl bg-[#0a2240] text-white flex items-center justify-center shrink-0">
                    <CalendarRange className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate text-sm">{b.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {formatDate(b.fromDate)} → {formatDate(b.toDate)} • {b.assetIds.length} aset
                    </div>
                  </div>
                  <Badge variant={b.status === "OVERDUE" ? "destructive" : b.status === "ONGOING" ? "info" : b.status === "RESERVED" ? "warning" : b.status === "COMPLETE" ? "success" : "secondary"}>{b.status}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6 anime-fade">
            <Card className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/50 border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Perlu Perhatian</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingOverdue.length === 0 && <p className="text-sm text-muted-foreground">Semua booking aman 🎉</p>}
                {upcomingOverdue.map((b) => (
                  <div key={b.id} className="rounded-xl border-l-4 border-red-500 bg-red-50/80 dark:bg-red-950/30 p-3 backdrop-blur">
                    <div className="text-sm font-semibold truncate">{b.name}</div>
                    <div className="text-xs text-muted-foreground">Jatuh tempo {formatDate(b.toDate)}</div>
                    <Badge variant="destructive" className="mt-2 text-[11px]">
                      {b.status}
                    </Badge>
                  </div>
                ))}
                {maintenance > 0 && (
                  <div className="rounded-xl border bg-amber-50/80 dark:bg-amber-950/20 p-3 flex items-center gap-3 backdrop-blur">
                    <Wrench className="h-5 w-5 text-amber-500" />
                    <div>
                      <div className="text-sm font-medium">{maintenance} aset maintenance</div>
                      <div className="text-xs text-muted-foreground">Perlu pengecekan</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/50 border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Aktivitas Terakhir</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-3 p-2 rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mt-2 animate-pulse" />
                  <div>
                    <div className="font-medium">Aset “MacBook Pro” dibuat</div>
                    <div className="text-xs text-muted-foreground">Baru saja oleh adminsystem</div>
                  </div>
                </div>
                <div className="flex gap-3 p-2 rounded-xl hover:bg-white/50 transition-colors">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                  <div>
                    <div className="font-medium">Booking “Peminjaman Proyektor” ongoing</div>
                    <div className="text-xs text-muted-foreground">Kemarin</div>
                  </div>
                </div>
                <div className="flex gap-3 p-2 rounded-xl hover:bg-white/50 transition-colors">
                  <div className="h-2 w-2 rounded-full bg-amber-500 mt-2" />
                  <div>
                    <div className="font-medium">Audit Q1 dibuka</div>
                    <div className="text-xs text-muted-foreground">2 hari lalu</div>
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
