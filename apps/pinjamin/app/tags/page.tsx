"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Plus, Trash2, Tag as TagIcon } from "lucide-react";

export default function TagsPage() {
  const { tags, assets, addTag, deleteTag } = useStore(); const { t } = useT();
  const [name, setName] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    addTag({ name });
    setName("");
  };
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("tags")}</h1>
          <p className="text-sm text-muted-foreground">
            Label fleksibel lintas kategori (many-to-many)
          </p>
        </div>
        <Card>
          <CardContent className="p-4">
            <form onSubmit={submit} className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama tag baru..."
                className="flex-1 h-11 rounded-xl"
                required
              />
              <Button type="submit" className="rounded-xl">
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tags.map((t) => {
            const count = assets.filter((a) => a.tagIds.includes(t.id)).length;
            return (
              <Card key={t.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-red-100 dark:bg-red-900 flex items-center justify-center">
                    <TagIcon className="h-4 w-4 text-[#0a2240]" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {count} aset
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTag(t.id)}
                    className="text-[#0a2240]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
