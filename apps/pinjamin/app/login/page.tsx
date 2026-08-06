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
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="w-full max-w-[440px]">
        <div className="bg-[#0f172a] rounded-[24px] p-8 sm:p-10 shadow-2xl border border-slate-800">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-white p-2 mb-4 shadow-lg">
              <img
                src="/logo-pinjamin.png"
                alt="Pinjamin"
                className="h-full w-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-white">Selamat Datang</h1>
            <p className="text-sm text-slate-400 mt-1">
              Masuk ke Pinjamin — Garuda Food
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-200">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                placeholder="adminsystem"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">
                Password <span className="text-red-500">*</span>
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
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 h-12 rounded-xl pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  {show ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Demo: username <b className="text-slate-300">adminsystem</b> /
                password <b className="text-slate-300">admin123</b>
              </p>
            </div>

            {err && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3">
                {err}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-base shadow-lg"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Login Admin"
              )}
            </Button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span>© 2026 Garuda Food</span>
            <span>•</span>
            <span>Pinjamin v1.1</span>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 mt-6">
          Hanya admin yang dapat login. Peminjam dikelola sebagai data oleh
          admin.
        </p>
      </div>
    </div>
  );
}
