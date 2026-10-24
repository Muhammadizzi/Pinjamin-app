"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { ArrowLeft, MapPin } from "lucide-react";

export default function NewLocationPage() {
  const router = useRouter();
  const { addLocation } = useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState({
    name: "",
    description: "",
    image: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return alert(t("nameRequired"));
    ask({
      title: t("confirmAddLocation", { name: form.name.trim() }),
      description: t("confirmAddLocationRegularBody"),
      confirmLabel: t("yesAdd"),
      variant: "primary",
      action: () => {
        addLocation({
          name: form.name.trim(),
          description: form.description,
          image: form.image || undefined,
        } as any);
        router.push("/locations");
      },
    });
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/locations"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#1a365d] dark:text-amber-200 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          {t("backToLocations")}
        </Link>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            {t("addLocationHeading")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("addLocationHeadingSub")}
          </p>
        </div>

        <Card className="border-slate-200 dark:border-slate-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#1a365d] text-white flex items-center justify-center">
                <MapPin className="h-4 w-4" strokeWidth={1.5} />
              </div>
              {t("newLocationForm")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label>
                  {t("name")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ruang IT, Gudang A"
                  className="h-11 rounded-xl"
                  required
                />
              </div>

              <ImageUpload
                kind="lokasi"
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url })}
                label={t("placePhoto")}
                uploadOnly
              />

              <div className="space-y-2">
                <Label>{t("description")}</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder={t("locationDescriptionPlaceholder")}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Link href="/locations" className="flex-1">
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
                  className="flex-1 rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white h-11 font-semibold"
                >
                  {t("saveLocation")}
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
