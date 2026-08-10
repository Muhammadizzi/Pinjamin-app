"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { Plus, Trash2 } from "lucide-react";

export default function CustomFieldsPage() {
  const { customFields, addCustomField, deleteCustomField } = useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState({
    name: "",
    type: "text" as any,
    required: false,
    options: "",
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    ask({
      title: `Tambah custom field "${form.name}"?`,
      confirmLabel: "Ya, Tambah",
      variant: "primary",
      action: () => {
        addCustomField({
          name: form.name,
          type: form.type,
          required: form.required,
          options:
            form.type === "option"
              ? form.options
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : undefined,
        });
        setForm({ name: "", type: "text", required: false, options: "" });
      },
    });
  };
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("customFields")}</h1>
          <p className="text-sm text-muted-foreground">
            Kolom metadata tambahan untuk aset
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Field</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Tgl Pembelian"
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipe</Label>
                  <Select
                    value={form.type}
                    onChange={(e) =>
                      setForm({ ...form, type: e.target.value as any })
                    }
                  >
                    <option value="text">text</option>
                    <option value="number">number</option>
                    <option value="date">date</option>
                    <option value="boolean">boolean</option>
                    <option value="option">option</option>
                  </Select>
                </div>
                {form.type === "option" && (
                  <div className="sm:col-span-2 space-y-2">
                    <Label>Opsi (pisah koma)</Label>
                    <Input
                      value={form.options}
                      onChange={(e) =>
                        setForm({ ...form, options: e.target.value })
                      }
                      placeholder="Baik, Cukup, Rusak"
                      className="h-11 rounded-xl"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.required}
                    onChange={(e) =>
                      setForm({ ...form, required: e.target.checked })
                    }
                    id="req"
                  />
                  <Label htmlFor="req">Wajib diisi</Label>
                </div>
              </div>
              <Button type="submit" className="w-full rounded-xl">
                <Plus className="h-4 w-4" /> Tambah Field
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="grid gap-3">
          {customFields.map((cf) => (
            <Card key={cf.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-medium">{cf.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {cf.type} {cf.required && "• wajib"}{" "}
                    {cf.options && `• ${cf.options.join(", ")}`}
                  </div>
                </div>
                <Badge variant="outline">{cf.type}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    ask({
                      title: "Hapus custom field?",
                      description: `Field "${cf.name}" akan dihapus permanen dari semua aset.`,
                      confirmLabel: "Ya, Hapus",
                      action: () => deleteCustomField(cf.id),
                    })
                  }
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {customFields.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Belum ada custom field.
            </p>
          )}
        </div>
      </div>

      {confirmDialog}
    </AppShell>
  );
}
