"use client";
import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { Plus, Trash2, MapPin, Pencil } from "lucide-react";
import type { Location } from "@/lib/types";

/**
 * Daftar lokasi — satu tingkat, berurut nama.
 *
 * Dulu lokasi bisa bersarang (area › ruangan) dan halaman ini membaginya ke
 * seksi Area dan Lokasi. Fitur itu dihapus 24 Okt 2026; lihat
 * lib/location-path.ts.
 */
export default function LocationsPage() {
  const { locations, assets, updateLocation, deleteLocation } = useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    image: "",
  });

  const urut = [...locations].sort((a, b) => a.name.localeCompare(b.name));

  const startEdit = (l: Location) => {
    setForm({
      name: l.name,
      description: l.description || "",
      image: l.image || "",
    });
    setEdit(l.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !edit) return;
    ask({
      title: t("confirmEditLocation", { name: form.name }),
      confirmLabel: t("yesSave"),
      variant: "primary",
      action: () => {
        updateLocation(edit, {
          name: form.name,
          description: form.description,
          image: form.image || undefined,
        } as any);
        setEdit(null);
        setForm({ name: "", description: "", image: "" });
      },
    });
  };

  const cancelEdit = () => {
    setEdit(null);
    setForm({ name: "", description: "", image: "" });
  };

  const LocRow = ({ l }: { l: Location }) => {
    const assetCount = assets.filter((a) => a.locationId === l.id).length;
    return (
      <div className="flex items-center gap-3">
        {l.image ? (
          <img
            src={l.image}
            alt={l.name}
            className="h-10 w-10 rounded-lg object-cover border shrink-0"
          />
        ) : (
          <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-[#1a365d]">
            <MapPin className="h-5 w-5 text-white" strokeWidth={1.5} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{l.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {l.description || "-"}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("assetCountLabel", { count: assetCount })}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => startEdit(l)}
        >
          <Pencil className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() =>
            ask({
              title: t("confirmDeleteLocation"),
              description: t("confirmDeleteLocationBody", { name: l.name }),
              confirmLabel: t("yesDelete"),
              action: () => deleteLocation(l.id),
            })
          }
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
        </Button>
      </div>
    );
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t("locations")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("locationsSummary", { count: locations.length })}
            </p>
          </div>
          <Link href="/locations/new">
            <Button className="rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white shadow">
              <Plus className="h-4 w-4" strokeWidth={1.5} /> {t("add")}
            </Button>
          </Link>
        </div>

        {/* Edit form only — tidak tampil saat tambah baru (sudah di /locations/new) */}
        {edit && (
          <Card className="border-amber-200 dark:border-amber-900 shadow-lg">
            <CardContent className="p-6">
              <form onSubmit={submitEdit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{t("editLocation")}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                  >
                    {t("cancel")}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>{t("name")} *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={cancelEdit}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 rounded-xl bg-[#1a365d] hover:bg-[#243a5e] text-white"
                  >
                    {t("update")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {urut.length > 0 && (
          <div className="space-y-2">
            {urut.map((l) => (
              <Card key={l.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <LocRow l={l} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {locations.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <MapPin className="h-7 w-7 text-slate-400" strokeWidth={1.5} />
              </div>
              <div className="font-medium">{t("noLocationsYet")}</div>
              <div className="text-sm text-muted-foreground mb-4">
                {t("noLocationsHint")}
              </div>
              <Link href="/locations/new">
                <Button className="rounded-xl">{t("addFirstLocation")}</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {confirmDialog}
    </AppShell>
  );
}
