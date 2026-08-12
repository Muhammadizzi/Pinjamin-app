"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subtle entrance
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
      } catch {}
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login gagal");
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
      try {
        const { animate } = await import("animejs");
        if (formRef.current)
          animate(formRef.current, {
            translateX: [0, -6, 6, -4, 4, 0],
            duration: 350,
            easing: "easeInOutQuad",
          });
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* === BACKGROUND FOTO - GANTI FILE DI public/login-bg.jpg === */}
      {/* Cara ganti: taruh foto kamu di apps/pinjamin/public/login-bg.jpg */}
      {/* Jika file tidak ada, otomatis fallback ke gradient navy */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/login-bg.jpg'), linear-gradient(to bottom right, #081a33, #0a2240)`,
        }}
      />
      {/* Overlay agar form tetap terbaca di atas foto */}
      <div className="absolute inset-0 bg-[#0a2240]/60 dark:bg-[#020617]/70 backdrop-blur-[2px]" />
      {/* Subtle gold glow */}
      <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#CBA12C]/15 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-[#0a2240]/40 blur-[80px] pointer-events-none" />

      {/* === CARD LOGIN SAJA (tanpa embel-embel) === */}
      <div ref={formRef} className="relative w-full max-w-[420px]">
        <div className="bg-white/95 dark:bg-slate-900/85 backdrop-blur-2xl rounded-[24px] shadow-[0_24px_64px_rgba(0,0,0,0.4)] border border-white/20 p-8 sm:p-8">
          {/* Logo transparan - tanpa kotak putih */}
          <div className="flex flex-col items-center text-center mb-7">
            <span className="relative flex items-center justify-center mb-4">
              {/* Efek cahaya di belakang logo (kartu login gelap di tema dark) */}
              <span
                aria-hidden="true"
                className="absolute h-14 w-14 scale-95 rounded-full bg-white/85 blur-[7px]"
              />
              <span
                aria-hidden="true"
                className="absolute h-20 w-20 rounded-full bg-amber-300/25 blur-[14px]"
              />
              <img
                src="/logo-pinjamin.png"
                alt="Pinjamin"
                className="relative h-14 w-auto object-contain"
                style={{ background: "transparent" }}
              />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Selamat Datang
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Masuk ke Pinjamin
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-slate-700 dark:text-slate-200"
              >
                Username
              </Label>
              <Input
                id="username"
                placeholder="adminsystem"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="h-11 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-slate-700 dark:text-slate-200"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 rounded-xl pr-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                  aria-label={show ? "Sembunyikan password" : "Lihat password"}
                >
                  {show ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {err && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm px-4 py-3">
                {err}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#123367] hover:bg-[#0e2a52] dark:bg-[#CBA12C] dark:text-[#0a2240] dark:hover:bg-[#d4b44a] text-white font-semibold shadow-lg"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Login"}
            </Button>
          </form>

          {/* Footer minimal - hapus demo akses, hapus aman bcrypt, hapus semua fitur aktif */}
          <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
            © 2026 Garuda Food • Pinjamin
          </div>
        </div>

        {/* Hint kecil cara ganti background - bisa dihapus jika tidak perlu */}
        <p className="text-center text-[11px] text-white/50 mt-3 drop-shadow">
          Ganti background: taruh foto di{" "}
          <code className="bg-white/20 px-1 py-0.5 rounded text-white">
            public/login-bg.jpg
          </code>
        </p>
      </div>
    </div>
  );
}
