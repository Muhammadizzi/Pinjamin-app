"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { Plus, Trash2, Pencil, Users } from "lucide-react";

export default function CustodiansPage() {
  const { custodians, addCustodian, updateCustodian, deleteCustodian } =
    useStore();
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    nik: "",
    department: "",
    email: "",
    phone: "",
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    if (edit) {
      updateCustodian(edit, form);
      setEdit(null);
    } else addCustodian(form);
    setForm({ name: "", nik: "", department: "", email: "", phone: "" });
    setShow(false);
  };
  const startEdit = (c: any) => {
    setForm({
      name: c.name,
      nik: c.nik || "",
      department: c.department || "",
      email: c.email || "",
      phone: c.phone || "",
    });
    setEdit(c.id);
    setShow(true);
  };
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Custodians</h1>
            <p className="text-sm text-muted-foreground">
              Data peminjam dikelola admin (tanpa login)
            </p>
          </div>
          <Button
            onClick={() => {
              setEdit(null);
              setForm({
                name: "",
                nik: "",
                department: "",
                email: "",
                phone: "",
              });
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
                {edit ? "Edit" : "Tambah"} Peminjam
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Nama *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Budi Santoso"
                      className="h-11 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>NIK</Label>
                    <Input
                      value={form.nik}
                      onChange={(e) =>
                        setForm({ ...form, nik: e.target.value })
                      }
                      placeholder="123456..."
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Departemen</Label>
                    <Input
                      value={form.department}
                      onChange={(e) =>
                        setForm({ ...form, department: e.target.value })
                      }
                      placeholder="IT"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="budi@garudafood.co.id"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      placeholder="0812..."
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-xl">
                  {edit ? "Update" : "Simpan"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {custodians.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-[#0a2240] text-white flex items-center justify-center font-bold shrink-0">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.department} {c.nik && `• ${c.nik}`}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.email} {c.phone && `• ${c.phone}`}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => startEdit(c)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600"
                    onClick={() => deleteCustodian(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
