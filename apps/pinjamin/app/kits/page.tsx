"use client";
import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { Plus, Boxes, Trash2, Eye, Package } from "lucide-react";

export default function KitsPage() {
  const { kits, assets, addKit, deleteKit } = useStore();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    assetIds: [] as string[],
  });
  const toggle = (id: string) =>
    setForm((f) => ({
      ...f,
      assetIds: f.assetIds.includes(id)
        ? f.assetIds.filter((x) => x !== id)
        : [...f.assetIds, id],
    }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    addKit({
      name: form.name,
      description: form.description,
      status: "AVAILABLE",
      assetIds: form.assetIds,
    });
    setForm({ name: "", description: "", assetIds: [] });
    setShow(false);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Kits</h1>
            <p className="text-sm text-muted-foreground">
              Bundel aset yang dipinjam sebagai paket
            </p>
          </div>
          <Button onClick={() => setShow(!show)} className="rounded-xl">
            <Plus className="h-4 w-4" /> Buat Kit
          </Button>
        </div>
        {show && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kit Baru</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama Kit *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Paket Presentasi"
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Deskripsi kit..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pilih Aset Anggota</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-auto border rounded-xl p-3">
                    {assets.map((a) => (
                      <label
                        key={a.id}
                        className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.assetIds.includes(a.id)}
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
                  Simpan Kit
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {kits.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              Belum ada kit. Buat kit pertama.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {kits.map((k) => (
              <Card key={k.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Boxes className="h-5 w-5 text-[#0a2240]" />
                    {k.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {k.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="font-mono">
                      {k.qrCode}
                    </Badge>
                    <Badge variant="secondary">{k.assetIds.length} aset</Badge>
                  </div>
                  <div className="space-y-1">
                    {k.assetIds.map((aid) => {
                      const a = assets.find((x) => x.id === aid);
                      return a ? (
                        <div
                          key={aid}
                          className="text-xs flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-2 py-1"
                        >
                          <Package className="h-3 w-3" />
                          {a.name}
                        </div>
                      ) : null;
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/kits/${k.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl"
                      >
                        <Eye className="h-4 w-4" /> Detail
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteKit(k.id)}
                      className="text-[#0a2240]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
