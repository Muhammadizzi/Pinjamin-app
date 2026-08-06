"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function NewBookingPage() {
  const router = useRouter();
  const { assets, kits, custodians, addBooking } = useStore(); const { t } = useT();
  const [form, setForm] = useState({
    name: "",
    description: "",
    custodianId: "",
    fromDate: "",
    toDate: "",
    assetIds: [] as string[],
    kitIds: [] as string[],
  });
  const [err, setErr] = useState("");
  const toggleAsset = (id: string) =>
    setForm((f) => ({
      ...f,
      assetIds: f.assetIds.includes(id)
        ? f.assetIds.filter((x) => x !== id)
        : [...f.assetIds, id],
    }));
  const toggleKit = (id: string) =>
    setForm((f) => ({
      ...f,
      kitIds: f.kitIds.includes(id)
        ? f.kitIds.filter((x) => x !== id)
        : [...f.kitIds, id],
    }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!form.name || !form.custodianId || !form.fromDate || !form.toDate)
      return setErr("Lengkapi field wajib (*)");
    if (form.assetIds.length === 0 && form.kitIds.length === 0)
      return setErr("Pilih minimal 1 aset atau kit");
    if (new Date(form.fromDate) > new Date(form.toDate))
      return setErr("Tanggal kembali harus setelah tanggal pinjam");
    const res = addBooking({
      name: form.name,
      description: form.description,
      custodianId: form.custodianId,
      fromDate: new Date(form.fromDate).toISOString(),
      toDate: new Date(form.toDate).toISOString(),
      assetIds: form.assetIds,
      kitIds: form.kitIds,
    });
    if (!res.ok) setErr(res.error || "Gagal");
    else router.push("/bookings");
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Booking Baru</h1>
          <p className="text-sm text-muted-foreground">
            Pilih aset/kit + peminjam + tanggal. Sistem cegah bentrok otomatis.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Form Peminjaman</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label>Nama Booking *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Peminjaman Proyektor Marketing"
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
                  placeholder="Keperluan..."
                />
              </div>
              <div className="space-y-2">
                <Label>Peminjam (Custodian) *</Label>
                <Select
                  value={form.custodianId}
                  onChange={(e) =>
                    setForm({ ...form, custodianId: e.target.value })
                  }
                  required
                >
                  <option value="">— Pilih Peminjam —</option>
                  {custodians.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.department}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tgl Pinjam *</Label>
                  <Input
                    type="date"
                    value={form.fromDate}
                    onChange={(e) =>
                      setForm({ ...form, fromDate: e.target.value })
                    }
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tgl Kembali *</Label>
                  <Input
                    type="date"
                    value={form.toDate}
                    onChange={(e) =>
                      setForm({ ...form, toDate: e.target.value })
                    }
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pilih Aset</Label>
                <div className="border rounded-xl p-3 max-h-48 overflow-auto grid grid-cols-1 gap-1">
                  {assets
                    .filter((a) => a.status !== "RETIRED")
                    .map((a) => (
                      <label
                        key={a.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={form.assetIds.includes(a.id)}
                          onChange={() => toggleAsset(a.id)}
                        />
                        <span className="flex-1 truncate">{a.name}</span>
                        <Badge
                          variant={
                            a.status === "AVAILABLE" ? "success" : "info"
                          }
                          className="text-[10px]"
                        >
                          {a.status}
                        </Badge>
                      </label>
                    ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pilih Kit (opsional)</Label>
                <div className="border rounded-xl p-3 max-h-32 overflow-auto grid grid-cols-1 gap-1">
                  {kits.map((k) => (
                    <label
                      key={k.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.kitIds.includes(k.id)}
                        onChange={() => toggleKit(k.id)}
                      />
                      <span className="flex-1 truncate">{k.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {k.assetIds.length} aset
                      </span>
                    </label>
                  ))}
                  {kits.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      Belum ada kit
                    </span>
                  )}
                </div>
              </div>
              {err && (
                <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
                  {err}
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => router.back()}
                >
                  Batal
                </Button>
                <Button type="submit" className="flex-1 rounded-xl">
                  Simpan Booking
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
