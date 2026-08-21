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
import {
  QrCode,
  Camera,
  Keyboard,
  Check,
  Upload,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

/**
 * Id unik untuk elemen host html5-qrcode. Elemen ini dibuat dan dihapus
 * SEPENUHNYA oleh effect secara imperatif (bukan oleh JSX/React), sehingga
 * React tidak pernah mencoba removeChild pada node yang sudah hilang —
 * inilah sumber crash sebelumnya:
 *
 *   NotFoundError: The object can not be found here (removeChild)
 *
 * Bug lama: `<div id="pinjamin-qr-reader">` di-render lewat JSX, lalu
 * cleanup effect memanggil `el.parentNode.removeChild(el)` di belakang
 * React. Saat user pindah ke tab "Input Manual" (atau StrictMode dev
 * me-remount effect), React reconcile menyentuh node yang sudah dihapus
 * manual → crash. `videoRef.current.innerHTML = ""` juga menyapu overlay
 * placeholder milik React — pola crash yang sama.
 */
const QR_READER_ID = "pinjamin-qr-reader";

export default function ScannerPage() {
  const { assets, kits, updateAsset } = useStore();
  const { t, assetStatus } = useT();
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [isSecure, setIsSecure] = useState(true);
  const [fileScanning, setFileScanning] = useState(false);
  /** true bila kamera gagal / tidak didukung — dipakai untuk gaya & placeholder. */
  const [cameraError, setCameraError] = useState(false);
  /**
   * Container yang anak-anaknya dimiliki effect (html5-qrcode), BUKAN React.
   * React hanya merender pembungkus kosong ini; overlay placeholder dipindah
   * menjadi sibling absolute agar tidak pernah tersapu manipulasi DOM library.
   */
  const readerHostRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const findByCode = (code: string) => {
    const a = assets.find((x) => x.qrCode === code || x.id === code);
    if (a) return { type: "asset", data: a };
    const k = kits.find((x) => x.qrCode === code || x.id === code);
    if (k) return { type: "kit", data: k };
    return null;
  };

  /**
   * Kandidat kode dari teks hasil decode. QR yang di-download dari aplikasi
   * berisi URL penuh (mis. "http://localhost:5003/assets/AB12?qr=PIN-XYZ"),
   * BUKAN kode polos — tanpa diekstrak, findByCode selalu gagal ("Tidak
   * ditemukan"). Ambil param ?qr= lalu segmen path /assets|kits/<id>.
   */
  const extractCodeCandidates = (raw: string): string[] => {
    const out: string[] = [];
    try {
      const u = new URL(raw);
      const qr = u.searchParams.get("qr");
      if (qr) out.push(qr.trim());
      const m = u.pathname.match(/\/(assets|kits)\/([^/?#]+)/);
      if (m && m[2]) out.push(decodeURIComponent(m[2]).trim());
    } catch {
      /* bukan URL — pakai teks apa adanya */
    }
    if (!out.includes(raw)) out.push(raw);
    return out;
  };

  // Ref agar callback decode kamera selalu memanggil handleCode versi terbaru
  // (data assets/kits terkini) walau effect scanner hanya jalan sekali per mode.
  const handleCodeRef = useRef<(code: string) => void>(() => {});

  const handleCode = (code: string) => {
    const raw = code.trim();
    let found: any = null;
    for (const candidate of extractCodeCandidates(raw)) {
      found = findByCode(candidate);
      if (found) break;
    }
    if (found) {
      setResult(found);
      setStatus(t("scanFoundIt", { type: found.type, name: found.data.name }));
    } else {
      setResult(null);
      setStatus(t("scanNotFound", { code: raw }));
    }
  };
  handleCodeRef.current = handleCode;

  // Check secure context
  useEffect(() => {
    if (typeof window !== "undefined") {
      const secure = window.isSecureContext;
      setIsSecure(secure);
      if (!secure) {
        setCameraError(true);
        setStatus(t("cameraNeedsHttps"));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode !== "scan") return;
    if (typeof window !== "undefined" && !window.isSecureContext) {
      // Don't auto-start on insecure
      return;
    }
    const host = readerHostRef.current;
    if (!host) return;

    let cancelled = false;

    // Elemen host html5-qrcode: dibuat imperatif, dimiliki effect ini.
    // React tidak merender-nya, jadi pembuatan/penghapusan manual aman
    // terhadap proses reconcile (fix NotFoundError removeChild).
    const el = document.createElement("div");
    el.id = QR_READER_ID;
    el.style.width = "100%";
    host.appendChild(el);

    let instance: any = null;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        instance = new Html5Qrcode(QR_READER_ID);
        scannerRef.current = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded: string) => {
            handleCodeRef.current(decoded);
          },
          () => {}
        );
        if (cancelled) {
          // User pindah tab/unmount saat kamera masih starting:
          // hentikan segera agar stream tidak bocor.
          try {
            await instance.stop();
            instance.clear();
          } catch {}
          return;
        }
        setCameraError(false);
        setStatus(t("cameraActive"));
      } catch (e: any) {
        if (cancelled) return;
        setCameraError(true);
        const msg = e?.message || String(e);
        if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
          setStatus(t("cameraDenied"));
        } else if (!window.isSecureContext || msg.includes("not supported")) {
          setStatus(t("cameraUnsupported"));
        } else {
          setStatus(t("cameraFailed", { msg }));
        }
      }
    })();

    return () => {
      cancelled = true;
      const inst = instance;
      instance = null;
      scannerRef.current = null;
      // Hanya instance + elemen milik effect ini yang disentuh — tidak ada
      // removeChild pada node yang di-render React.
      (async () => {
        if (inst) {
          try {
            const state =
              typeof inst.getState === "function" ? inst.getState() : null;
            if (state === 2 || state === 3) {
              await inst.stop();
            }
          } catch {}
          try {
            inst.clear();
          } catch {}
        }
        // el dimiliki effect ini (bukan node React). `.remove()` pada node
        // tanpa parent adalah no-op — aman saat host sudah di-unmount React.
        try {
          el.remove();
        } catch {}
      })();
    };
  }, [mode]);

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileScanning(true);
    setStatus(t("processingImage"));
    // Temporary off-DOM host khusus scanFile — dibuat & dihapus imperatif,
    // tidak beririsan dengan tree React.
    const tempId = "pinjamin-qr-reader-file";
    const el = document.createElement("div");
    el.id = tempId;
    el.style.display = "none";
    document.body.appendChild(el);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const tmp = new Html5Qrcode(tempId);
      // showImage=false — container disembunyikan, preview tak perlu dirender
      const decoded = await tmp.scanFile(file, false);
      try {
        tmp.clear();
      } catch {}
      handleCode(decoded);
      setStatus(t("qrFromFile", { code: decoded }));
    } catch (err: any) {
      setStatus(t("qrFileFailed"));
      console.warn(err);
    } finally {
      // Selalu bersihkan host temporer (sebelumnya bocor saat error).
      try {
        el.remove();
      } catch {}
      setFileScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /**
   * Status kamera bermasalah? Sebelumnya dideteksi dari isi teks status —
   * rapuh, dan langsung rusak begitu teksnya diterjemahkan. Sekarang pakai
   * penanda boolean tersendiri.
   */
  const isCameraError = cameraError;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {t("scanner")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("scannerHeadSub")}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
          <Button
            variant={mode === "scan" ? "default" : "ghost"}
            onClick={() => setMode("scan")}
            className={`rounded-xl h-11 font-semibold ${
              mode === "scan"
                ? "bg-[#123367] dark:bg-amber-400 dark:text-[#0a2240] text-white shadow"
                : ""
            }`}
          >
            <Camera className="h-4 w-4" /> {t("scanCamera")}
          </Button>
          <Button
            variant={mode === "manual" ? "default" : "ghost"}
            onClick={() => setMode("manual")}
            className={`rounded-xl h-11 font-semibold ${
              mode === "manual"
                ? "bg-[#123367] dark:bg-amber-400 dark:text-[#0a2240] text-white shadow"
                : ""
            }`}
          >
            <Keyboard className="h-4 w-4" /> {t("inputManual")}
          </Button>
        </div>

        {!isSecure && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4 flex gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-amber-900 dark:text-amber-200">
                {t("insecureModeTitle")}
              </div>
              <div className="text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
                {t("insecureModeBody")}
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
              {t("scannerCardTitle")}
              <span className="ml-auto text-xs font-normal text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> anime.js glass
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === "scan" ? (
              <div className="space-y-3">
                <div className="relative">
                  {/*
                    Host kamera: React HANYA merender pembungkus kosong ini.
                    Anak (elemen #pinjamin-qr-reader + video/canvas library)
                    dibuat & dihapus imperatif oleh effect — jangan pernah
                    merender anak React di dalamnya.
                  */}
                  <div
                    ref={readerHostRef}
                    className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-black aspect-[4/3] w-full border shadow-inner"
                  />
                  {/* Placeholder when not scanning (sibling sibling, murni React) */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center text-white/70 pointer-events-none rounded-2xl"
                    style={{
                      display: isCameraError || !isSecure ? "flex" : "none",
                    }}
                  >
                    <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center mb-3">
                      <Camera className="h-8 w-8" />
                    </div>
                    <div className="text-sm font-medium">
                      {t("cameraUnavailableHere")}
                    </div>
                    <div className="text-xs text-white/50">
                      {t("uploadQrBelow")}
                    </div>
                  </div>
                </div>

                {/* Single status - no duplicate */}
                <div
                  className={`text-xs text-center rounded-full py-2.5 px-4 border ${
                    isCameraError
                      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-muted-foreground"
                  }`}
                >
                  {status || t("waitingForCamera")}
                </div>

                {/* File upload fallback */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white dark:bg-slate-900 px-3 text-xs text-muted-foreground">
                      {t("or")}
                    </span>
                  </div>
                </div>

                <label className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileScan}
                  />
                  <div className="h-10 w-10 rounded-xl bg-[#123367] dark:bg-amber-400 text-white dark:text-[#0a2240] flex items-center justify-center">
                    {fileScanning ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold">
                      {fileScanning ? t("processingShort") : t("uploadQrImage")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("pickQrFromGallery")}
                    </div>
                  </div>
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    placeholder={t("manualCodePlaceholder")}
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
                    {t("searchAction")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {t("manualExampleHint")}
                </p>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white dark:bg-slate-900 px-3 text-xs text-muted-foreground">
                      {t("or")}
                    </span>
                  </div>
                </div>

                {/* CATATAN: jangan pakai <label> + tombol ber-onClick di
                    dalamnya — label meneruskan klik kedua ke input file
                    (double-activation) sehingga dialog file batal terbuka
                    di Safari. Pakai div biasa dengan satu onClick. */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className="flex items-center gap-3 rounded-xl border bg-white dark:bg-slate-800 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 flex items-center justify-center">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {t("uploadQrImage")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("qrPhotoFromGallery")}
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileScan}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg pointer-events-none"
                    tabIndex={-1}
                  >
                    {t("pickFile")}
                  </Button>
                </div>
              </div>
            )}

            {result && (
              <div className="rounded-2xl border bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 p-4 space-y-3 shadow-lg backdrop-blur">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="info"
                    className="bg-[#123367] text-white dark:bg-amber-400 dark:text-[#0a2240]"
                  >
                    {result.type.toUpperCase()}
                  </Badge>
                  <span className="font-semibold">{result.data.name}</span>
                  <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-sm text-muted-foreground">
                  {result.data.description || "-"}
                </div>
                {result.type === "asset" && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border shadow-sm">
                      <div className="text-muted-foreground text-[11px] tracking-wide uppercase">
                        QR
                      </div>
                      <div className="font-mono font-bold">
                        {result.data.qrCode}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border shadow-sm">
                      <div className="text-muted-foreground text-[11px] tracking-wide uppercase">
                        Status
                      </div>
                      <Badge
                        variant={
                          result.data.status === "AVAILABLE"
                            ? "success"
                            : "info"
                        }
                      >
                        {assetStatus(result.data.status)}
                      </Badge>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Link
                    href={
                      result.type === "asset"
                        ? `/assets/${result.data.id}`
                        : `/kits/${result.data.id}`
                    }
                  >
                    <Button
                      className="w-full rounded-xl bg-[#123367] hover:bg-[#1a3d6d] text-white"
                      size="sm"
                    >
                      {t("viewDetail")}
                    </Button>
                  </Link>
                  {result.type === "asset" && (
                    <Link href={`/bookings/new`}>
                      <Button
                        variant="outline"
                        className="w-full rounded-xl"
                        size="sm"
                      >
                        {t("lendAction")}
                      </Button>
                    </Link>
                  )}
                  {result.type === "asset" &&
                    result.data.status === "CHECKED_OUT" && (
                      <Button
                        variant="secondary"
                        className="w-full rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100"
                        size="sm"
                        onClick={() => {
                          updateAsset(result.data.id, {
                            status: "AVAILABLE",
                            custodianId: null,
                          });
                          setStatus(t("markReturnedShort"));
                        }}
                      >
                        <Check className="h-4 w-4" /> {t("returnAction")}
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
              {t("recentAssets")}
              <span className="text-xs font-normal text-muted-foreground">
                {t("tapToSimulate")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {assets.slice(0, 6).map((a) => (
              <button
                key={a.id}
                onClick={() => handleCode(a.qrCode)}
                className="group border rounded-xl p-3 text-left hover:bg-white dark:hover:bg-slate-800 bg-white/50 dark:bg-slate-800/30 backdrop-blur transition-all hover:shadow-md hover:scale-[1.02] hover:border-[#123367]/20"
              >
                <div className="font-medium text-sm truncate group-hover:text-[#123367] dark:group-hover:text-amber-200">
                  {a.name}
                </div>
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
