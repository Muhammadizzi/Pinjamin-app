"use client";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import Link from "next/link";
import { QrCode, Camera, Keyboard, Check, Upload, ShieldAlert, Sparkles } from "lucide-react";

export default function ScannerPage() {
  const { assets, kits, updateAsset } = useStore(); const { t } = useT();
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [isSecure, setIsSecure] = useState(true);
  const [fileScanning, setFileScanning] = useState(false);
  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);

  const findByCode = (code: string) => {
    const a = assets.find((x) => x.qrCode === code || x.id === code);
    if (a) return { type: "asset", data: a };
    const k = kits.find((x) => x.qrCode === code || x.id === code);
    if (k) return { type: "kit", data: k };
    return null;
  };

  const handleCode = (code: string) => {
    const found = findByCode(code.trim());
    if (found) {
      setResult(found);
      setStatus(`Ditemukan ${found.type}: ${found.data.name}`);
    } else {
      setResult(null);
      setStatus(`Tidak ditemukan: ${code}`);
    }
  };

  // Check secure context
  useEffect(() => {
    if (typeof window !== "undefined") {
      const secure = window.isSecureContext;
      setIsSecure(secure);
      if (!secure) {
        setStatus("Kamera butuh HTTPS. Gunakan localhost atau upload gambar QR.");
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    if (mode !== "scan") return;
    if (typeof window !== "undefined" && !window.isSecureContext) {
      // Don't auto-start on insecure
      return;
    }

    let html5QrCode: any = null;
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled || !isMounted.current || !videoRef.current) return;
        const id = "pinjamin-qr-reader";
        let el = document.getElementById(id);
        if (!el) {
          el = document.createElement("div");
          el.id = id;
          el.style.width = "100%";
          if (videoRef.current) {
            videoRef.current.innerHTML = "";
            videoRef.current.appendChild(el);
          }
        }
        html5QrCode = new Html5Qrcode(id);
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded: string) => {
            if (isMounted.current) handleCode(decoded);
          },
          () => {}
        );
        if (isMounted.current) setStatus("Kamera aktif — arahkan ke QR");
      } catch (e: any) {
        if (isMounted.current) {
          const msg = e?.message || String(e);
          if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
            setStatus("Izin kamera ditolak. Aktifkan izin di browser atau gunakan Input Manual.");
          } else if (!window.isSecureContext || msg.includes("not supported")) {
            setStatus("Camera streaming not supported — butuh HTTPS. Gunakan Input Manual atau Upload Gambar.");
          } else {
            setStatus("Gagal akses kamera: " + msg + " — gunakan Input Manual.");
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      isMounted.current = false;
      const instance = scannerRef.current;
      scannerRef.current = null;
      if (instance) {
        try {
          const state = typeof instance.getState === "function" ? instance.getState() : null;
          if (state === 2 || state === 3) {
            const p = instance.stop();
            if (p && typeof p.catch === "function") p.catch(() => {});
          }
        } catch {}
        try {
          instance.clear();
        } catch {}
      }
      const el = document.getElementById("pinjamin-qr-reader");
      if (el && el.parentNode) {
        try {
          el.parentNode.removeChild(el);
        } catch {}
      }
    };
  }, [mode]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileScanning(true);
    setStatus("Memproses gambar...");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      // Need a temporary instance for scanFile
      const tempId = "pinjamin-qr-reader-file";
      let el = document.getElementById(tempId);
      if (!el) {
        el = document.createElement("div");
        el.id = tempId;
        el.style.display = "none";
        document.body.appendChild(el);
      }
      const tmp = new Html5Qrcode(tempId);
      const decoded = await tmp.scanFile(file, true);
      // cleanup temp
      try {
        tmp.clear();
      } catch {}
      try {
        el.remove();
      } catch {}
      handleCode(decoded);
      setStatus(`QR dari file: ${decoded}`);
    } catch (err: any) {
      setStatus("Gagal baca QR dari gambar. Pastikan QR jelas dan coba lagi.");
      console.warn(err);
    } finally {
      setFileScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isCameraError = status.includes("not supported") || status.includes("HTTPS") || status.includes("not supported by the browser");

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t("scanner")}</h1>
          <p className="text-sm text-muted-foreground">Scan cepat dengan kamera, upload gambar, atau input manual — semua jalan</p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
          <Button
            variant={mode === "scan" ? "default" : "ghost"}
            onClick={() => setMode("scan")}
            className={`rounded-xl h-11 font-semibold ${mode === "scan" ? "bg-[#123367] dark:bg-amber-400 dark:text-[#0a2240] text-white shadow" : ""}`}
          >
            <Camera className="h-4 w-4" /> Scan Kamera
          </Button>
          <Button
            variant={mode === "manual" ? "default" : "ghost"}
            onClick={() => setMode("manual")}
            className={`rounded-xl h-11 font-semibold ${mode === "manual" ? "bg-[#123367] dark:bg-amber-400 dark:text-[#0a2240] text-white shadow" : ""}`}
          >
            <Keyboard className="h-4 w-4" /> Input Manual
          </Button>
        </div>

        {!isSecure && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4 flex gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-amber-900 dark:text-amber-200">Mode tidak aman (Not Secure)</div>
              <div className="text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
                Browser blokir kamera di <code className="bg-white dark:bg-slate-900 px-1 rounded">http://0.0.0.0:5003</code>. Buka via{" "}
                <code className="bg-white dark:bg-slate-900 px-1 rounded">http://localhost:5003</code> atau{" "}
                <code className="bg-white dark:bg-slate-900 px-1 rounded">https://…e2b.app</code> untuk kamera, atau pakai <b>Upload Gambar QR</b> di bawah.
              </div>
            </div>
          </div>
        )}

        <Card className="overflow-hidden backdrop-blur-xl bg-white/80 dark:bg-slate-900/70 border-slate-200/50 dark:border-slate-800 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#123367] dark:bg-amber-400 text-white dark:text-[#0a2240] flex items-center justify-center">
                <QrCode className="h-4 w-4" />
              </div>
              Scanner
              <span className="ml-auto text-xs font-normal text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> anime.js glass
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === "scan" ? (
              <div className="space-y-3">
                <div
                  ref={videoRef}
                  className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-black aspect-[4/3] flex items-center justify-center border shadow-inner relative"
                >
                  <div id="pinjamin-qr-reader" className="w-full" />
                  {/* Placeholder when not scanning */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 pointer-events-none" style={{ display: isCameraError || !isSecure ? "flex" : "none" }}>
                    <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center mb-3">
                      <Camera className="h-8 w-8" />
                    </div>
                    <div className="text-sm font-medium">Kamera tidak tersedia di sini</div>
                    <div className="text-xs text-white/50">Upload gambar QR di bawah</div>
                  </div>
                </div>

                {/* Single status - no duplicate */}
                <div
                  className={`text-xs text-center rounded-full py-2.5 px-4 border ${
                    isCameraError ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-muted-foreground"
                  }`}
                >
                  {status || "Menunggu kamera..."}
                </div>

                {/* File upload fallback */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white dark:bg-slate-900 px-3 text-xs text-muted-foreground">atau</span>
                  </div>
                </div>

                <label className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileScan} />
                  <div className="h-10 w-10 rounded-xl bg-[#123367] dark:bg-amber-400 text-white dark:text-[#0a2240] flex items-center justify-center">
                    {fileScanning ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload className="h-5 w-5" />}
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold">{fileScanning ? "Memproses..." : "Upload Gambar QR"}</div>
                    <div className="text-xs text-muted-foreground">Pilih foto QR dari galeri — jalan tanpa kamera</div>
                  </div>
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    placeholder="Masukkan kode QR (mis. PIN-MBP001A)"
                    value={manual}
                    onChange={(e) => setManual(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCode(manual)}
                    className="h-12 rounded-xl font-mono bg-white dark:bg-slate-800 backdrop-blur pr-20"
                  />
                  <Button
                    onClick={() => handleCode(manual)}
                    disabled={!manual.trim()}
                    className="absolute right-1 top-1 h-10 rounded-lg bg-[#123367] dark:bg-amber-400 dark:text-[#0a2240] text-white px-4"
                    size="sm"
                  >
                    Cari
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">Contoh: PIN-MBP001A, PIN-PRJ002B, KIT-001 • Tekan Enter untuk cari</p>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white dark:bg-slate-900 px-3 text-xs text-muted-foreground">atau</span>
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-xl border bg-white dark:bg-slate-800 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 flex items-center justify-center">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Upload Gambar QR</div>
                    <div className="text-xs text-muted-foreground">Foto QR dari kamera galeri</div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileScan} />
                  <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => fileInputRef.current?.click()}>
                    Pilih File
                  </Button>
                </label>
              </div>
            )}

            {result && (
              <div className="rounded-2xl border bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 p-4 space-y-3 shadow-lg backdrop-blur">
                <div className="flex items-center gap-2">
                  <Badge variant="info" className="bg-[#123367] text-white dark:bg-amber-400 dark:text-[#0a2240]">
                    {result.type.toUpperCase()}
                  </Badge>
                  <span className="font-semibold">{result.data.name}</span>
                  <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-sm text-muted-foreground">{result.data.description || "-"}</div>
                {result.type === "asset" && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border shadow-sm">
                      <div className="text-muted-foreground text-[11px] tracking-wide uppercase">QR</div>
                      <div className="font-mono font-bold">{result.data.qrCode}</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border shadow-sm">
                      <div className="text-muted-foreground text-[11px] tracking-wide uppercase">Status</div>
                      <Badge variant={result.data.status === "AVAILABLE" ? "success" : "info"}>{result.data.status}</Badge>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Link href={result.type === "asset" ? `/assets/${result.data.id}` : `/kits/${result.data.id}`}>
                    <Button className="w-full rounded-xl bg-[#123367] hover:bg-[#1a3d6d] text-white" size="sm">
                      Lihat Detail
                    </Button>
                  </Link>
                  {result.type === "asset" && (
                    <Link href={`/bookings/new`}>
                      <Button variant="outline" className="w-full rounded-xl" size="sm">
                        Pinjamkan
                      </Button>
                    </Link>
                  )}
                  {result.type === "asset" && result.data.status === "CHECKED_OUT" && (
                    <Button
                      variant="secondary"
                      className="w-full rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100"
                      size="sm"
                      onClick={() => {
                        updateAsset(result.data.id, {
                          status: "AVAILABLE",
                          custodianId: null,
                        });
                        setStatus("Aset ditandai kembali (AVAILABLE)");
                      }}
                    >
                      <Check className="h-4 w-4" /> Kembalikan
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/60 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
                <QrCode className="h-4 w-4" />
              </div>
              Aset Terbaru
              <span className="text-xs font-normal text-muted-foreground">tap untuk simulasi</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {assets.slice(0, 6).map((a) => (
              <button
                key={a.id}
                onClick={() => handleCode(a.qrCode)}
                className="group border rounded-xl p-3 text-left hover:bg-white dark:hover:bg-slate-800 bg-white/50 dark:bg-slate-800/30 backdrop-blur transition-all hover:shadow-md hover:scale-[1.02] hover:border-[#123367]/20"
              >
                <div className="font-medium text-sm truncate group-hover:text-[#123367] dark:group-hover:text-amber-200">{a.name}</div>
                <div className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <QrCode className="h-3 w-3" />
                  {a.qrCode}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
