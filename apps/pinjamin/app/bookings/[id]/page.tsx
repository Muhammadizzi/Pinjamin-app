"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useState } from "react";
import { ArrowLeft, Check, X, Trash2 } from "lucide-react";

export default function BookingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const {
    bookings,
    assets,
    custodians,
    kits,
    updateBookingStatus,
    deleteBooking,
  } = useStore();
  const b = bookings.find((x) => x.id === id);
  const [returnNote, setReturnNote] = useState("");
  if (!b)
    return (
      <AppShell>
        <div className="p-8 text-center">Booking tidak ditemukan</div>
      </AppShell>
    );
  const cust = custodians.find((c) => c.id === b.custodianId);
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/bookings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{b.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{b.description}</p>
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
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                <div className="text-xs text-muted-foreground">Peminjam</div>
                <div className="font-medium">
                  {cust?.name} — {cust?.department}
                </div>
                <div className="text-xs">{cust?.email}</div>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                <div className="text-xs text-muted-foreground">Periode</div>
                <div className="font-medium">
                  {formatDate(b.fromDate)} → {formatDate(b.toDate)}
                </div>
                <div className="text-xs">
                  Dibuat {formatDateTime(b.createdAt)} oleh {b.createdBy}
                </div>
              </div>
            </div>
            <div>
              <div className="font-medium mb-1">Aset ({b.assetIds.length})</div>
              {b.assetIds.map((aid) => {
                const a = assets.find((x) => x.id === aid);
                return a ? (
                  <Link
                    key={aid}
                    href={`/assets/${a.id}`}
                    className="block border rounded-xl p-2 mb-2 hover:bg-slate-50"
                  >
                    <div className="font-medium text-sm">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.qrCode} • {a.status}
                    </div>
                  </Link>
                ) : null;
              })}
              {b.kitIds.length > 0 && (
                <div className="mt-2">
                  <div className="font-medium mb-1">Kit</div>
                  {b.kitIds.map((kid) => {
                    const k = kits.find((x) => x.id === kid);
                    return k ? (
                      <div key={kid} className="border rounded-xl p-2 text-sm">
                        {k.name} ({k.assetIds.length} aset)
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
            <div>
              <div className="font-medium mb-1">Riwayat Status</div>
              <div className="space-y-1">
                {b.history.map((h, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="font-mono">{formatDateTime(h.at)}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {h.status}
                    </Badge>
                    <span className="text-muted-foreground">oleh {h.by}</span>
                  </div>
                ))}
              </div>
            </div>
            {b.status === "ONGOING" && (
              <div className="border-t pt-4 space-y-3">
                <Label>Kondisi Pengembalian</Label>
                <Textarea
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  placeholder="Baik, lengkap..."
                />
                <Button
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  onClick={() =>
                    updateBookingStatus(b.id, "COMPLETE", {
                      returnCondition: returnNote,
                    })
                  }
                >
                  <Check className="h-4 w-4" /> Tandai Dikembalikan (COMPLETE)
                </Button>
              </div>
            )}
            {b.status === "RESERVED" && (
              <Button
                className="w-full rounded-xl"
                onClick={() => updateBookingStatus(b.id, "ONGOING")}
              >
                <Check className="h-4 w-4" /> Mulai Peminjaman (ONGOING)
              </Button>
            )}
            {(b.status === "RESERVED" || b.status === "DRAFT") && (
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => updateBookingStatus(b.id, "CANCELLED")}
              >
                <X className="h-4 w-4" /> Batalkan (CANCELLED)
              </Button>
            )}
            {b.status === "COMPLETE" && b.returnCondition && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm">
                <div className="font-medium text-emerald-800">
                  Kondisi kembali:
                </div>
                <div>{b.returnCondition}</div>
                <div className="text-xs text-muted-foreground">
                  Dikembalikan{" "}
                  {b.actualReturnDate && formatDateTime(b.actualReturnDate)}
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full rounded-xl text-red-600"
              onClick={() => {
                if (confirm("Hapus booking?")) {
                  deleteBooking(b.id);
                  router.push("/bookings");
                }
              }}
            >
              <Trash2 className="h-4 w-4" /> Hapus Booking
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
