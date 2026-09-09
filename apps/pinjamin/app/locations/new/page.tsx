"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { ArrowLeft, MapPin, Plus } from "lucide-react";

export default function NewLocationPage() {
  const router = useRouter();
  const { locations, addLocation } = useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState({
    name: "",
    description: "",
    parentId: "",
    image: "",
  });
  const [showParentCreate, setShowParentCreate] = useState(false);
  const [parentName, setParentName] = useState("");

  /**
   * Semua lokasi boleh dipilih sebagai area — tidak ada tipe yang harus
   * dideklarasikan lebih dulu.
   *
   * Dulu daftar ini disaring ke lokasi yang sudah ditandai "parent". Akibatnya
   * pada pemasangan baru dropdown-nya KOSONG, dan admin tidak punya petunjuk
   * apa pun bahwa dia harus membuat lokasi bertipe parent lebih dulu. Sebuah
   * lokasi sekarang menjadi area dengan sendirinya begitu ada yang ditempatkan
   * di dalamnya.
   */
  const areaOptions = [...locations].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

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
          parentId: form.parentId || null,
          image: form.image || undefined,
        } as any);
        router.push("/locations");
      },
    });
  };

  const handleCreateParent = () => {
    if (!parentName.trim()) return;
    ask({
      title: t("confirmAddParentLocation", { name: parentName.trim() }),
      confirmLabel: t("yesAdd"),
      variant: "primary",
      action: () => {
        const id = addLocation({
          name: parentName.trim(),
          description: "",
          parentId: null,
          image: "",
        } as any);
        // Langsung pilih parent yang baru dibuat
        setForm((f) => ({ ...f, parentId: id }));
        setParentName("");
        setShowParentCreate(false);
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

              {/* Area: lokasi mana pun boleh menaungi lokasi lain. */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("areaLabel")}</Label>
                  <button
                    type="button"
                    onClick={() => setShowParentCreate(!showParentCreate)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#CBA12C] text-[#1a365d] text-xs font-bold hover:bg-amber-300 border border-[#CBA12C] shadow-sm transition-colors"
                  >
                    <Plus className="h-3 w-3" strokeWidth={1.5} />
                    {t("createNewArea")}
                  </button>
                </div>
                <Select
                  value={form.parentId}
                  onChange={(e) =>
                    setForm({ ...form, parentId: e.target.value })
                  }
                >
                  <option value="">{t("noAreaStandalone")}</option>
                  {areaOptions.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
                {showParentCreate && (
                  <div className="rounded-xl border-2 border-[#CBA12C]/30 bg-amber-50 dark:bg-slate-800 p-3 space-y-2 animate-in fade-in">
                    <Label className="text-xs">{t("newParentName")} *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        placeholder="Gedung Utama"
                        className="h-9 rounded-lg bg-white dark:bg-slate-900 flex-1"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateParent}
                        className="rounded-lg bg-[#1a365d] text-white h-9 px-4"
                      >
                        {t("createShort")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowParentCreate(false)}
                        className="h-9"
                      >
                        {t("cancel")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("parentAutoSelected")}
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{t("areaHint")}</p>
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
