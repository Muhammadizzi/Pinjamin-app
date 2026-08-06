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
  Search,
  ChevronDown,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard, group: "Utama" },
  {
    href: "/assets",
    label: "Assets",
    icon: Package,
    group: "Asset management",
  },
  { href: "/kits", label: "Kits", icon: Boxes, group: "Asset management" },
  {
    href: "/categories",
    label: "Categories",
    icon: Tag,
    group: "Asset management",
  },
  { href: "/tags", label: "Tags", icon: Tag, group: "Asset management" },
  {
    href: "/locations",
    label: "Locations",
    icon: MapPin,
    group: "Asset management",
  },
  {
    href: "/custom-fields",
    label: "Custom Fields",
    icon: SlidersHorizontal,
    group: "Asset management",
  },
  {
    href: "/asset-models",
    label: "Asset Models",
    icon: Layers,
    group: "Asset management",
  },
  {
    href: "/custodians",
    label: "Custodians",
    icon: Users,
    group: "Asset management",
  },
  {
    href: "/audits",
    label: "Audits",
    icon: ClipboardCheck,
    group: "Operations",
  },
  {
    href: "/bookings",
    label: "Bookings",
    icon: CalendarRange,
    group: "Operations",
  },
  { href: "/reports", label: "Reports", icon: BarChart3, group: "Operations" },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [bookingsOpen, setBookingsOpen] = useState(
    pathname.startsWith("/bookings")
  );

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex h-full flex-col bg-[#0f172a] text-slate-100">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800">
        <img
          src="/logo-pinjamin.png"
          alt="Pinjamin"
          className="h-10 w-10 rounded-xl bg-white p-1 object-contain"
        />
        <div>
          <div className="font-bold text-white leading-none">Pinjamin</div>
          <div className="text-xs text-slate-400">Garuda Food</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div className="space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
            Menu
          </div>
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            if (item.label === "Bookings") {
              return (
                <div key={item.href}>
                  <button
                    onClick={() => setBookingsOpen(!bookingsOpen)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors touch-target",
                      isActive
                        ? "bg-red-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        bookingsOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {bookingsOpen && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-slate-800 pl-4">
                      <Link
                        href="/bookings"
                        onClick={onNavigate}
                        className={cn(
                          "block rounded-lg px-3 py-2 text-sm",
                          pathname === "/bookings"
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        Daftar Booking
                      </Link>
                      <Link
                        href="/bookings/calendar"
                        onClick={onNavigate}
                        className={cn(
                          "block rounded-lg px-3 py-2 text-sm",
                          pathname === "/bookings/calendar"
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        Kalender
                      </Link>
                      <Link
                        href="/bookings/new"
                        onClick={onNavigate}
                        className={cn(
                          "block rounded-lg px-3 py-2 text-sm",
                          pathname === "/bookings/new"
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:text-white"
                        )}
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
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors touch-target",
                  isActive
                    ? "bg-red-600 text-white shadow"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
                {item.label === "Assets" && (
                  <span className="ml-auto text-xs bg-slate-800 px-2 py-1 rounded-full">
                    8
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <Link
          href="/scanner"
          onClick={onNavigate}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-bold shadow-lg touch-target",
            pathname === "/scanner"
              ? "bg-red-700 text-white"
              : "bg-red-600 text-white hover:bg-red-700"
          )}
        >
          <QrCode className="h-5 w-5" />
          QR Scanner
        </Link>
      </div>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-slate-800 p-3">
          <div className="h-9 w-9 rounded-full bg-red-600 flex items-center justify-center text-sm font-bold text-white">
            A
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              adminsystem
            </div>
            <div className="text-xs text-slate-400 truncate">Administrator</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700"
          >
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-white px-4 dark:bg-slate-900 lg:hidden">
      <Button variant="ghost" size="icon" onClick={onMenu} className="shrink-0">
        <Menu className="h-6 w-6" />
      </Button>
      <Link href="/" className="flex items-center gap-2">
        <img
          src="/logo-pinjamin.png"
          alt="Pinjamin"
          className="h-8 w-8 rounded-lg bg-slate-900 p-1 object-contain"
        />
        <span className="font-bold">Pinjamin</span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/scanner")}
        >
          <QrCode className="h-5 w-5" />
        </Button>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
          }}
          className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold"
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
      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
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
                <X className="h-6 w-6" />
              </Button>
            </div>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <div className="lg:flex">
        <aside className="hidden lg:flex lg:w-[280px] lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-screen">
          <Sidebar />
        </aside>
        <main className="flex-1 min-w-0">
          <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
