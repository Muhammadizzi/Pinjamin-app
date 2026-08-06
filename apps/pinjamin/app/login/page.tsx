"use client";
import { useState } from "react";
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
      router.push("/");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060f1f] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[#e6ad1a]/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[#0e3a5d]/30 blur-3xl" />
      <div className="w-full max-w-[440px] relative">
        <div className="bg-[#0a2240] rounded-[24px] p-8 sm:p-10 shadow-2xl border border-[#14365f]">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-white p-2 mb-4 shadow-lg ring-2 ring-[#e6ad1a]/20">
              <img src="/logo-pinjamin.png" alt="Pinjamin" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Selamat Datang</h1>
            <p className="text-sm text-amber-100/70 mt-1">Masuk ke Pinjamin — Garuda Food</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-amber-100/90">
                Username <span className="text-amber-400">*</span>
              </Label>
              <Input
                id="username"
                placeholder="adminsystem"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="bg-[#0e2a4d] border-[#1a3a5a] text-white placeholder:text-slate-400 h-12 rounded-xl focus-visible:ring-[#e6ad1a]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-amber-100/90">
                Password <span className="text-amber-400">*</span>
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
                  className="bg-[#0e2a4d] border-[#1a3a5a] text-white placeholder:text-slate-400 h-12 rounded-xl pr-12 focus-visible:ring-[#e6ad1a]"
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-200 p-1">
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Demo: username <b className="text-amber-200">adminsystem</b> / password <b className="text-amber-200">admin123</b>
              </p>
            </div>

            {err && <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm px-4 py-3">{err}</div>}

            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-[#e6ad1a] hover:bg-amber-400 text-[#0a2240] font-bold text-base shadow-lg">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Login Admin"}
            </Button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span>© 2026 Garuda Food</span>
            <span>•</span>
            <span>Pinjamin v1.1</span>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 mt-6">Hanya admin yang dapat login. Peminjam dikelola sebagai data oleh admin.</p>
      </div>
    </div>
  );
}
