"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { ImageUpload } from "@/components/ui/image-upload";
import { ArrowLeft } from "lucide-react";

export default function NewKitPage() {
  const router = useRouter();
  const { categories, locations, addKit } = useStore();
  const { ask, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState({
    name: "",
    description: "",
    categoryId: "",
    locationId: "",
    image: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("Nama Kit wajib diisi");
    ask({
      title: `Buat kit "${form.name}"?`,
      description:
        "Kit baru akan dibuat dan bisa diisi aset dari halaman detailnya.",
      confirmLabel: "Ya, Buat",
      variant: "primary",
      action: () => {
        doCreate();
      },
    });
  };

  const doCreate = () => {
    addKit({
      name: form.name,
      description: form.description,
      status: "AVAILABLE",
      assetIds: [],
      categoryId: form.categoryId || undefined,
      locationId: form.locationId || undefined,
      image: form.image || undefined,
    } as any);
    router.push("/kits");
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/kits"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#1a365d] dark:text-white hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Kit
        </Link>

        <div>
          <h1 className="text-2xl font-bold">Buat Kit Baru</h1>
          <p className="text-sm text-muted-foreground">
            Isi informasi kit. Kit yang sudah terdaftar tidak tampil di sini —
            hanya form.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Form Kit Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label>
                  Nama Kit <span className="text-red-500">*</span>
                </Label>
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
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select
                    value={form.categoryId}
                    onChange={(e) =>
                      setForm({ ...form, categoryId: e.target.value })
                    }
                  >
                    <option value="">— Pilih Kategori —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lokasi</Label>
                  <Select
                    value={form.locationId}
                    onChange={(e) =>
                      setForm({ ...form, locationId: e.target.value })
                    }
                  >
                    <option value="">— Pilih Lokasi —</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <ImageUpload
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url })}
                label="Gambar Kit"
                uploadOnly
              />

              <div className="flex gap-3 pt-2">
                <Link href="/kits" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                  >
                    Batal
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white"
                >
                  Simpan Kit
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {confirmDialog}
    </AppShell>
  );
}
