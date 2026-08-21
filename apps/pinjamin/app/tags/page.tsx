"use client";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";
import { contrastTextColor } from "@/lib/utils";
import { Plus, Trash2, Tag as TagIcon, Pipette, Check } from "lucide-react";

/** Palet warna preset untuk tag (bisa juga warna custom via color picker). */
const TAG_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
  "#CBA12C",
  "#1a365d",
];

export default function TagsPage() {
  const { tags, assets, addTag, updateTag, deleteTag } = useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[8]);
  /**
   * Warna yang sedang digeser di color picker. `<input type="color">`
   * memicu onChange terus-menerus selama slider ditarik; tanpa penahan ini
   * satu kali ganti warna mengirim puluhan PATCH ke Supabase. Nilai draft
   * dipakai untuk tampilan, penulisan ke store ditunda 300ms.
   */
  const [draftColor, setDraftColor] = useState<Record<string, string>>({});
  const colorTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const timers = colorTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  const changeTagColor = (id: string, next: string) => {
    setDraftColor((d) => ({ ...d, [id]: next }));
    clearTimeout(colorTimers.current[id]);
    colorTimers.current[id] = setTimeout(() => {
      updateTag(id, { color: next });
      delete colorTimers.current[id];
      setDraftColor((d) => {
        const rest = { ...d };
        delete rest[id];
        return rest;
      });
    }, 300);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    ask({
      title: t("confirmAddTag", { name }),
      confirmLabel: t("yesAdd"),
      variant: "primary",
      action: () => {
        addTag({ name, color });
        setName("");
      },
    });
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t("tags")}</h1>
          <p className="text-sm text-muted-foreground">{t("tagsSub")}</p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <form onSubmit={submit} className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("newTagPlaceholder")}
                className="flex-1 h-11 rounded-xl"
                required
              />
              <Button type="submit" className="rounded-xl">
                <Plus className="h-4 w-4" /> {t("add")}
              </Button>
            </form>
            {/* Pilih warna untuk tag baru */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground mr-1">
                {t("color")}:
              </span>
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={t("pickColor", { color: c })}
                  className={`h-7 w-7 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 ${
                    color === c
                      ? "border-slate-900 dark:border-white scale-110"
                      : "border-white dark:border-slate-800 shadow"
                  }`}
                  style={{ background: c }}
                >
                  {color === c && (
                    <Check
                      className="h-3.5 w-3.5 drop-shadow"
                      style={{ color: contrastTextColor(c) }}
                    />
                  )}
                </button>
              ))}
              <label
                className="h-7 w-7 rounded-full border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform relative overflow-hidden"
                title={t("customColor")}
                style={{
                  background: TAG_COLORS.includes(color) ? undefined : color,
                }}
              >
                {!TAG_COLORS.includes(color) && (
                  <Check
                    className="h-3.5 w-3.5 drop-shadow absolute"
                    style={{ color: contrastTextColor(color) }}
                  />
                )}
                <Pipette
                  className={`h-3.5 w-3.5 ${
                    TAG_COLORS.includes(color) ? "text-slate-500" : "opacity-0"
                  }`}
                />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
              {/* Preview */}
              <span
                className="ml-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm"
                style={{ background: color, color: contrastTextColor(color) }}
              >
                <TagIcon className="h-3 w-3" />
                {name || t("previewTag")}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tags.map((tg) => {
            const count = assets.filter((a) => a.tagIds.includes(tg.id)).length;
            const tagColor = draftColor[tg.id] || tg.color || "#64748b";
            return (
              <Card key={tg.id} className="overflow-hidden">
                <div
                  className="h-1.5 w-full"
                  style={{ background: tagColor }}
                />
                <CardContent className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center shadow-sm"
                    style={{
                      background: tagColor,
                      color: contrastTextColor(tagColor),
                    }}
                  >
                    <TagIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{tg.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("assetCountLabel", { count })} • {tagColor}
                    </div>
                  </div>
                  {/* Ubah warna tag */}
                  <label
                    className="h-8 w-8 rounded-lg border flex items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 relative overflow-hidden"
                    title={t("changeTagColor")}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-white/60 shadow"
                      style={{ background: tagColor }}
                    />
                    <input
                      type="color"
                      value={tagColor}
                      onChange={(e) => changeTagColor(tg.id, e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      ask({
                        title: t("confirmDeleteTag"),
                        description: t("confirmDeleteTagBody", {
                          name: tg.name,
                          count,
                        }),
                        confirmLabel: t("yesDelete"),
                        action: () => deleteTag(tg.id),
                      })
                    }
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
