"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function KitDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { kits, assets, deleteKit } = useStore();
  const kit = kits.find((k) => k.id === id);
  if (!kit)
    return (
      <AppShell>
        <div className="p-8 text-center">Kit tidak ditemukan</div>
      </AppShell>
    );
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/kits"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{kit.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{kit.description}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-2xl p-6">
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG value={kit.qrCode} size={160} />
              </div>
              <div className="font-mono text-sm font-bold">{kit.qrCode}</div>
              <Badge>{kit.status}</Badge>
            </div>
            <div>
              <div className="font-medium mb-2">
                Anggota ({kit.assetIds.length})
              </div>
              {kit.assetIds.map((aid) => {
                const a = assets.find((x) => x.id === aid);
                return a ? (
                  <Link
                    key={aid}
                    href={`/assets/${a.id}`}
                    className="block border rounded-xl p-3 mb-2 hover:bg-slate-50"
                  >
                    <div className="font-medium text-sm">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.status} • {a.qrCode}
                    </div>
                  </Link>
                ) : null;
              })}
            </div>
            <Button
              variant="destructive"
              className="w-full rounded-xl"
              onClick={() => {
                if (confirm("Hapus kit?")) {
                  deleteKit(kit.id);
                  router.push("/kits");
                }
              }}
            >
              <Trash2 className="h-4 w-4" /> Hapus Kit
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
