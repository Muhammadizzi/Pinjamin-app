"use client";
import { AssetImage } from "@/components/ui/asset-image";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { AssetModel } from "@/lib/types";

/**
 * Ringkasan model yang dipilih di form unit — kategori, spesifikasi, dan foto
 * yang akan dipakai unit ini. Baca saja: mengubahnya lewat menu Model Aset.
 */
export function ModelPreview({ model }: { model: AssetModel }) {
  const { categories } = useStore();
  const { t } = useT();
  const cat = categories.find((c) => c.id === model.categoryId);
  return (
    <div className="flex gap-4 items-center rounded-xl border bg-muted/40 p-3">
      <AssetImage src={model.image} alt={model.name} size="lg" />
      <div className="min-w-0 space-y-1 text-sm">
        <div className="font-semibold">{model.name}</div>
        <div className="text-muted-foreground">
          {t("category")}: {cat?.name || "-"}
        </div>
        <div className="text-muted-foreground">
          {t("specLabel")}: {model.spec || "-"}
        </div>
      </div>
    </div>
  );
}
