"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";

export default function AuditDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { audits, assets, updateAuditItem, completeAudit } = useStore();
  const { t, assetStatus, auditResult } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const audit = audits.find((a) => a.id === id);
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (!audit)
    return (
      <AppShell>
        <div className="p-8 text-center">{t("auditNotFound")}</div>
      </AppShell>
    );
  const progress =
    audit.items.filter((i) => i.result !== null).length / audit.items.length;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/audits"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("back")}
        </Link>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{audit.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {audit.status === "OPEN"
                    ? t("auditStatusOpen")
                    : t("auditStatusCompleted")}{" "}
                  • {t("assetCountLabel", { count: audit.items.length })}
                </p>
              </div>
              <Badge variant={audit.status === "OPEN" ? "warning" : "success"}>
                {audit.status === "OPEN"
                  ? t("auditStatusOpen")
                  : t("auditStatusCompleted")}
              </Badge>
            </div>
            <div className="mt-4">
              <div className="text-xs text-muted-foreground mb-1">
                {t("progressPercent", {
                  percent: Math.round(progress * 100),
                })}
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {audit.items.map((it) => {
              const asset = assets.find((a) => a.id === it.assetId);
              return (
                <div key={it.id} className="border rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {asset?.name || it.assetId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {asset?.qrCode} •{" "}
                        {asset ? assetStatus(asset.status) : "-"}
                      </div>
                    </div>
                    <Badge
                      variant={
                        it.result === "FOUND"
                          ? "success"
                          : it.result === "MISSING"
                          ? "destructive"
                          : it.result === "DAMAGED"
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {it.result
                        ? auditResult(it.result)
                        : t("auditNotChecked")}
                    </Badge>
                  </div>
                  {audit.status === "OPEN" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant={it.result === "FOUND" ? "default" : "outline"}
                        className="rounded-xl"
                        onClick={() =>
                          updateAuditItem(audit.id, it.assetId, {
                            result: "FOUND",
                            note: notes[it.assetId] || "",
                          })
                        }
                      >
                        <CheckCircle className="h-4 w-4" />{" "}
                        {auditResult("FOUND")}
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          it.result === "MISSING" ? "destructive" : "outline"
                        }
                        className="rounded-xl"
                        onClick={() =>
                          updateAuditItem(audit.id, it.assetId, {
                            result: "MISSING",
                            note: notes[it.assetId] || "",
                          })
                        }
                      >
                        <XCircle className="h-4 w-4" /> {auditResult("MISSING")}
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          it.result === "DAMAGED" ? "secondary" : "outline"
                        }
                        className="rounded-xl"
                        onClick={() =>
                          updateAuditItem(audit.id, it.assetId, {
                            result: "DAMAGED",
                            note: notes[it.assetId] || "",
                          })
                        }
                      >
                        <AlertTriangle className="h-4 w-4" />{" "}
                        {auditResult("DAMAGED")}
                      </Button>
                    </div>
                  )}
                  {audit.status === "OPEN" && (
                    <Textarea
                      placeholder={t("notePlaceholder")}
                      value={notes[it.assetId] || it.note || ""}
                      onChange={(e) =>
                        setNotes({ ...notes, [it.assetId]: e.target.value })
                      }
                      className="text-sm"
                      rows={2}
                    />
                  )}
                  {it.note && audit.status === "COMPLETED" && (
                    <div className="text-xs bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                      {it.note}
                    </div>
                  )}
                </div>
              );
            })}
            {audit.status === "OPEN" && (
              <Button
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700"
                onClick={() =>
                  ask({
                    title: t("confirmCompleteAudit"),
                    description: t("confirmCompleteAuditBody", {
                      name: audit.name,
                    }),
                    confirmLabel: t("yesComplete"),
                    variant: "primary",
                    action: () => completeAudit(audit.id),
                  })
                }
                disabled={progress < 1}
              >
                {t("completeAudit")}
              </Button>
            )}
            {progress < 1 && audit.status === "OPEN" && (
              <p className="text-xs text-amber-600 text-center">
                {t("markAllFirst")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {confirmDialog}
    </AppShell>
  );
}
