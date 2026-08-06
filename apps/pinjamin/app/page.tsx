"use client";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
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
} from "lucide-react";

export default function DashboardPage() {
  const { assets, bookings, audits } = useStore();

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

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Ringkasan aset & peminjaman — Garuda Food
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/assets/new">
              <Button className="rounded-xl">
                <Plus className="h-4 w-4" /> Aset Baru
              </Button>
            </Link>
            <Link href="/scanner">
              <Button variant="outline" className="rounded-xl">
                <QrCode className="h-4 w-4" /> Scan QR
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Aset
              </CardTitle>
              <Package className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{total}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Semua aset terdata
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tersedia
              </CardTitle>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {available}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((available / Math.max(1, total)) * 100)}% dari total
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dipinjam
              </CardTitle>
              <CalendarRange className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{checked}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Sedang dipinjam
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overdue
              </CardTitle>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{overdue}</div>
              <p className="text-xs text-red-500 mt-1">
                {overdue > 0
                  ? "Perlu tindak lanjut"
                  : "Tidak ada keterlambatan"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent bookings */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Booking Terbaru</CardTitle>
              <Link
                href="/bookings"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Lihat semua <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentBookings.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Belum ada booking
                </p>
              )}
              {recentBookings.map((b) => (
                <Link
                  key={b.id}
                  href={`/bookings/${b.id}`}
                  className="flex items-center gap-4 rounded-xl border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                    <CalendarRange className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{b.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {formatDate(b.fromDate)} → {formatDate(b.toDate)} •{" "}
                      {b.assetIds.length} aset
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
                    {b.status}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Perlu Perhatian</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingOverdue.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Semua booking aman.
                  </p>
                )}
                {upcomingOverdue.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30 p-3"
                  >
                    <div className="text-sm font-medium truncate">{b.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Jatuh tempo {formatDate(b.toDate)}
                    </div>
                    <Badge variant="destructive" className="mt-2 text-[11px]">
                      {b.status}
                    </Badge>
                  </div>
                ))}
                {maintenance > 0 && (
                  <div className="rounded-xl border p-3 flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-amber-500" />
                    <div>
                      <div className="text-sm font-medium">
                        {maintenance} aset maintenance
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Perlu pengecekan
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aktivitas Terakhir</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mt-2" />
                  <div>
                    <div className="font-medium">Aset “MacBook Pro” dibuat</div>
                    <div className="text-xs text-muted-foreground">
                      Baru saja oleh adminsystem
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                  <div>
                    <div className="font-medium">
                      Booking “Peminjaman Proyektor” ongoing
                    </div>
                    <div className="text-xs text-muted-foreground">Kemarin</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-2 w-2 rounded-full bg-amber-500 mt-2" />
                  <div>
                    <div className="font-medium">Audit Q1 dibuka</div>
                    <div className="text-xs text-muted-foreground">
                      2 hari lalu
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
