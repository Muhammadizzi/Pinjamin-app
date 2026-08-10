"use client";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Link2, Loader2, CheckCircle2 } from "lucide-react";
import { uploadImage, isSupabaseConfigured, isBase64Image } from "@/lib/supabase";

type Props = {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  uploadOnly?: boolean;
};

export function ImageUpload({ value, onChange, label = "Foto Aset", uploadOnly = false }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const isSupabase = isSupabaseConfigured();

  useEffect(() => {
    setUrlInput(value || "");
    // auto switch to url mode if value is http url
    if (value && value.startsWith("http") && !isBase64Image(value)) {
      // keep upload mode default, but allow url tab
    }
  }, [value]);

  const handleFile = async (file: File) => {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Hanya file gambar yang diizinkan (jpg, png, webp).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Maksimal 5MB. Kompres dulu ya.");
      return;
    }
    setUploading(true);
    try {
      const { url, via } = await uploadImage(file);
      onChange(url);
      if (via === "supabase") {
        setError("");
      }
      // animate success
      try {
        const { animate } = await import("animejs");
        animate(".upload-success", { scale: [0.9, 1], opacity: [0, 1], duration: 400, easing: "easeOutBack" });
      } catch {}
    } catch (e: any) {
      setError(e.message || "Gagal upload");
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="font-medium">{label}</Label>
        {!uploadOnly && (
          <div className="flex gap-1 text-xs">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`px-2.5 py-1 rounded-full border text-xs font-medium ${mode === "upload" ? "bg-[#1a365d] text-white border-[#1a365d]" : "bg-white hover:bg-slate-50 text-slate-700"}`}
            >
              <Upload className="h-3 w-3 inline mr-1" />
              Upload
            </button>
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`px-2.5 py-1 rounded-full border text-xs font-medium ${mode === "url" ? "bg-[#1a365d] text-white border-[#1a365d]" : "bg-white hover:bg-slate-50 text-slate-700"}`}
            >
              <Link2 className="h-3 w-3 inline mr-1" />
              URL
            </button>
          </div>
        )}
      </div>

      {/* Preview */}
      {value ? (
        <div className="relative group">
          <div className="relative overflow-hidden rounded-2xl border bg-slate-50 dark:bg-slate-800">
            <img src={value} alt="Preview" className="h-48 w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-2 right-2 flex gap-1">
              <Button type="button" size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow" onClick={clear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="absolute bottom-2 left-2 flex gap-1.5">
              <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${isBase64Image(value) ? "bg-amber-400 text-[#0a2240]" : isSupabase ? "bg-emerald-500 text-white" : "bg-[#0a2240] text-white"}`}>
                {isBase64Image(value) ? "Base64 • Offline" : isSupabaseConfigured() ? "Supabase Storage" : "URL"}
              </span>
              {value.startsWith("data:") && <span className="text-[11px] px-2 py-1 rounded-full bg-white/90 text-slate-700">{(value.length / 1024).toFixed(0)} KB</span>}
            </div>
          </div>
          <div className="upload-success hidden" />
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Tersimpan {isBase64Image(value) ? "(akan persist di browser, untuk production aktifkan Supabase)" : value.startsWith("http") ? "(URL eksternal)" : "(Supabase)"}
          </div>
        </div>
      ) : (
        <>
          {mode === "upload" ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all backdrop-blur bg-white/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800 ${
                dragOver ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 scale-[1.01]" : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-[#0a2240] text-white flex items-center justify-center shadow-lg">
                  {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-6 w-6" />}
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    {uploading ? "Mengupload..." : dragOver ? "Lepas file di sini" : "Klik atau drag & drop gambar"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP • Maks 5MB • {isSupabase ? "akan upload ke Supabase" : "fallback base64 (offline ready)"}</div>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white">Pilih File</span>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">Drag & Drop</span>
                </div>
              </div>
              {/* subtle gold glow */}
              <div className="pointer-events-none absolute -top-10 -right-10 h-20 w-20 rounded-full bg-amber-400/10 blur-2xl" />
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
                  Simpan
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Tempel URL gambar eksternal (https://) atau gunakan mode Upload untuk file lokal.</p>
            </div>
          )}
        </>
      )}

      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2">{error}</div>}

      {!isSupabase && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-2.5 flex gap-2">
          <div className="text-amber-600 mt-0.5">⚠️</div>
          <div className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
            Supabase belum dikonfigurasi (offline mode). Gambar disimpan sebagai <b>base64</b> di browser — tetap jalan, tapi untuk production set <code className="bg-white dark:bg-slate-800 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> & <code className="bg-white dark:bg-slate-800 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di Vercel + buat bucket <code className="bg-white dark:bg-slate-800 px-1 rounded">assets</code> (public). Lihat <code>apps/pinjamin/supabase/README.md</code>.
          </div>
        </div>
      )}
    </div>
  );
}
