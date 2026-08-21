"use client";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CalendarPage() {
  const { bookings } = useStore();
  const { t, lang, bookingStatus } = useT();
  const [cur, setCur] = useState(() => new Date());
  const year = cur.getFullYear();
  const month = cur.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const prev = () => setCur(new Date(year, month - 1, 1));
  const next = () => setCur(new Date(year, month + 1, 1));

  const byDay = useMemo(() => {
    const map: Record<string, typeof bookings> = {};
    bookings.forEach((b) => {
      const from = new Date(b.fromDate);
      const to = new Date(b.toDate);
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() === month && d.getFullYear() === year) {
          const key = d.getDate();
          if (!map[key]) map[key] = [];
          map[key].push(b);
        }
      }
    });
    return map;
  }, [bookings, month, year]);

  return (
    <AppShell>
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {t("bookingCalendarTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("bookingCalendarSub")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-semibold min-w-[140px] text-center">
              {cur.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
                month: "long",
                year: "numeric",
              })}
            </div>
            <Button variant="outline" size="icon" onClick={next}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground mb-2">
              <div>{t("dowSun")}</div>
              <div>{t("dowMon")}</div>
              <div>{t("dowTue")}</div>
              <div>{t("dowWed")}</div>
              <div>{t("dowThu")}</div>
              <div>{t("dowFri")}</div>
              <div>{t("dowSat")}</div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={"empty-" + i} className="h-24" />
              ))}
              {days.map((d) => {
                const list = byDay[d] || [];
                return (
                  <div
                    key={d}
                    className="h-24 rounded-xl border bg-white dark:bg-slate-900 p-1 overflow-hidden flex flex-col"
                  >
                    <div className="text-xs font-bold">{d}</div>
                    <div className="flex-1 space-y-1 overflow-auto">
                      {list.slice(0, 3).map((b) => (
                        <Link
                          key={b.id}
                          href={`/bookings/${b.id}`}
                          className="block text-[10px] truncate rounded px-1 py-0.5 text-white"
                          style={{
                            background:
                              b.status === "OVERDUE"
                                ? "#ef4444"
                                : b.status === "ONGOING"
                                ? "#3b82f6"
                                : b.status === "RESERVED"
                                ? "#f59e0b"
                                : "#10b981",
                          }}
                        >
                          {b.name}
                        </Link>
                      ))}
                      {list.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">
                          {t("moreCount", { count: list.length - 3 })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("legend")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs">
            <Badge className="bg-blue-500">{bookingStatus("ONGOING")}</Badge>
            <Badge className="bg-amber-500">{bookingStatus("RESERVED")}</Badge>
            <Badge className="bg-red-500">{bookingStatus("OVERDUE")}</Badge>
            <Badge className="bg-emerald-500">
              {bookingStatus("COMPLETE")}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
