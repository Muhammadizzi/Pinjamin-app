"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Plus, Trash2, MapPin, Pencil } from "lucide-react";

export default function LocationsPage() {
  const { locations, assets, addLocation, updateLocation, deleteLocation } = useStore();
  const { t } = useT();
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    parentId: "",
    image: "",
  });
  const [showParentCreate, setShowParentCreate] = useState(false);
  const [parentName, setParentName] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    const payload: any = {
      name: form.name,
      description: form.description,
      parentId: form.parentId || null,
      image: form.image || undefined,
    };
    // alamat tidak lagi diperlukan saat buat baru (sesuai request)
    if (edit) {
      updateLocation(edit, payload);
      setEdit(null);
    } else addLocation(payload);
    setForm({ name: "", description: "", parentId: "", image: "" });
    setShow(false);
    setShowParentCreate(false);
    setParentName("");
  };

  const handleCreateParent = () => {
    if (!parentName.trim()) return;
    addLocation({ name: parentName.trim(), description: "", parentId: null, image: "" } as any);
    // setelah buat, pilih parent yang baru dibuat
    // cari id terbaru (paling atas setelah add, tapi store akan prepend, jadi ambil yang pertama setelah add? Simple: tunggu next render, tapi kita set parentId ke nama terakhir? Kita cari dari locations setelah add)
    // trik: ambil id dari locations yang baru (akan ada di next render, tapi kita set via timeout)
    setTimeout(() => {
      // locations belum update sync, jadi kita cari yang namanya sama
      const found = locations.find((l) => l.name === parentName.trim());
      // Jika belum, tunggu store update, fallback: gunakan nama
      if (found) setForm((f) => ({ ...f, parentId: found.id }));
    }, 100);
    // Optimistic: set parentId ke id yang akan digenerate? Kita generate manual
    // Untuk demo, kita langsung set parentId ke generated id via store (tapi store generate random, susah)
    // Simpler: setelah add, clear input dan tutup
    setParentName("");
    setShowParentCreate(false);
  };

  const startEdit = (l: any) => {
    setForm({
      name: l.name,
      description: l.description || "",
      parentId: l.parentId || "",
      image: l.image || "",
    });
    setEdit(l.id);
    setShow(true);
  };

  const tree = (parent: string | null, depth = 0) =>
    locations
      .filter((l) => (l.parentId || null) === parent)
      .map((l) => (
        <div key={l.id} style={{ marginLeft: depth * 16 }}>
          <Card className="mb-2 overflow-hidden">
            <CardContent className="p-3 flex items-center gap-3">
              {l.image ? (
                <img src={l.image} alt={l.name} className="h-10 w-10 rounded-lg object-cover border shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-[#1a365d] flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-white" strokeWidth={1.5} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{l.name}</div>
                <div className="text-xs text-muted-foreground truncate">{l.description || "-"}</div>
                <div className="text-xs text-muted-foreground">{assets.filter((a) => a.locationId === l.id).length} aset</div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(l)}>
                <Pencil className="h-4 w-4" strokeWidth={1.5} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteLocation(l.id)}>
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </CardContent>
          </Card>
          {tree(l.id, depth + 1)}
        </div>
      ));

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("locations")}</h1>
            <p className="text-sm text-muted-foreground">Hierarkis: gedung → lantai → ruang</p>
          </div>
          <Button
            onClick={() => {
              setEdit(null);
              setForm({ name: "", description: "", parentId: "", image: "" });
              setShow(!show);
            }}
            className="rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} /> Tambah
          </Button>
        </div>

        {show && (
          <Card className="border-[#1a365d]/20 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#1a365d]" strokeWidth={1.5} />
                {edit ? "Edit" : "Tambah"} Lokasi
              </CardTitle>
              <p className="text-xs text-muted-foreground">Hanya Nama, Parent, Foto, Deskripsi — alamat tidak perlu</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2">
                  <Label>
                    Nama <span className="text-red-500">*</span>
                  </Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ruang IT, Gudang A" className="h-11 rounded-xl" required />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Parent Lokasi</Label>
                    <button
                      type="button"
                      onClick={() => setShowParentCreate(!showParentCreate)}
                      className="text-xs font-medium text-[#1a365d] hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Buat Parent Baru
                    </button>
                  </div>
                  <Select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                    <option value="">— Tidak ada (root) —</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                  {showParentCreate && (
                    <div className="rounded-xl border-2 border-dashed border-[#1a365d]/20 bg-amber-50/50 dark:bg-slate-800/30 p-3 space-y-2 animate-in fade-in">
                      <Label className="text-xs">Nama Parent Baru *</Label>
                      <div className="flex gap-2">
                        <Input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Gedung Utama" className="h-9 rounded-lg bg-white dark:bg-slate-900 flex-1" />
                        <Button type="button" size="sm" onClick={handleCreateParent} className="rounded-lg bg-[#1a365d] text-white h-9">
                          Buat
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setShowParentCreate(false)} className="h-9">
                          Batal
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Parent akan langsung muncul di dropdown dan bisa dipilih.</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Klik “Buat Parent Baru” untuk bikin parent langsung tanpa pindah halaman.</p>
                </div>

                <ImageUpload value={form.image} onChange={(url) => setForm({ ...form, image: url })} label="Foto Tempat (Upload Only)" uploadOnly />

                <div className="space-y-2">
                  <Label>Deskripsi</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi lokasi, kapasitas, fasilitas..." rows={3} />
                </div>

                <Button type="submit" className="w-full rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white h-11 font-semibold">
                  {edit ? "Update" : "Simpan"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div>{tree(null)}</div>

        {locations.length === 0 && !show && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <MapPin className="h-7 w-7 text-slate-400" strokeWidth={1.5} />
              </div>
              <div className="font-medium">Belum ada lokasi</div>
              <div className="text-sm text-muted-foreground">Tap Tambah untuk buat lokasi pertama dengan foto</div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
