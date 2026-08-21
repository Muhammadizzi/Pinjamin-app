"use client";
import Link from "next/link";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import {
  Plus,
  Search,
  CalendarRange,
  Trash2,
  Eye,
  Check,
  X,
} from "lucide-react";

export default function BookingsPage() {
  const { bookings, custodians, assets, updateBookingStatus, deleteBooking } =
    useStore();
  const { t, formatDate, bookingStatus } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const filtered = useMemo(() => {
    let r = [...bookings];
    if (q) r = r.filter((b) => b.name.toLowerCase().includes(q.toLowerCase()));
    if (status !== "ALL") r = r.filter((b) => b.status === status);
    return r.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [bookings, q, status]);

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t("bookings")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("bookingsSub", { count: filtered.length })}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/bookings/calendar">
              <Button variant="outline" className="rounded-xl">
                <CalendarRange className="h-4 w-4" /> {t("calendar")}
              </Button>
            </Link>
            <Link href="/bookings/new">
              <Button className="rounded-xl">
                <Plus className="h-4 w-4" /> {t("newBooking")}
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchBookings")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full sm:w-48"
            >
              <option value="ALL">{t("allStatus")}</option>
              <option value="DRAFT">{bookingStatus("DRAFT")}</option>
              <option value="RESERVED">{bookingStatus("RESERVED")}</option>
              <option value="ONGOING">{bookingStatus("ONGOING")}</option>
              <option value="OVERDUE">{bookingStatus("OVERDUE")}</option>
              <option value="COMPLETE">{bookingStatus("COMPLETE")}</option>
              <option value="CANCELLED">{bookingStatus("CANCELLED")}</option>
            </Select>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              {t("noBookingsYet")}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => {
              const cust = custodians.find((c) => c.id === b.custodianId);
              return (
                <Card key={b.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{b.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {cust?.name} • {formatDate(b.fromDate)} →{" "}
                          {formatDate(b.toDate)} •{" "}
                          {t("assetCountLabel", { count: b.assetIds.length })}
                        </div>
                        <div className="text-xs text-muted-foreground truncate hidden sm:block">
                          {b.description}
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
                        className="self-start sm:self-center"
                      >
                        {bookingStatus(b.status)}
                      </Badge>
                      <div className="flex gap-1 sm:flex-col lg:flex-row">
                        <Link href={`/bookings/${b.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {b.status === "ONGOING" && (
                          <Button
                            size="sm"
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                            onClick={() =>
                              ask({
                                title: t("confirmReturnBooking"),
                                description: t("confirmReturnBookingBody", {
                                  name: b.name,
                                }),
                                confirmLabel: t("yesReturn"),
                                variant: "primary",
                                action: () =>
                                  updateBookingStatus(b.id, "COMPLETE"),
                              })
                            }
                          >
                            <Check className="h-4 w-4" /> {t("returnAction")}
                          </Button>
                        )}
                        {b.status === "RESERVED" && (
                          <Button
                            size="sm"
                            className="rounded-xl"
                            onClick={() =>
                              ask({
                                title: t("confirmStartBooking"),
                                description: t("confirmStartBookingBody", {
                                  name: b.name,
                                }),
                                confirmLabel: t("yesStart"),
                                variant: "primary",
                                action: () =>
                                  updateBookingStatus(b.id, "ONGOING"),
                              })
                            }
                          >
                            <Check className="h-4 w-4" /> {t("startAction")}
                          </Button>
                        )}
                        {["DRAFT", "RESERVED"].includes(b.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              ask({
                                title: t("confirmCancelBooking"),
                                description: t("confirmCancelBookingBody", {
                                  name: b.name,
                                }),
                                confirmLabel: t("yesCancelBooking"),
                                action: () =>
                                  updateBookingStatus(b.id, "CANCELLED"),
                              })
                            }
                            className="text-amber-600"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            ask({
                              title: t("confirmDeleteBooking"),
                              description: t("confirmDeleteBookingBody", {
                                name: b.name,
                              }),
                              confirmLabel: t("yesDelete"),
                              action: () => deleteBooking(b.id),
                            })
                          }
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {confirmDialog}
    </AppShell>
  );
}
