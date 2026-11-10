"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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

type FormUnit = {
  assetModelId: string;
  serialNumber: string;
  description: string;
  status: AssetStatus;
  locationId: string;
};

/**
 * Ubah UNIT aset: model, serial number, kondisi, lokasi, dan catatan unit.
 * Nama, kategori, spesifikasi, dan foto diubah lewat menu Model Aset — di sana
 * perubahan berlaku untuk semua unit model itu sekaligus.
 */
export default function EditAssetPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { assets, assetModels, locations, updateAsset } = useStore();
  const { t, assetStatus } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const asset = assets.find((a) => a.id === id);
  const [form, setForm] = useState<FormUnit | null>(null);
  const [galatSerial, setGalatSerial] = useState("");
  useEffect(() => {
    if (asset && !form)
      setForm({
        assetModelId: asset.assetModelId || "",
        serialNumber: asset.serialNumber || "",
        description: asset.description || "",
        status: asset.status,
        locationId: asset.locationId || "",
      });
  }, [asset, form]);
  if (!asset)
    return (
      <AppShell>
        <div className="p-8 text-center">{t("assetNotFound")}</div>
      </AppShell>
    );
  if (!form) return null;

  const model = assetModels.find((m) => m.id === form.assetModelId);
  const serialOtomatis = nextSerial(assets.filter((a) => a.id !== id));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model) return alert(t("modelRequired"));
    const serial = form.serialNumber.trim() || serialOtomatis;
    if (serialDipakai(assets, serial, id)) {
      setGalatSerial(t("serialTaken", { serial }));
      return;
    }
    ask({
      title: t("confirmSaveChanges", { name: model.name }),
      description: t("confirmSaveAssetBody"),
      confirmLabel: t("yesSave"),
      variant: "primary",
      action: () => {
        updateAsset(id, {
          assetModelId: model.id,
          serialNumber: serial,
          // String kosong / null (bukan undefined) supaya pengosongan ikut
          // terkirim — undefined dibuang saat payload disusun.
          description: form.description.trim(),
          status: form.status,
          locationId: (form.locationId || null) as string | undefined,
        });
        router.push(`/assets/${id}`);
      },
    });
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">{t("editAsset")}</h1>
        <Card>
          <CardHeader>
            <CardTitle>{t("editAssetOf", { name: asset.name })}</CardTitle>
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
                      <option value="">—</option>
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
                      {t("holderOnDetail")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => router.back()}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" className="flex-1 rounded-xl">
                  {t("save")}
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
