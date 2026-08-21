"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { Plus, Trash2 } from "lucide-react";

export default function AssetModelsPage() {
  const { assetModels, categories, addAssetModel, deleteAssetModel } =
    useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState({
    name: "",
    brand: "",
    categoryId: "",
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    ask({
      title: t("confirmAddModel", { name: form.name }),
      confirmLabel: t("yesAdd"),
      variant: "primary",
      action: () => {
        addAssetModel(form);
        setForm({ name: "", brand: "", categoryId: "" });
      },
    });
  };
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t("assetModels")}</h1>
          <p className="text-sm text-muted-foreground">{t("assetModelsSub")}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("addModel")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("modelName")} *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder='MacBook Air M2 13"'
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("brand")}</Label>
                  <Input
                    value={form.brand}
                    onChange={(e) =>
                      setForm({ ...form, brand: e.target.value })
                    }
                    placeholder="Apple"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("category")}</Label>
                  <Select
                    value={form.categoryId}
                    onChange={(e) =>
                      setForm({ ...form, categoryId: e.target.value })
                    }
                  >
                    <option value="">{t("selectPlaceholder")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full rounded-xl">
                <Plus className="h-4 w-4" /> {t("addModel")}
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="grid gap-3">
          {assetModels.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.brand} {m.modelNo && `• ${m.modelNo}`}{" "}
                    {m.categoryId &&
                      `• ${categories.find((c) => c.id === m.categoryId)
                        ?.name}`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    ask({
                      title: t("confirmDeleteModel"),
                      description: t("confirmDeleteModelBody", {
                        name: m.name,
                      }),
                      confirmLabel: t("yesDelete"),
                      action: () => deleteAssetModel(m.id),
                    })
                  }
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {confirmDialog}
    </AppShell>
  );
}
