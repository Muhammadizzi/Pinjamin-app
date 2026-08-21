"use client";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  X,
  Image as ImageIcon,
  Link2,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  uploadImage,
  isSupabaseConfigured,
  isBase64Image,
  type UploadKind,
} from "@/lib/supabase";
import { AssetImage } from "@/components/ui/asset-image";
import { useT } from "@/lib/i18n";

type Props = {
  value?: string;
  onChange: (url: string) => void;
  /** Judul di atas kotak. Default: "Foto Aset" sesuai bahasa aktif. */
  label?: string;
  uploadOnly?: boolean;
  /**
   * Menentukan folder tujuan di bucket `assets` (aset/lokasi/kit/avatar).
   * Tanpa ini semua foto menumpuk di satu folder tanpa identitas.
   */
  kind?: UploadKind;
};

/**
 * Upload foto bergaya "kotak rounded-square" (seperti daftar Assets referensi):
 * kotak abu-abu dengan ikon gambar di tengah; klik / drag & drop untuk memilih
 * file. Setelah terisi, kotak menampilkan foto dan bisa diganti/dihapus.
 */
export function ImageUpload({
  value,
  onChange,
  label,
  uploadOnly = false,
  kind = "aset",
}: Props) {
  const { t } = useT();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const isSupabase = isSupabaseConfigured();

  useEffect(() => {
    setUrlInput(value || "");
  }, [value]);

  const handleFile = async (file: File) => {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError(t("onlyImageFiles"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t("maxFileSize"));
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadImage(file, kind);
      onChange(url);
      // animate success
      try {
        const { animate } = await import("animejs");
        animate(".upload-success", {
          scale: [0.9, 1],
          opacity: [0, 1],
          duration: 400,
          easing: "easeOutBack",
        });
      } catch {}
    } catch (e: any) {
      setError(e.message || t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const clear = () => {
    onChange("");
    setUrlInput("");
    setError("");
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <Label className="font-medium">{label ?? t("assetPhoto")}</Label>
        {!uploadOnly && !value && (
          <div className="flex gap-1 text-xs">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`px-2.5 py-1 rounded-full border text-xs font-medium ${
                mode === "upload"
                  ? "bg-[#1a365d] text-white border-[#1a365d]"
                  : "bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
              }`}
            >
              <Upload className="h-3 w-3 inline mr-1" />
              Upload
            </button>
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`px-2.5 py-1 rounded-full border text-xs font-medium ${
                mode === "url"
                  ? "bg-[#1a365d] text-white border-[#1a365d]"
                  : "bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
              }`}
            >
              <Link2 className="h-3 w-3 inline mr-1" />
              URL
            </button>
          </div>
        )}
      </div>

      {/* Terisi: kotak berisi foto */}
      {value ? (
        <div className="upload-success flex items-start gap-4">
          <div className="relative group">
            <AssetImage src={value} alt={t("preview")} size="xl" />
            <button
              type="button"
              onClick={clear}
              aria-label={t("deletePhoto")}
              className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-white dark:bg-slate-700 border shadow flex items-center justify-center text-slate-600 dark:text-slate-200 hover:text-red-600 hover:border-red-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 space-y-2 pt-1">
            <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {t("photoSaved")}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  isBase64Image(value)
                    ? "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900"
                    : isSupabase
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900"
                    : "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                }`}
              >
                {isBase64Image(value)
                  ? "Base64 • Offline"
                  : isSupabaseConfigured()
                  ? "Supabase Storage"
                  : t("externalUrl")}
              </span>
              {isBase64Image(value) && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  {(value.length / 1024).toFixed(0)} KB
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1a365d] dark:text-amber-300 hover:underline disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {uploading ? t("uploading") : t("replacePhoto")}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPick}
            />
          </div>
        </div>
      ) : mode === "upload" ? (
        /* Kosong: kotak placeholder + teks di samping (gaya referensi) */
        <div className="flex items-center gap-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            aria-label={t("pickAssetPhoto")}
            className={`relative h-28 w-28 shrink-0 rounded-2xl border-2 flex items-center justify-center cursor-pointer transition-all ${
              dragOver
                ? "border-amber-400 bg-amber-50/60 dark:bg-amber-950/20 scale-[1.03]"
                : "border-dashed border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:border-[#1a365d]/40 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/70"
            }`}
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 text-[#1a365d] dark:text-slate-300 animate-spin" />
            ) : (
              <ImageIcon
                className={`h-10 w-10 transition-colors ${
                  dragOver
                    ? "text-amber-500"
                    : "text-slate-400 dark:text-slate-500"
                }`}
                strokeWidth={1.75}
              />
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPick}
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {uploading
                ? t("uploading")
                : dragOver
                ? t("dropFileHere")
                : t("clickOrDrag")}
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              PNG, JPG, WEBP • max 5MB
              <br />
              {t("photoHint")}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-xl"
            >
              <Upload className="h-3.5 w-3.5" /> {t("pickFile")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/foto.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 h-11 rounded-xl bg-white/70 backdrop-blur"
            />
            <Button
              type="button"
              onClick={() => {
                if (urlInput.trim()) {
                  onChange(urlInput.trim());
                }
              }}
              className="rounded-xl bg-[#0a2240] hover:bg-[#12345a] text-white"
            >
              {t("save")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("urlModeHint")}</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs px-3 py-2">
          {error}
        </div>
      )}

      {!isSupabase && (
        <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300/80">
          ⚠️ {t("offlineStorageNote")}
        </p>
      )}
    </div>
  );
}
