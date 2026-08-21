"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { Plus, Trash2, Pencil } from "lucide-react";

export default function CategoriesPage() {
  const { categories, assets, addCategory, updateCategory, deleteCategory } =
    useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    color: "#ef4444",
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    ask({
      title: edit
        ? t("confirmEditCategory", { name: form.name })
        : t("confirmAddCategory", { name: form.name }),
      confirmLabel: edit ? t("yesSave") : t("yesAdd"),
      variant: "primary",
      action: () => {
        if (edit) {
          updateCategory(edit, form);
          setEdit(null);
        } else {
          addCategory(form);
        }
        setForm({ name: "", description: "", color: "#ef4444" });
        setShow(false);
      },
    });
  };
  const startEdit = (c: any) => {
    setForm({ name: c.name, description: c.description || "", color: c.color });
    setEdit(c.id);
    setShow(true);
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t("categories")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("categoriesSub")}
            </p>
          </div>
          <Button
            onClick={() => {
              setEdit(null);
              setForm({ name: "", description: "", color: "#ef4444" });
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
                {edit ? t("editCategoryTitle") : t("addCategoryTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("name")} *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Elektronik"
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("description")}</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("color")}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={form.color}
                      onChange={(e) =>
                        setForm({ ...form, color: e.target.value })
                      }
                      className="h-11 w-20 p-1"
                    />
                    <Input
                      value={form.color}
                      onChange={(e) =>
                        setForm({ ...form, color: e.target.value })
                      }
                      className="flex-1 h-11 rounded-xl"
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
          {categories.map((c) => {
            const count = assets.filter((a) => a.categoryId === c.id).length;
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex gap-4 items-start">
                  <div
                    className="h-10 w-10 rounded-xl shrink-0"
                    style={{ background: c.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {c.description || "-"}
                    </div>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {t("assetCountLabel", { count })}
                    </Badge>
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
                          title: t("confirmDeleteCategory"),
                          description: t("confirmDeleteCategoryBody", {
                            name: c.name,
                          }),
                          confirmLabel: t("yesDelete"),
                          action: () => deleteCategory(c.id),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {confirmDialog}
    </AppShell>
  );
}
