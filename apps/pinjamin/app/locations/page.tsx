"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { Plus, Trash2, MapPin, Pencil } from "lucide-react";

export default function LocationsPage() {
  const { locations, assets, addLocation, updateLocation, deleteLocation } =
    useStore();
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    parentId: "",
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    const payload = {
      name: form.name,
      description: form.description,
      address: form.address,
      parentId: form.parentId || null,
    };
    if (edit) {
      updateLocation(edit, payload);
      setEdit(null);
    } else addLocation(payload);
    setForm({ name: "", description: "", address: "", parentId: "" });
    setShow(false);
  };
  const startEdit = (l: any) => {
    setForm({
      name: l.name,
      description: l.description || "",
      address: l.address || "",
      parentId: l.parentId || "",
    });
    setEdit(l.id);
    setShow(true);
  };
  const tree = (parent: string | null, depth = 0) =>
    locations
      .filter((l) => (l.parentId || null) === parent)
      .map((l) => (
        <div key={l.id} style={{ marginLeft: depth * 16 }}>
          <Card className="mb-2">
            <CardContent className="p-3 flex items-center gap-3">
              <MapPin className="h-4 w-4 text-red-600" />
              <div className="flex-1">
                <div className="font-medium text-sm">{l.name}</div>
                <div className="text-xs text-muted-foreground">
                  {l.address} {l.description && `• ${l.description}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {assets.filter((a) => a.locationId === l.id).length} aset
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => startEdit(l)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600"
                onClick={() => deleteLocation(l.id)}
              >
                <Trash2 className="h-4 w-4" />
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
            <h1 className="text-2xl font-bold">Locations</h1>
            <p className="text-sm text-muted-foreground">
              Hierarkis: gedung → lantai → ruang
            </p>
          </div>
          <Button
            onClick={() => {
              setEdit(null);
              setForm({ name: "", description: "", address: "", parentId: "" });
              setShow(!show);
            }}
            className="rounded-xl"
          >
            <Plus className="h-4 w-4" /> Tambah
          </Button>
        </div>
        {show && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {edit ? "Edit" : "Tambah"} Lokasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ruang IT"
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Induk (opsional)</Label>
                  <Select
                    value={form.parentId}
                    onChange={(e) =>
                      setForm({ ...form, parentId: e.target.value })
                    }
                  >
                    <option value="">— Tidak ada (root) —</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Alamat</Label>
                  <Input
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    placeholder="Jl. Bintaro..."
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <Button type="submit" className="w-full rounded-xl">
                  {edit ? "Update" : "Simpan"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
        <div>{tree(null)}</div>
      </div>
    </AppShell>
  );
}
