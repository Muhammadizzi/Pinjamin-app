"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-client";
import { useT } from "@/lib/i18n";

/**
 * Blok "kredensial demo" di bawah form hanya ditampilkan di luar production,
 * atau bila sengaja dinyalakan lewat NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=1
 * (mis. deployment demo). Di production default-nya mati.
 */
const SHOW_DEMO_CREDENTIALS =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === "1";

function safeNextPath(raw: string | null) {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  if (raw.startsWith("/login") || raw.startsWith("/api")) return "/dashboard";
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = safeNextPath(search.get("next"));
  const { login, user, loading: authLoading } = useAuth();
  const { t } = useT();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && user) router.replace(next);
  }, [authLoading, user, next, router]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { animate } = await import("animejs");
        if (mounted && formRef.current) {
          animate(formRef.current, {
            translateY: [12, 0],
            opacity: [0, 1],
            duration: 700,
            easing: "easeOutExpo",
          });
        }
      } catch {
        /* animasi opsional */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const result = await login(username.trim(), password, remember);
      if (!result.ok) {
        setErr(result.error);
        try {
          const { animate } = await import("animejs");
          if (formRef.current)
            animate(formRef.current, {
              translateX: [0, -6, 6, -4, 4, 0],
              duration: 350,
              easing: "easeInOutQuad",
            });
        } catch {
          /* ignore */
        }
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      <Link
        href="/"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-2 text-sm font-medium text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToHome")}
      </Link>
      {/* Warna dasar — terlihat sekejap sebelum foto termuat, dan jadi
          cadangan kalau file foto hilang. */}
      <div className="absolute inset-0 bg-[#0a1a30]" />

      {/* Foto kantor Garudafood sebagai latar. Pakai next/image supaya file
          asli (5712x4284, ~4MB dari kamera ponsel) otomatis diperkecil sesuai
          lebar layar dan dikirim sebagai AVIF/WebP — kalau dipasang lewat CSS
          background, browser mengunduh 4MB penuh.
          Blur hanya 3px: cukup melembutkan detail agar teks form tetap
          nyaman dibaca, tapi gedung & logo masih jelas terlihat. */}
      <Image
        src="/bg_login.jpg"
        alt=""
        aria-hidden="true"
        fill
        priority
        quality={70}
        sizes="100vw"
        /* object-position digeser ke atas: di layar ponsel yang tinggi,
           crop tengah hanya menampilkan pintu kaca — dengan 32% papan nama
           Garudafood ikut terlihat. */
        className="object-cover object-[50%_32%] scale-105 [filter:blur(3px)_saturate(1.05)_brightness(0.92)]"
      />

      {/* Scrim navy miring — kontras untuk kartu login tanpa menenggelamkan
          foto. Sengaja ringan (0.3–0.55) karena fotonya terang. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(8,22,42,0.62) 0%, rgba(10,34,64,0.34) 45%, rgba(8,26,51,0.60) 100%)",
        }}
      />
      {/* Vignette lembut — mengarahkan mata ke kartu di tengah. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 70% at 50% 45%, transparent 35%, rgba(6,17,33,0.5) 100%)",
        }}
      />

      <div ref={formRef} className="relative w-full max-w-[420px]">
        <div className="bg-white/95 dark:bg-slate-900/85 backdrop-blur-2xl rounded-[24px] shadow-[0_24px_64px_rgba(0,0,0,0.4)] border border-white/20 p-8 sm:p-8">
          <div className="flex flex-col items-center text-center mb-7">
            <span className="relative flex items-center justify-center mb-4">
              <span
                aria-hidden="true"
                className="absolute h-14 w-14 scale-95 rounded-full bg-white/85 blur-[7px]"
              />
              <span
                aria-hidden="true"
                className="absolute h-20 w-20 rounded-full bg-amber-300/25 blur-[14px]"
              />
              <Image
                src="/sigap-logo.png"
                alt="SIGAP"
                width={56}
                height={56}
                priority
                className="relative h-14 w-auto object-contain"
              />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {t("welcome")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t("loginToPinjamin")}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-slate-700 dark:text-slate-200"
              >
                {t("username")}
              </Label>
              <Input
                id="username"
                placeholder={t("username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                autoFocus
                className="h-11 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-slate-700 dark:text-slate-200"
              >
                {t("password")}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  // Pakai 'new-password' agar browser tidak auto-inject
                  // sandi lama dari password manager — sering jadi
                  // penyebab 'salah padahal sudah benar'.
                  autoComplete="new-password"
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  className="h-11 rounded-xl pr-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 min-h-11 min-w-11 flex items-center justify-center"
                  aria-label={show ? t("hidePassword") : t("showPassword")}
                >
                  {show ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-[#123367]"
              />
              {t("rememberMe")}
              <span className="text-xs text-slate-400">
                (
                {remember
                  ? t("rememberDurationLong")
                  : t("rememberDurationShort")}
                )
              </span>
            </label>

            {err && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm px-4 py-3"
              >
                {err}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || authLoading}
              className="w-full h-11 rounded-xl bg-[#123367] hover:bg-[#0e2a52] dark:bg-[#CBA12C] dark:text-[#0a2240] dark:hover:bg-[#d4b44a] text-white font-semibold shadow-lg"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                t("loginAdmin")
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
            © 2026 Garudafood • SIGAP
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a2240] flex items-center justify-center text-white/70">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
