"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { Plus, Trash2, Pencil, Users } from "lucide-react";

export default function CustodiansPage() {
  const { custodians, addCustodian, updateCustodian, deleteCustodian } =
    useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
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
    ask({
      title: edit
        ? t("confirmEditCustodian", { name: form.name })
        : t("confirmAddCustodian", { name: form.name }),
      confirmLabel: edit ? t("yesSave") : t("yesAdd"),
      variant: "primary",
      action: () => {
        if (edit) {
          updateCustodian(edit, form);
          setEdit(null);
        } else addCustodian(form);
        setForm({ name: "", nik: "", department: "", email: "", phone: "" });
        setShow(false);
      },
    });
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
            <h1 className="text-xl sm:text-2xl font-bold">{t("custodians")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("custodiansSub")}
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
            <Plus className="h-4 w-4" /> {t("add")}
          </Button>
        </div>
        {show && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {edit ? t("editCustodianTitle") : t("addCustodianTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{t("name")} *</Label>
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
                    <Label>{t("nik")}</Label>
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
                    <Label>{t("department")}</Label>
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
                    <Label>{t("email")}</Label>
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
                    <Label>{t("phone")}</Label>
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
                  {edit ? t("update") : t("save")}
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
                <div className="flex shrink-0 items-center gap-1">
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
                    onClick={() =>
                      ask({
                        title: t("confirmDeleteCustodian"),
                        description: t("confirmDeleteCustodianBody", {
                          name: c.name,
                        }),
                        confirmLabel: t("yesDelete"),
                        action: () => deleteCustodian(c.id),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {confirmDialog}
    </AppShell>
  );
}
