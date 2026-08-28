"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-client";
import type { AdminRole } from "@/lib/auth-types";
import {
  LayoutDashboard,
  Package,
  Tag,
  MapPin,
  BarChart3,
  QrCode,
  Menu,
  X,
  LogOut,
  ChevronDown,
  UserCog,
  LifeBuoy,
  Repeat2,
  Loader2,
  ArrowLeft,
} from "lucide-react";

interface AdminProfileInfo {
  username: string;
  fullName: string;
  avatar: string;
  role: AdminRole;
  /** "GA" | "Utility" | "IT" untuk helpdesk; null untuk admin aset. */
  workingOrder: string | null;
}

/**
 * Wilayah kerja admin: "assets" (manajemen aset) atau "tickets" (Helpdesk).
 *
 * Dulu pilihan bebas yang disimpan di localStorage. Sekarang TURUNAN dari
 * peran akun, jadi tidak ada lagi keadaan di mana tampilan mengklaim satu
 * wilayah sementara servernya menolak wilayah itu.
 */
type AdminMode = "assets" | "tickets";

/**
 * Peran menentukan mode mana yang BOLEH dibuka.
 *
 * Admin helpdesk tidak punya pilihan sama sekali: satu-satunya wilayahnya
 * adalah panel tiket. Admin aset juga tidak — Ticketing bukan miliknya.
 * Switcher hanya masuk akal kalau ada lebih dari satu tujuan, dan sejak
 * peran dipisah tidak ada akun yang punya dua.
 */
function modeFor(role: AdminRole): AdminMode {
  return role === "HELPDESK" ? "tickets" : "assets";
}

function useAdminProfile(): AdminProfileInfo {
  const { user } = useAuth();
  return {
    username: user?.username || "admin",
    fullName: user?.fullName || "Administrator",
    avatar: user?.avatar || "",
    role: user?.role || "ASSET",
    workingOrder: user?.workingOrder || null,
  };
}

