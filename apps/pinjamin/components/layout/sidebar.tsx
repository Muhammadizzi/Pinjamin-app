"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/assets", label: "Assets", icon: Package },
  { href: "/kits", label: "Kits", icon: Boxes },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/tags", label: "Tags", icon: Tag },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/custom-fields", label: "Custom Fields", icon: SlidersHorizontal },
  { href: "/asset-models", label: "Asset Models", icon: Layers },
  { href: "/custodians", label: "Custodians", icon: Users },
  { href: "/audits", label: "Audits", icon: ClipboardCheck },
  { href: "/bookings", label: "Bookings", icon: CalendarRange },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [bookingsOpen, setBookingsOpen] = useState(pathname.startsWith("/bookings"));

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex h-full flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-[var(--sidebar-border)] bg-gradient-to-br from-[#081a33] to-[#0e2a4d]">
        <div className="h-11 w-11 rounded-xl bg-white p-1.5 shadow-lg flex items-center justify-center shrink-0">
          <img src="/logo-pinjamin.png" alt="Pinjamin" className="h-full w-full object-contain" />
        </div>
        <div>
          <div className="font-extrabold text-white leading-none tracking-tight">Pinjamin</div>
          <div className="text-[11px] text-amber-200/80 font-medium tracking-widest uppercase">Garuda Food</div>
        </div>
        <div className="ml-auto hidden lg:block">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="online" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div className="space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">Asset management</div>
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            if (item.label === "Bookings") {
              return (
                <div key={item.href}>
                  <button
                    onClick={() => setBookingsOpen(!bookingsOpen)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all touch-target",
                      isActive ? "bg-[#e6ad1a] text-[#0a2240] shadow font-semibold" : "text-slate-300 hover:bg-[#12345a] hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", bookingsOpen && "rotate-180")} />
                  </button>
                  {bookingsOpen && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-[var(--sidebar-border)] pl-4">
                      <Link
                        href="/bookings"
                        onClick={onNavigate}
                        className={cn("block rounded-lg px-3 py-2 text-sm transition-colors", pathname === "/bookings" ? "bg-[#12345a] text-amber-200 font-medium" : "text-slate-400 hover:text-white")}
                      >
                        Daftar Booking
                      </Link>
                      <Link
                        href="/bookings/calendar"
                        onClick={onNavigate}
                        className={cn("block rounded-lg px-3 py-2 text-sm transition-colors", pathname === "/bookings/calendar" ? "bg-[#12345a] text-amber-200 font-medium" : "text-slate-400 hover:text-white")}
                      >
                        Kalender
                      </Link>
                      <Link
                        href="/bookings/new"
                        onClick={onNavigate}
                        className={cn("block rounded-lg px-3 py-2 text-sm transition-colors", pathname === "/bookings/new" ? "bg-[#12345a] text-amber-200 font-medium" : "text-slate-400 hover:text-white")}
                      >
                        + Booking Baru
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
                  isActive ? "bg-[#e6ad1a] text-[#0a2240] shadow font-semibold" : "text-slate-300 hover:bg-[#12345a] hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
                {item.label === "Assets" && <span className="ml-auto text-xs bg-[#12345a] text-amber-100 px-2 py-1 rounded-full">8</span>}
              </Link>
            );
          })}
        </div>

        <Link
          href="/scanner"
          onClick={onNavigate}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-bold shadow-lg touch-target border transition-all",
            pathname === "/scanner" ? "bg-amber-400 text-[#0a2240] border-amber-300" : "bg-[#e6ad1a] text-[#0a2240] hover:bg-amber-400 border-amber-300 hover:shadow-xl"
          )}
        >
          <QrCode className="h-5 w-5" />
          QR Scanner
        </Link>

        <div className="rounded-xl bg-[#0e2a4d] border border-[#1a3a5a] p-3">
          <div className="text-xs font-semibold text-amber-200 mb-1">💡 Tips</div>
          <div className="text-xs text-slate-300 leading-relaxed">Scan QR aset untuk aksi cepat pinjam/kembali tanpa buka menu.</div>
        </div>
      </div>

      <div className="border-t border-[var(--sidebar-border)] p-4 bg-[#081a33]">
        <div className="flex items-center gap-3 rounded-xl bg-[#0e2a4d] border border-[#1a3a5a] p-3">
          <div className="h-9 w-9 rounded-full bg-[#e6ad1a] text-[#0a2240] flex items-center justify-center text-sm font-extrabold">A</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">adminsystem</div>
            <div className="text-xs text-amber-200/70 truncate">Administrator</div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9 text-slate-400 hover:text-white hover:bg-[#1a3a5a]">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MobileHeader({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-white/95 backdrop-blur px-4 dark:bg-slate-900/95 lg:hidden">
      <Button variant="ghost" size="icon" onClick={onMenu} className="shrink-0">
        <Menu className="h-6 w-6" />
      </Button>
      <Link href="/" className="flex items-center gap-2">
        <img src="/logo-pinjamin.png" alt="Pinjamin" className="h-8 w-8 rounded-lg bg-[#0a2240] p-1 object-contain shadow" />
        <span className="font-extrabold tracking-tight text-[#0a2240]">Pinjamin</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">Garuda</span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/scanner")} className="bg-amber-50 text-[#0a2240] hover:bg-amber-100">
          <QrCode className="h-5 w-5" />
        </Button>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
          }}
          className="h-9 w-9 rounded-full bg-[#0a2240] text-amber-200 flex items-center justify-center text-sm font-bold border border-amber-200/20"
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <MobileHeader onMenu={() => setOpen(true)} />
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#0a2240]/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[300px] max-w-[85vw] shadow-2xl">
            <div className="absolute right-2 top-2 z-10">
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-white hover:bg-white/10">
                <X className="h-6 w-6" />
              </Button>
            </div>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <div className="lg:flex">
        <aside className="hidden lg:flex lg:w-[280px] lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-slate-200 dark:lg:border-slate-800">
          <Sidebar />
        </aside>
        <main className="flex-1 min-w-0">
          <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
