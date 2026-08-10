"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import Link from "next/link";
import {
  Plus,
  ClipboardCheck,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AuditsPage() {
  const { audits, assets, addAudit, deleteAudit } = useStore(); const { t } = useT();
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const toggle = (id: string) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || sel.length === 0) return alert("Isi nama dan pilih aset");
    addAudit({
      name,
      status: "OPEN" as any,
      createdBy: "adminsystem",
      assetIds: sel,
    });
    setName("");
    setSel([]);
    setShow(false);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("audits")}</h1>
            <p className="text-sm text-muted-foreground">
              Verifikasi keberadaan & kondisi aset
            </p>
          </div>
          <Button onClick={() => setShow(!show)} className="rounded-xl">
            <Plus className="h-4 w-4" /> Sesi Baru
          </Button>
        </div>
        {show && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Buat Sesi Audit</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama Sesi *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Audit Q1 - Gudang A"
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pilih Aset untuk Audit *</Label>
                  <div className="border rounded-xl p-3 max-h-64 overflow-auto space-y-1">
                    {assets.map((a) => (
                      <label
                        key={a.id}
                        className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={sel.includes(a.id)}
                          onChange={() => toggle(a.id)}
                        />
                        <span className="flex-1 truncate">{a.name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {a.status}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-xl">
                  Buat Audit
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
        <div className="grid gap-4">
          {audits.map((a) => {
            const found = a.items.filter((i) => i.result === "FOUND").length;
            const missing = a.items.filter(
              (i) => i.result === "MISSING"
            ).length;
            return (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex gap-4 items-center">
                  <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(a.createdAt)} • {a.items.length} aset •{" "}
                      <span className="text-emerald-600">{found} FOUND</span>{" "}
                      {missing > 0 && (
                        <span className="text-red-600">
                          • {missing} MISSING
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={a.status === "OPEN" ? "warning" : "success"}>
                    {a.status}
                  </Badge>
                  <Link href={`/audits/${a.id}`}>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAudit(a.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {audits.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                Belum ada audit
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