/** Lingkaran avatar admin — foto kalau ada, fallback huruf pertama nama. */
function AdminAvatar({
  profile,
  className,
}: {
  profile: AdminProfileInfo;
  className?: string;
}) {
  const initial = (profile.fullName || profile.username || "A")
    .trim()
    .charAt(0)
    .toUpperCase();
  return (
    <div
      className={cn(
        "rounded-full overflow-hidden bg-[#CBA12C] text-[#1a365d] flex items-center justify-center font-extrabold shrink-0",
        className
      )}
    >
      {profile.avatar ? (
        <img
          src={profile.avatar}
          alt={profile.fullName || profile.username}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </div>
  );
}

interface AkunRingkas {
  username: string;
  fullName: string;
  role: AdminRole;
  workingOrder: string | null;
}

/**
 * Panel "Ganti akun" — berpindah meja tanpa mengetik ulang nama pengguna.
 *
 * Ini TETAP login penuh, bukan jalan pintas: yang dipakai adalah endpoint
 * /api/auth/login yang sama, lengkap dengan bcrypt, rate limit per IP, dan
 * token version. Yang dihemat hanya pengetikan nama pengguna — kata sandi
 * akun tujuan tetap wajib, dan sesi lama digantikan sepenuhnya oleh sesi
 * akun baru. Tidak ada mekanisme "kembali tanpa sandi".
 */
function PanelGantiAkun({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [akun, setAkun] = useState<AkunRingkas[]>([]);
  const [current, setCurrent] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [dipilih, setDipilih] = useState<AkunRingkas | null>(null);
  const [sandi, setSandi] = useState("");
  const [masuk, setMasuk] = useState(false);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    let batal = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/accounts", { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!batal && res.ok) {
          setAkun(j.accounts || []);
          setCurrent(j.current || "");
        }
      } catch {
        /* daftar kosong ditangani di render */
      } finally {
        if (!batal) setMemuat(false);
      }
    })();
    return () => {
      batal = true;
    };
  }, []);

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dipilih) return;
    setMasuk(true);
    setGalat("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: dipilih.username,
          password: sandi,
          remember: true,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGalat(j.error || t("loginFailed"));
        return;
      }
      // Muat ulang penuh, bukan navigasi client-side: seluruh state di memori
      // (store aset, profil, daftar tiket) milik akun LAMA, dan membawanya
      // ke sesi baru akan menampilkan data meja yang bukan miliknya.
      window.location.replace(
        j.profile?.role === "HELPDESK" ? "/tickets" : "/dashboard"
      );
    } catch {
      setGalat(t("serverUnreachableRetry"));
    } finally {
      setMasuk(false);
    }
  };

  const lain = akun.filter((a) => a.username !== current);

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-white">Ganti akun</span>
      </div>

      {memuat ? (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat…
        </div>
      ) : dipilih ? (
        <form onSubmit={kirim} className="space-y-2">
          <div className="rounded-lg border border-[#2a4a6b] bg-[#142a4a] px-2.5 py-2">
            <div className="text-sm font-semibold text-white">
              {dipilih.fullName}
            </div>
            <div className="text-[11px] text-amber-200/70">
              @{dipilih.username}
            </div>
          </div>
          <input
            type="password"
            value={sandi}
            onChange={(e) => setSandi(e.target.value)}
            placeholder="Kata sandi"
            autoComplete="current-password"
            autoFocus
            className="h-10 w-full rounded-lg border border-[#2a4a6b] bg-[#0f1d33] px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#CBA12C]"
          />
          {galat && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-300">
              {galat}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDipilih(null);
                setSandi("");
                setGalat("");
              }}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={masuk || sandi.length === 0}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#CBA12C] px-3 py-1.5 text-xs font-bold text-[#1a365d] transition-colors hover:bg-[#d4b44a] disabled:opacity-60"
            >
              {masuk && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {masuk ? "Masuk…" : "Masuk"}
            </button>
          </div>
        </form>
      ) : lain.length === 0 ? (
        <div className="py-3 text-center text-[11px] text-slate-500">
          Tidak ada akun lain.
        </div>
      ) : (
        <ul className="space-y-1">
          {lain.map((a) => (
            <li key={a.username}>
              <button
                type="button"
                onClick={() => setDipilih(a)}
                className="w-full rounded-lg border border-[#2a4a6b] px-2.5 py-2 text-left transition-colors hover:bg-[#243a5e]"
              >
                <div className="text-sm font-medium text-slate-100">
                  {a.fullName}
                </div>
                <div className="text-[11px] text-slate-400">
                  @{a.username}
                  {a.workingOrder ? ` • ${a.workingOrder}` : " • Aset"}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useT();
  const { assets } = useStore();
  const profile = useAdminProfile();
  const { logout } = useAuth();
  const mode = modeFor(profile.role);
  const [acctOpen, setAcctOpen] = useState(false);
  const [gantiAkun, setGantiAkun] = useState(false);
  const acctRef = useRef<HTMLDivElement>(null);

  // Tutup popover saat klik di luar / berpindah halaman
  useEffect(() => {
    if (!acctOpen) return;
    const onDown = (e: MouseEvent) => {
      if (acctRef.current && !acctRef.current.contains(e.target as Node)) {
        setAcctOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [acctOpen]);
  useEffect(() => {
    setAcctOpen(false);
    setGantiAkun(false);
  }, [pathname]);

  const handleLogout = async () => {
    setAcctOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    // Matikan sinkron server store — PUT berikutnya mustahil berhasil tanpa
    // sesi, dan mekanisme retry perlu dipersenjatai untuk login berikutnya.
    window.dispatchEvent(new Event("pinjamin:session-end"));
    // Hard redirect (bukan client-side push): memaksa middleware mengecek
    // cookie yang baru saja dihapus dan me-reset seluruh state client,
    // sehingga admin pasti tiba di form login — bukan landing page.
    window.location.replace("/login");
  };

  const navItems =
    mode === "tickets"
      ? [{ href: "/tickets", label: t("helpdeskTickets"), icon: LifeBuoy }]
      : [
          { href: "/dashboard", label: t("home"), icon: LayoutDashboard },
          { href: "/assets", label: t("assets"), icon: Package },
          { href: "/categories", label: t("categories"), icon: Tag },
          { href: "/tags", label: t("tags"), icon: Tag },
          { href: "/locations", label: t("locations"), icon: MapPin },
          { href: "/reports", label: t("reports"), icon: BarChart3 },
        ];

  return (
    <div className="flex h-full flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-[var(--sidebar-border)] bg-gradient-to-br from-[#1a365d] to-[#243a5e]">
        <div className="relative h-11 w-11 flex items-center justify-center shrink-0">
          {/* Efek cahaya di belakang logo: inti putih terang + halo emas,
              supaya logo navy terangkat dari latar sidebar yang gelap */}
          <div
            aria-hidden="true"
            className="absolute inset-0 scale-90 rounded-full bg-white/85 blur-[6px]"
          />
          <div
            aria-hidden="true"
            className="absolute -inset-2.5 rounded-full bg-amber-300/25 blur-[12px]"
          />
          <Image
            src="/sigap-logo.png"
            alt="SIGAP"
            width={44}
            height={44}
            priority
            className="relative h-full w-full object-contain"
          />
        </div>
        <div>
          <div className="font-extrabold text-white leading-none tracking-tight">
            SIGAP
          </div>
          <div className="text-[11px] text-[#fbd38d] font-medium tracking-widest uppercase">
            Garuda Food
          </div>
        </div>
        <div
          className="ml-auto hidden lg:block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"
          title="online"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div className="space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
            {mode === "tickets"
              ? `${t("helpdesk")}${
                  profile.workingOrder ? ` — ${profile.workingOrder}` : ""
                }`
              : t("assetManagement")}
          </div>
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all touch-target",
                  isActive
                    ? "bg-[#CBA12C] text-[#1a365d] shadow font-semibold"
                    : "text-slate-300 hover:bg-[#243a5e] hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                {item.label}
                {item.href === "/assets" && (
                  <span className="ml-auto text-xs bg-[#243a5e] text-amber-100 px-2 py-1 rounded-full">
                    {assets.length}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {mode === "assets" && (
          <Link
            href="/scanner"
            onClick={onNavigate}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-bold shadow-lg touch-target border transition-all",
              pathname === "/scanner"
                ? "bg-[#CBA12C] text-[#1a365d] border-amber-200"
                : "bg-[#CBA12C] text-[#1a365d] hover:bg-amber-300 border-amber-200 hover:shadow-xl"
            )}
          >
            <QrCode className="h-5 w-5" strokeWidth={1.5} />
            {t("scanner")}
          </Link>
        )}

        <div className="rounded-xl bg-[#1e3250] border border-[#2a4a6b] p-3">
          {mode === "tickets" ? (
            <>
              <div className="text-xs font-semibold text-amber-200 mb-1">
                🎧 {t("helpdesk")}
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                {t("sidebarHelpdeskHint")}
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold text-amber-200 mb-1">
                💡 {t("tips")}
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                {t("sidebarScanHint")}
              </div>
            </>
          )}
        </div>
      </div>

      <div
        ref={acctRef}
        className="relative border-t border-[var(--sidebar-border)] p-4 bg-[#142a4a]"
      >
        {/* Popover: klik blok administrator → Account Setting / Log Out */}
        {acctOpen && (
          <div className="absolute left-4 right-4 bottom-[calc(100%-0.75rem)] mb-1 rounded-xl bg-[#1e3250] border border-[#2a4a6b] shadow-2xl overflow-hidden z-30">
            {gantiAkun ? (
              <PanelGantiAkun onClose={() => setGantiAkun(false)} />
            ) : (
              <>
                <Link
                  href="/settings"
                  onClick={() => {
                    setAcctOpen(false);
                    onNavigate?.();
                  }}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-[#243a5e] hover:text-white transition-colors"
                >
                  <UserCog
                    className="h-4 w-4 text-amber-300"
                    strokeWidth={1.75}
                  />
                  {t("accountSetting")}
                </Link>
                <div className="h-px bg-[#2a4a6b]" />
                <button
                  type="button"
                  onClick={() => setGantiAkun(true)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-[#243a5e] hover:text-white transition-colors"
                >
                  <Repeat2
                    className="h-4 w-4 text-amber-300"
                    strokeWidth={1.75}
                  />
                  Ganti akun
                </button>
                <div className="h-px bg-[#2a4a6b]" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-red-300 hover:bg-[#243a5e] hover:text-red-200 transition-colors"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                  {t("logOut")}
                </button>
              </>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => setAcctOpen((o) => !o)}
          aria-expanded={acctOpen}
          title={`${t("accountSetting")} / ${t("logOut")}`}
          className="w-full flex items-center gap-3 rounded-xl bg-[#1e3250] border border-[#2a4a6b] p-3 text-left hover:bg-[#243a5e] transition-colors"
        >
          <AdminAvatar profile={profile} className="h-9 w-9 text-sm" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">
              {profile.fullName || profile.username}
            </div>
            <div className="text-xs text-amber-200/70 truncate">
              @{profile.username}
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform",
              acctOpen && "rotate-180"
            )}
            strokeWidth={1.5}
          />
        </button>
      </div>
    </div>
  );
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const { t } = useT();
  const profile = useAdminProfile();
  const mode = modeFor(profile.role);
  return (
    <header className="sticky top-0 z-20 flex h-[56px] sm:h-[64px] items-center gap-1.5 sm:gap-3 border-b bg-[#0f1d33]/95 backdrop-blur-xl px-2 sm:px-4 border-[#243a5e] shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenu}
        className="shrink-0 lg:hidden text-white hover:bg-white/10"
      >
        <Menu className="h-6 w-6" strokeWidth={1.5} />
      </Button>
      <Link
        href="/dashboard"
        className="flex min-w-0 items-center gap-2 lg:hidden"
      >
        <span className="relative flex items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute h-7 w-7 rounded-full bg-white/85 blur-[5px]"
          />
          <span
            aria-hidden="true"
            className="absolute h-10 w-10 rounded-full bg-amber-300/25 blur-[10px]"
          />
          <Image
            src="/sigap-logo.png"
            alt="SIGAP"
            width={28}
            height={28}
            className="relative h-7 w-auto object-contain"
          />
        </span>
        <span className="font-extrabold tracking-tight text-white truncate">
          SIGAP
        </span>
        {/* Badge disembunyikan di layar <640px: bersama switcher mode dan
            avatar, header jadi pecah dua baris di ponsel 375px. */}
        <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-[#CBA12C] text-[#1a365d] font-bold whitespace-nowrap">
          GARUDA FOOD
        </span>
      </Link>
      <div className="hidden lg:flex items-center gap-2 text-sm">
        <span className="text-[#CBA12C] font-bold tracking-wide">SIGAP</span>
        <span className="text-white/20">/</span>
        <span className="text-white/60 font-medium">Garuda Food</span>
        <span className="ml-3 hidden xl:inline-flex items-center gap-2 text-xs text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {t("systemActive")}
        </span>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        {/* Lencana wilayah kerja — BUKAN switcher lagi.
            Dulu dua tombol Aset / Ticketing yang bisa ditekan siapa saja.
            Sejak tiap akun terkunci pada satu peran, tombol kedua hanya akan
            melempar admin ke halaman yang pasti memantulkannya kembali. Yang
            tersisa adalah keterangan: Anda sedang berada di wilayah mana. */}
        <div className="flex items-center gap-1.5 rounded-xl border border-[#243a5e] bg-[#142a4a] px-2 py-1.5 sm:px-2.5">
          {mode === "tickets" ? (
            <LifeBuoy
              className="h-4 w-4 shrink-0 text-[#CBA12C]"
              strokeWidth={1.75}
            />
          ) : (
            <Package
              className="h-4 w-4 shrink-0 text-[#CBA12C]"
              strokeWidth={1.75}
            />
          )}
          <span className="hidden text-xs font-semibold text-slate-200 md:inline">
            {mode === "tickets"
              ? profile.workingOrder
                ? `Ticketing · ${profile.workingOrder}`
                : "Ticketing"
              : "Aset"}
          </span>
        </div>
        <LanguageToggle />
        {mode === "assets" && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/scanner")}
            className="hidden sm:flex bg-white/5 hover:bg-white/10 text-white border-white/15 hover:text-white backdrop-blur"
          >
            <QrCode className="h-5 w-5" strokeWidth={1.5} />
          </Button>
        )}
        <button
          onClick={() => router.push("/settings")}
          title={t("accountSetting")}
          className="rounded-full shadow-md border-2 border-[#CBA12C]"
        >
          <AdminAvatar
            profile={profile}
            className="h-[30px] w-[30px] text-sm"
          />
        </button>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#0f1d33] text-white">
      <div className="lg:flex">
        <aside className="hidden lg:flex lg:w-[280px] lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-[#1a365d] backdrop-blur">
          <Sidebar />
        </aside>
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar onMenu={() => setOpen(true)} />
          <main className="flex-1 bg-[#0f1d33]">
            <div className="mx-auto max-w-[1600px] p-3 sm:p-5 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[#1a365d]/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[300px] max-w-[85vw] shadow-2xl">
            <div className="absolute right-2 top-2 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="text-white hover:bg-white/10"
              >
                <X className="h-6 w-6" strokeWidth={1.5} />
              </Button>
            </div>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
