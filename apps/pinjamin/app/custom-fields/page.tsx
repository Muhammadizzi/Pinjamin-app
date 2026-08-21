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
import { contrastTextColor } from "@/lib/utils";
import { Plus, Trash2, Check } from "lucide-react";

export default function CustomFieldsPage() {
  const { customFields, categories, addCustomField, deleteCustomField } =
    useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState({
    name: "",
    type: "text" as any,
    required: false,
    options: "",
    categoryIds: [] as string[],
  });

  const toggleCategory = (id: string) =>
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter((x) => x !== id)
        : [...f.categoryIds, id],
    }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    const catNames =
      form.categoryIds.length === 0
        ? t("allCategoriesPhrase")
        : categories
            .filter((c) => form.categoryIds.includes(c.id))
            .map((c) => c.name)
            .join(", ");
    ask({
      title: t("confirmAddCustomField", { name: form.name }),
      description: t("confirmAddCustomFieldBody", { categories: catNames }),
      confirmLabel: t("yesAdd"),
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
          categoryIds:
            form.categoryIds.length > 0 ? form.categoryIds : undefined,
        });
        setForm({
          name: "",
          type: "text",
          required: false,
          options: "",
          categoryIds: [],
        });
      },
    });
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t("customFields")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("customFieldsSub")}
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("addField")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("name")} *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Tgl Pembelian"
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("fieldType")}</Label>
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
                    <Label>{t("optionsCommaSeparated")}</Label>
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

                {/* Use for select kategori */}
                {categories.length > 0 && (
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>{t("useForCategories")}</Label>
                      <div className="flex items-center gap-2">
                        {form.categoryIds.length > 0 && (
                          <span className="bg-[#1a365d] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            {t("selectedCount", {
                              count: form.categoryIds.length,
                            })}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              categoryIds: categories.map((c) => c.id),
                            })
                          }
                          className="text-[11px] font-medium text-[#1a365d] dark:text-amber-300 hover:underline"
                        >
                          {t("selectAll")}
                        </button>
                        {form.categoryIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setForm({ ...form, categoryIds: [] })
                            }
                            className="text-[11px] font-medium text-red-500 hover:underline"
                          >
                            {t("reset")}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {categories.map((c) => {
                        const selected = form.categoryIds.includes(c.id);
                        const color = c.color || "#4299e1";
                        const fg = selected ? contrastTextColor(color) : "";
                        const overlay =
                          fg === "#ffffff"
                            ? "rgba(255,255,255,.25)"
                            : "rgba(15,23,42,.12)";
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCategory(c.id)}
                            aria-pressed={selected}
                            title={c.name}
                            className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-xs font-medium transition-all ${
                              selected
                                ? "shadow"
                                : "bg-[#12263f] text-slate-200 border-[#243a5e] hover:border-[#35507c]"
                            }`}
                            style={
                              selected
                                ? {
                                    background: color,
                                    borderColor: color,
                                    color: fg,
                                  }
                                : undefined
                            }
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0 border"
                              style={{
                                background: selected ? fg || color : color,
                                borderColor: selected
                                  ? fg === "#ffffff"
                                    ? "rgba(255,255,255,.4)"
                                    : "rgba(15,23,42,.25)"
                                  : "transparent",
                              }}
                            />
                            <span
                              className={`flex-1 truncate ${
                                c.name?.trim() ? "" : "italic opacity-60"
                              }`}
                            >
                              {c.name?.trim() ? c.name : t("unnamed")}
                            </span>
                            <span
                              className="h-4 w-4 rounded-full flex items-center justify-center shrink-0"
                              style={
                                selected ? { background: overlay } : undefined
                              }
                            >
                              {selected ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <span className="h-4 w-4 rounded-full border border-slate-500" />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("noCategoryMeansAll")}
                    </p>
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
                  <Label htmlFor="req">{t("requiredField")}</Label>
                </div>
              </div>
              <Button type="submit" className="w-full rounded-xl">
                <Plus className="h-4 w-4" /> {t("addField")}
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="grid gap-3">
          {customFields.map((cf) => {
            const assignedCats = (cf.categoryIds || [])
              .map((id) => categories.find((c) => c.id === id))
              .filter(Boolean);
            return (
              <Card key={cf.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{cf.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {cf.type} {cf.required && `• ${t("requiredShort")}`}{" "}
                      {cf.options && `• ${cf.options.join(", ")}`}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {assignedCats.length === 0 ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {t("allCategoriesBadge")}
                        </Badge>
                      ) : (
                        assignedCats.map(
                          (c: any) =>
                            c && (
                              <span
                                key={c.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                style={{
                                  background: c.color || "#64748b",
                                  color: contrastTextColor(
                                    c.color || "#64748b"
                                  ),
                                }}
                              >
                                {c.name}
                              </span>
                            )
                        )
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {cf.type}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      ask({
                        title: t("confirmDeleteCustomField"),
                        description: t("confirmDeleteCustomFieldBody", {
                          name: cf.name,
                        }),
                        confirmLabel: t("yesDelete"),
                        action: () => deleteCustomField(cf.id),
                      })
                    }
                    className="text-red-600 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {customFields.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {t("noCustomFields")}
            </p>
          )}
        </div>
      </div>

      {confirmDialog}
    </AppShell>
  );
}
