"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Package, QrCode, CalendarRange, ShieldCheck, Zap, Users, ArrowRight, Sparkles, Building2, CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const heroRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Anime.js entrance - staggered
    let mounted = true;
    (async () => {
      try {
        const { animate, stagger } = await import("animejs");
        if (!mounted) return;
        // Hero elements
        if (heroRef.current) {
          const els = heroRef.current.querySelectorAll(".anime-hero");
          animate(els, {
            translateY: [30, 0],
            opacity: [0, 1],
            duration: 900,
            delay: stagger(120),
            easing: "easeOutExpo",
          });
        }
        if (formRef.current) {
          animate(formRef.current, {
            translateY: [20, 0],
            opacity: [0, 1],
            duration: 800,
            delay: 400,
            easing: "easeOutExpo",
          });
        }
        // Floating logo
        const logo = document.querySelector(".anime-logo");
        if (logo) {
          animate(logo, {
            translateY: [-6, 6],
            duration: 2500,
            loop: true,
            alternate: true,
            easing: "easeInOutSine",
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
      // Success animation
      try {
        const { animate } = await import("animejs");
        animate(formRef.current!, { scale: [1, 0.96], duration: 200, easing: "easeInQuad" });
      } catch {}
      router.push("/");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
      // Shake animation on error
      try {
        const { animate } = await import("animejs");
        animate(formRef.current!, { translateX: [0, -8, 8, -6, 6, 0], duration: 400, easing: "easeInOutQuad" });
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060f1f] relative overflow-hidden flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#081a33] via-[#0a2240] to-[#0e2a4d]" />
      <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-[#e6ad1a]/20 blur-[120px]" />
      <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#1e3a5a]/40 blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-r from-[#e6ad1a]/5 to-transparent blur-3xl" />
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 lg:px-10">
        <div className="flex items-center gap-3">
          <img src="/logo-pinjamin.png" alt="Pinjamin" className="h-9 w-auto object-contain drop-shadow-lg" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }} />
          <div className="hidden sm:block h-6 w-px bg-white/10" />
          <span className="hidden sm:inline text-sm font-semibold tracking-widest text-white/60 uppercase">Garuda Food</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline text-xs text-white/50 mr-2">v1.1 • 2026</span>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-10 items-center">
          {/* LEFT - Landing hero */}
          <div ref={heroRef} className="order-2 lg:order-1 text-white space-y-6 lg:pr-6">
            <div className="anime-hero inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/10 px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/80">Sistem Aktif • 8 Aset Terkelola</span>
              <Sparkles className="h-3 w-3 text-amber-300" />
            </div>

            <div className="anime-hero space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight leading-[0.95]">
                Pinjam Aset
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400">Tanpa Ribet.</span>
              </h1>
              <p className="text-sm sm:text-base text-white/70 leading-relaxed max-w-[520px]">
                Platform <b className="text-white">Smart Asset Lending</b> untuk Garuda Food. Kelola inventaris, booking, audit, dan QR dalam satu dashboard glass-modern — cepat di HP maupun desktop.
              </p>
            </div>

            <div className="anime-hero grid grid-cols-3 gap-3 text-center">
              {[
                { v: "8", l: "Aset", sub: "terdata" },
                { v: "<1m", l: "Booking", sub: "per transaksi" },
                { v: "100%", l: "Overdue", sub: "terdeteksi" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-white/10 backdrop-blur border border-white/10 p-3">
                  <div className="text-xl font-extrabold text-amber-300">{s.v}</div>
                  <div className="text-xs font-semibold text-white">{s.l}</div>
                  <div className="text-[11px] text-white/50">{s.sub}</div>
                </div>
              ))}
            </div>

            <div className="anime-hero grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { icon: QrCode, t: "QR Generate", d: "Otomatis per aset & kit" },
                { icon: CalendarRange, t: "Anti Bentrok", d: "Cegah overlap tanggal" },
                { icon: ShieldCheck, t: "Audit Trail", d: "Jejak lengkap" },
              ].map((f) => (
                <div key={f.t} className="flex gap-2.5 rounded-2xl bg-white/[0.06] backdrop-blur border border-white/10 p-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-400 text-[#0a2240] flex items-center justify-center shrink-0">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{f.t}</div>
                    <div className="text-xs text-white/60 leading-tight">{f.d}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="anime-hero hidden lg:flex items-center gap-3 text-xs text-white/50">
              <Building2 className="h-4 w-4" />
              Dipercaya tim IT, Marketing, Produksi, Finance
              <span className="h-3 w-px bg-white/10" />
              <Users className="h-4 w-4" /> 4 Custodians aktif
            </div>
          </div>

          {/* RIGHT - Login form glass */}
          <div ref={formRef} className="order-1 lg:order-2">
            <div className="relative bg-white/95 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[28px] p-7 sm:p-8 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden">
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0a2240] via-[#e6ad1a] to-[#0a2240]" />
              <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-amber-400/10 blur-2xl" />

              <div className="relative">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="anime-logo h-16 w-16 rounded-2xl bg-transparent p-0 mb-3 flex items-center justify-center">
                    <img src="/logo-pinjamin.png" alt="Pinjamin" className="h-full w-full object-contain drop-shadow-xl" style={{ background: "transparent" }} />
                  </div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Selamat Datang</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Masuk ke workspace Garuda Food</p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-slate-700 dark:text-slate-200 font-medium">
                      Username <span className="text-amber-600">*</span>
                    </Label>
                    <Input
                      id="username"
                      placeholder="adminsystem"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      className="h-12 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-[#0a2240] dark:focus-visible:ring-amber-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-200 font-medium">
                      Password <span className="text-amber-600">*</span>
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
                        className="h-12 rounded-xl pr-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-[#0a2240]"
                      />
                      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0a2240] dark:hover:text-amber-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" className="rounded border-slate-300" defaultChecked /> <span className="text-slate-600 dark:text-slate-400">Ingat saya</span>
                    </label>
                    <span className="text-slate-400">Lupa password? Hubungi admin</span>
                  </div>

                  {err && <div className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm px-4 py-3">{err}</div>}

                  <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-[#0a2240] hover:bg-[#12345a] dark:bg-amber-400 dark:text-[#0a2240] dark:hover:bg-amber-300 text-white font-bold text-base shadow-lg hover:shadow-xl transition-all">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="flex items-center gap-2">Login Admin <ArrowRight className="h-4 w-4" /></span>}
                  </Button>

                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 flex gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-amber-400 text-[#0a2240] flex items-center justify-center shrink-0 font-bold text-xs">!</div>
                    <div className="text-xs leading-relaxed">
                      <div className="font-semibold text-amber-900 dark:text-amber-200">Demo akses</div>
                      <div className="text-amber-800 dark:text-amber-300">
                        username <b>adminsystem</b> / password <b>admin123</b> — peminjam dikelola sebagai data, tanpa registrasi.
                      </div>
                    </div>
                  </div>
                </form>

                <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                  <ShieldCheck className="h-3 w-3" /> Aman dengan bcrypt + httpOnly
                  <span>•</span> <Zap className="h-3 w-3" /> &lt;1 menit per booking
                </div>

                <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Semua fitur aktif — tidak butuh Supabase untuk demo
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/60">
              <span>© 2026 Garuda Food</span>
              <span className="h-3 w-px bg-white/20" />
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" /> Pinjamin v1.1
              </span>
              <span className="h-3 w-px bg-white/20" />
              <span className="hidden sm:inline">Made dengan glass + anime.js</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="relative z-10 border-t border-white/5 bg-[#060f1f]/50 backdrop-blur mt-6 lg:mt-0">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/40">
          <span>Pinjamin membantu tim Garuda Food melacak ribuan aset — dari laptop hingga forklift — dengan QR dan audit transparan.</span>
          <span className="hidden sm:inline">Kontak: support@garudafood.co.id</span>
        </div>
      </footer>
    </div>
  );
}
