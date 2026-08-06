"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggleLight } from "@/components/language-toggle";
import { useT } from "@/lib/i18n";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Tag,
  MapPin,
  SlidersHorizontal,
  Layers,
  ClipboardCheck,
  CalendarRange,
  BarChart3,
  QrCode,
  Users,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();
  const [bookingsOpen, setBookingsOpen] = useState(pathname.startsWith("/bookings"));

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    { href: "/", label: t("home"), icon: LayoutDashboard },
    { href: "/assets", label: t("assets"), icon: Package },
    { href: "/kits", label: t("kits"), icon: Boxes },
    { href: "/categories", label: t("categories"), icon: Tag },
    { href: "/tags", label: t("tags"), icon: Tag },
    { href: "/locations", label: t("locations"), icon: MapPin },
    { href: "/custom-fields", label: t("customFields"), icon: SlidersHorizontal },
    { href: "/asset-models", label: t("assetModels"), icon: Layers },
    { href: "/custodians", label: t("custodians"), icon: Users },
    { href: "/audits", label: t("audits"), icon: ClipboardCheck },
    { href: "/bookings", label: t("bookings"), icon: CalendarRange },
    { href: "/reports", label: t("reports"), icon: BarChart3 },
  ];

  return (
    <div className="flex h-full flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-[var(--sidebar-border)] bg-gradient-to-br from-[#1a365d] to-[#243a5e]">
        <div className="h-11 w-11 rounded-xl bg-transparent p-0 flex items-center justify-center shrink-0">
          <img src="/logo-pinjamin.png" alt="Pinjamin" className="h-full w-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]" style={{ background: "transparent" }} />
        </div>
        <div>
          <div className="font-extrabold text-white leading-none tracking-tight">Pinjamin</div>
          <div className="text-[11px] text-[#fbd38d] font-medium tracking-widest uppercase">Garuda Food</div>
        </div>
        <div className="ml-auto hidden lg:block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="online" />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div className="space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">{t("assetManagement")}</div>
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            if (item.label === t("bookings")) {
              return (
                <div key={item.href}>
                  <button
                    onClick={() => setBookingsOpen(!bookingsOpen)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all touch-target",
                      isActive ? "bg-[#CBA12C] text-[#1a365d] shadow font-semibold" : "text-slate-300 hover:bg-[#243a5e] hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", bookingsOpen && "rotate-180")} />
                  </button>
                  {bookingsOpen && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-[var(--sidebar-border)] pl-4">
                      <Link href="/bookings" onClick={onNavigate} className={cn("block rounded-lg px-3 py-2 text-sm transition-colors", pathname === "/bookings" ? "bg-[#243a5e] text-amber-200 font-medium" : "text-slate-400 hover:text-white")}>
                        {t("bookings")}
                      </Link>
                      <Link href="/bookings/calendar" onClick={onNavigate} className={cn("block rounded-lg px-3 py-2 text-sm transition-colors", pathname === "/bookings/calendar" ? "bg-[#243a5e] text-amber-200 font-medium" : "text-slate-400 hover:text-white")}>
                        {t("bookings")} Calendar
                      </Link>
                      <Link href="/bookings/new" onClick={onNavigate} className={cn("block rounded-lg px-3 py-2 text-sm transition-colors", pathname === "/bookings/new" ? "bg-[#243a5e] text-amber-200 font-medium" : "text-slate-400 hover:text-white")}>
                        + {t("create")}
                      </Link>
                    </div>
                  )}
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all touch-target",
                  isActive ? "bg-[#CBA12C] text-[#1a365d] shadow font-semibold" : "text-slate-300 hover:bg-[#243a5e] hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                {item.label}
                {item.label === t("assets") && <span className="ml-auto text-xs bg-[#243a5e] text-amber-100 px-2 py-1 rounded-full">8</span>}
              </Link>
            );
          })}
        </div>

        <Link
          href="/scanner"
          onClick={onNavigate}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-bold shadow-lg touch-target border transition-all",
            pathname === "/scanner" ? "bg-[#CBA12C] text-[#1a365d] border-amber-200" : "bg-[#CBA12C] text-[#1a365d] hover:bg-amber-300 border-amber-200 hover:shadow-xl"
          )}
        >
          <QrCode className="h-5 w-5" strokeWidth={1.5} />
          {t("scanner")}
        </Link>

        <div className="rounded-xl bg-[#1e3250] border border-[#2a4a6b] p-3">
          <div className="text-xs font-semibold text-amber-200 mb-1">💡 Tips</div>
          <div className="text-xs text-slate-300 leading-relaxed">Scan QR aset untuk aksi cepat pinjam/kembali tanpa buka menu.</div>
        </div>
      </div>

      <div className="border-t border-[var(--sidebar-border)] p-4 bg-[#142a4a]">
        <div className="flex items-center gap-3 rounded-xl bg-[#1e3250] border border-[#2a4a6b] p-3">
          <div className="h-9 w-9 rounded-full bg-[#CBA12C] text-[#1a365d] flex items-center justify-center text-sm font-extrabold">A</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">adminsystem</div>
            <div className="text-xs text-amber-200/70 truncate">Administrator</div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9 text-slate-400 hover:text-white hover:bg-[#243a5e]">
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex h-[64px] items-center gap-3 border-b bg-[#fefcf8]/80 dark:bg-[#0f1d33]/80 backdrop-blur-xl px-4">
      <Button variant="ghost" size="icon" onClick={onMenu} className="shrink-0 lg:hidden">
        <Menu className="h-6 w-6" strokeWidth={1.5} />
      </Button>
      <Link href="/" className="flex items-center gap-2 lg:hidden">
        <img src="/logo-pinjamin.png" alt="Pinjamin" className="h-8 w-8 rounded-lg bg-transparent object-contain" style={{ background: "transparent" }} />
        <span className="font-extrabold tracking-tight text-[#1a365d] dark:text-white">Pinjamin</span>
      </Link>
      <div className="hidden lg:block text-sm font-medium text-slate-600 dark:text-slate-300">
        <span className="text-[#1a365d] dark:text-[#CBA12C] font-semibold">Pinjamin</span>
        <span className="text-slate-400 mx-2">/</span>
        <span>Garuda Food</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <LanguageToggleLight />
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={() => router.push("/scanner")} className="hidden sm:flex bg-amber-50 dark:bg-slate-800 text-[#1a365d] dark:text-amber-200 hover:bg-amber-100">
          <QrCode className="h-5 w-5" strokeWidth={1.5} />
        </Button>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
          }}
          className="h-9 w-9 rounded-full bg-[#1a365d] text-amber-100 flex items-center justify-center text-sm font-bold border border-amber-200/20"
        >
          A
        </button>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#fefcf8] dark:bg-[#0f1d33]">
      <div className="lg:flex">
        <aside className="hidden lg:flex lg:w-[280px] lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-[#f0e6d2] dark:lg:border-[#1a365d] backdrop-blur">
          <Sidebar />
        </aside>
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar onMenu={() => setOpen(true)} />
          <main className="flex-1 bg-gradient-to-br from-[#fefcf8] via-white to-amber-50/20 dark:from-[#0f1d33] dark:via-[#0f1d33] dark:to-[#1a365d]/20">
            <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#1a365d]/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[300px] max-w-[85vw] shadow-2xl">
            <div className="absolute right-2 top-2 z-10">
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-white hover:bg-white/10">
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
