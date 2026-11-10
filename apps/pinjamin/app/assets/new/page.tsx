"use client";
import { useEffect, useState } from "react";
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
import { useT } from "@/lib/i18n";
import { locationOptions } from "@/lib/location-path";
import { nextSerial, serialDipakai } from "@/lib/asset-model";
import type { AssetStatus } from "@/lib/types";
import { ModelPreview } from "@/components/model-preview";

/**
 * Tambah UNIT aset. Nama, kategori, spesifikasi, dan foto TIDAK diketik di
 * sini — semuanya ikut dari model yang dipilih (koreksi dosen pembimbing,
 * 11 Nov 2026). Yang diisi hanya data milik unit itu sendiri.
 */
export default function NewAssetPage() {
  const router = useRouter();
  const { assetModels, locations, addAsset, assets } = useStore();
  const { t, assetStatus } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState({
    assetModelId: "",
    serialNumber: "",
    description: "",
    status: "GOOD" as AssetStatus,
    locationId: "",
  });
  const [galatSerial, setGalatSerial] = useState("");

  // Dari tombol "Tambah unit" di halaman Model Aset: /assets/new?model=<id>.
  useEffect(() => {
    const dari = new URLSearchParams(window.location.search).get("model");
    if (dari) setForm((f) => ({ ...f, assetModelId: dari }));
  }, []);

  const model = assetModels.find((m) => m.id === form.assetModelId);
  const serialOtomatis = nextSerial(assets);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model) return alert(t("modelRequired"));
    const serial = form.serialNumber.trim() || serialOtomatis;
    if (serialDipakai(assets, serial)) {
      setGalatSerial(t("serialTaken", { serial }));
      return;
    }
    ask({
      title: t("confirmAddAsset", { name: model.name }),
      description: t("confirmAddAssetBody", { serial }),
      confirmLabel: t("yesAdd"),
      variant: "primary",
      action: () => {
        addAsset({
          assetModelId: model.id,
          // Salinan model — store dan server tetap menimpanya dari model.
          name: model.name,
          categoryId: model.categoryId,
          spec: model.spec,
          mainImage: model.image,
          description: form.description.trim() || undefined,
          status: form.status,
          locationId: form.locationId || undefined,
          serialNumber: serial,
        });
        router.push("/assets");
      },
    });
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            {t("addAssetTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("addAssetSub")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("assetInfo")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label>{t("modelLabel")} *</Label>
                <Select
                  value={form.assetModelId}
                  onChange={(e) =>
                    setForm({ ...form, assetModelId: e.target.value })
                  }
                  required
                >
                  <option value="">{t("selectPlaceholder")}</option>
                  {assetModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  <Link
                    href="/models"
                    className="underline hover:text-foreground"
                  >
                    {t("modelMissing")}
                  </Link>
                </p>
              </div>

              {model && <ModelPreview model={model} />}

              <div className="border-t pt-5 space-y-4">
                <div className="text-sm font-semibold">{t("unitData")}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-2">
                    <Label>{t("serialNumber")}</Label>
                    <Input
                      value={form.serialNumber}
                      onChange={(e) => {
                        setForm({ ...form, serialNumber: e.target.value });
                        setGalatSerial("");
                      }}
                      className="h-11 rounded-xl font-mono"
                    />
                    {galatSerial ? (
                      <p className="text-xs text-red-500">{galatSerial}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t("serialOptionalHint", { serial: serialOtomatis })}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>{t("status")}</Label>
                    <Select
                      value={form.status}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          status: e.target.value as AssetStatus,
                        })
                      }
                    >
                      <option value="GOOD">{assetStatus("GOOD")}</option>
                      <option value="DAMAGED">{assetStatus("DAMAGED")}</option>
                      <option value="MAINTENANCE">
                        {assetStatus("MAINTENANCE")}
                      </option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("location")}</Label>
                    <Select
                      value={form.locationId}
                      onChange={(e) =>
                        setForm({ ...form, locationId: e.target.value })
                      }
                    >
                      <option value="">{t("selectPlaceholder")}</option>
                      {locationOptions(locations).map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label>{t("unitNote")}</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2 rounded-xl border border-dashed bg-muted/40 px-3 py-2.5">
                    <p className="text-xs text-muted-foreground">
                      {t("holderAfterCreate")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Link href="/assets" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                  >
                    {t("cancel")}
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white shadow"
                >
                  {t("saveAsset")}
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
