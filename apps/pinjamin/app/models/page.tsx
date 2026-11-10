"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { AssetImage } from "@/components/ui/asset-image";
import { ImageUpload } from "@/components/ui/image-upload";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { ringkasKondisi } from "@/lib/asset-model";
import type { AssetModel, AssetStatus } from "@/lib/types";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";

const KONDISI: AssetStatus[] = ["GOOD", "DAMAGED", "MAINTENANCE"];

type FormModel = {
  name: string;
  categoryId: string;
  spec: string;
  image: string;
};

const formKosong: FormModel = { name: "", categoryId: "", spec: "", image: "" };

/**
 * Model (induk) aset: nama, kategori, spesifikasi, dan foto diisi sekali di
 * sini; unit-unitnya dibuat di Tambah Aset dengan memilih model. Halaman ini
 * juga menjadi tampilan "per kelompok" — jumlah unit dan kondisinya per model.
 */
export default function ModelsPage() {
  const {
    assetModels,
    assets,
    categories,
    addAssetModel,
    updateAssetModel,
    deleteAssetModel,
  } = useStore();
  const { t, assetStatus } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState<FormModel>(formKosong);
  const [galat, setGalat] = useState("");

  const unitPerModel = useMemo(() => {
    const peta = new Map<string, typeof assets>();
    for (const a of assets) {
      if (!a.assetModelId) continue;
      const daftar = peta.get(a.assetModelId) ?? [];
      daftar.push(a);
      peta.set(a.assetModelId, daftar);
    }
    return peta;
  }, [assets]);

  const tutupForm = () => {
    setShow(false);
    setEdit(null);
    setForm(formKosong);
    setGalat("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const nama = form.name.trim();
    if (!nama) return;
    const bentrok = assetModels.some(
      (m) => m.id !== edit && m.name.trim().toLowerCase() === nama.toLowerCase()
    );
    if (bentrok) {
      setGalat(t("modelNameTaken"));
      return;
    }
    const isi = {
      name: nama,
      categoryId: form.categoryId || undefined,
      spec: form.spec.trim() || undefined,
      image: form.image || undefined,
    };
    const jumlahUnit = edit ? unitPerModel.get(edit)?.length ?? 0 : 0;
    ask({
      title: edit
        ? t("confirmEditModel", { name: nama })
        : t("confirmAddModel", { name: nama }),
      description:
        edit && jumlahUnit > 0
          ? t("confirmEditModelBody", { count: jumlahUnit })
          : undefined,
      confirmLabel: edit ? t("yesSave") : t("yesAdd"),
      variant: "primary",
      action: () => {
        if (edit) updateAssetModel(edit, isi);
        else addAssetModel(isi);
        tutupForm();
      },
    });
  };

  const mulaiEdit = (m: AssetModel) => {
    setForm({
      name: m.name,
      categoryId: m.categoryId || "",
      spec: m.spec || "",
      image: m.image || "",
    });
    setEdit(m.id);
    setGalat("");
    setShow(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold">{t("assetModels")}</h1>
          <Button
            onClick={() => {
              if (show && !edit) tutupForm();
              else {
                setEdit(null);
                setForm(formKosong);
                setGalat("");
                setShow(true);
              }
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
                {edit ? t("editModelTitle") : t("addModelTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-2">
                    <Label>{t("modelName")} *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => {
                        setForm({ ...form, name: e.target.value });
                        setGalat("");
                      }}
                      className="h-11 rounded-xl"
                      required
                    />
                    {galat && <p className="text-xs text-red-500">{galat}</p>}
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
                  <div className="space-y-2">
                    <Label>{t("specLabel")}</Label>
                    <Input
                      value={form.spec}
                      onChange={(e) =>
                        setForm({ ...form, spec: e.target.value })
                      }
                      placeholder={t("specPlaceholder")}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <ImageUpload
                      value={form.image}
                      onChange={(url) => setForm({ ...form, image: url })}
                      label={t("modelPhoto")}
                      uploadOnly
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={tutupForm}
                  >
                    {t("cancel")}
                  </Button>
                  <Button type="submit" className="flex-1 rounded-xl">
                    {edit ? t("update") : t("save")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {assetModels.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {t("noModelsYet")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assetModels.map((m) => {
              const units = unitPerModel.get(m.id) ?? [];
              const r = ringkasKondisi(units);
              const cat = categories.find((c) => c.id === m.categoryId);
              return (
                <Card key={m.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex gap-4 items-start">
                    <AssetImage src={m.image} alt={m.name} size="lg" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="font-semibold leading-snug">{m.name}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {cat && (
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ background: cat.color }}
                          />
                        )}
                        <span className="truncate">
                          {cat?.name || "-"}
                          {m.spec ? ` · ${m.spec}` : ""}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-sm font-semibold mr-1">
                          {t("unitCount", { count: r.total })}
                        </span>
                        {KONDISI.filter((k) => r[k] > 0).map((k) => (
                          <StatusBadge
                            key={k}
                            status={k}
                            label={`${assetStatus(k)} ${r[k]}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col sm:flex-row items-center gap-1">
                      <Link
                        href={`/assets/new?model=${encodeURIComponent(m.id)}`}
                        title={t("addUnit")}
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link
                        href={`/assets?model=${encodeURIComponent(m.id)}`}
                        title={t("viewUnits")}
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={t("edit")}
                        onClick={() => mulaiEdit(m)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 disabled:opacity-40"
                        disabled={r.total > 0}
                        title={r.total > 0 ? t("modelHasUnits") : t("delete")}
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
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {confirmDialog}
    </AppShell>
  );
}
