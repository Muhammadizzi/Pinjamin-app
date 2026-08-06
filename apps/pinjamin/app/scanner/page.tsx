"use client";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { QrCode, Camera, Keyboard, Check, X } from "lucide-react";

export default function ScannerPage() {
  const { assets, kits, updateAsset } = useStore();
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState("");
  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (mode !== "scan") return;
    let html5QrCode: any = null;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!videoRef.current) return;
        // ensure id exists
        const id = "pinjamin-qr-reader";
        let el = document.getElementById(id);
        if (!el) {
          el = document.createElement("div");
          el.id = id;
          el.style.width = "100%";
          videoRef.current.appendChild(el);
        }
        html5QrCode = new Html5Qrcode(id);
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded: string) => {
            handleCode(decoded);
          },
          () => {}
        );
        setStatus("Kamera aktif — arahkan ke QR");
      } catch (e: any) {
        setStatus(
          "Gagal akses kamera: " + e.message + " — gunakan input manual."
        );
        setMode("manual");
      }
    })();
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              scannerRef.current.clear();
            } catch {}
          });
      }
    };
  }, [mode]);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">QR Scanner</h1>
          <p className="text-sm text-muted-foreground">
            Scan QR aset/kit untuk aksi cepat
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={mode === "scan" ? "default" : "outline"}
            onClick={() => setMode("scan")}
            className="flex-1 rounded-xl"
          >
            <Camera className="h-4 w-4" /> Scan Kamera
          </Button>
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            onClick={() => setMode("manual")}
            className="flex-1 rounded-xl"
          >
            <Keyboard className="h-4 w-4" /> Input Manual
          </Button>
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-5 w-5" /> Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === "scan" ? (
              <div>
                <div
                  ref={videoRef}
                  className="rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border"
                >
                  {/* Html5Qrcode will inject video here */}
                  <div id="pinjamin-qr-reader" className="w-full" />
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  {status}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  placeholder="Masukkan kode QR (mis. PIN-MBP001A)"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  className="h-12 rounded-xl font-mono"
                />
                <Button
                  onClick={() => handleCode(manual)}
                  className="w-full rounded-xl"
                >
                  <QrCode className="h-4 w-4" /> Cari
                </Button>
                <p className="text-xs text-muted-foreground">
                  Contoh: PIN-MBP001A, PIN-PRJ002B, KIT-001
                </p>
              </div>
            )}

            {result && (
              <div className="rounded-2xl border bg-slate-50 dark:bg-slate-800 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="info">{result.type.toUpperCase()}</Badge>
                  <span className="font-semibold">{result.data.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {result.data.description || "-"}
                </div>
                {result.type === "asset" && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-2">
                      <div className="text-muted-foreground">QR</div>
                      <div className="font-mono font-bold">
                        {result.data.qrCode}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-2">
                      <div className="text-muted-foreground">Status</div>
                      <Badge
                        variant={
                          result.data.status === "AVAILABLE"
                            ? "success"
                            : "info"
                        }
                      >
                        {result.data.status}
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
                    <Button className="w-full rounded-xl" size="sm">
                      Lihat Detail
                    </Button>
                  </Link>
                  {result.type === "asset" && (
                    <Link href={`/bookings/new`}>
                      <Button
                        variant="outline"
                        className="w-full rounded-xl"
                        size="sm"
                      >
                        Pinjamkan
                      </Button>
                    </Link>
                  )}
                  {result.type === "asset" &&
                    result.data.status === "CHECKED_OUT" && (
                      <Button
                        variant="secondary"
                        className="w-full rounded-xl"
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
            {!result && status && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
                {status}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Aset Terbaru (tap untuk simulasi scan)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {assets.slice(0, 6).map((a) => (
              <button
                key={a.id}
                onClick={() => handleCode(a.qrCode)}
                className="border rounded-xl p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="font-medium text-sm truncate">{a.name}</div>
                <div className="text-xs font-mono text-muted-foreground">
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
