"use client";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-client";
import { uploadImage } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  UserCog,
  KeyRound,
  ImagePlus,
  Trash2,
  Check,
  Database,
} from "lucide-react";

type Profile = { username: string; fullName: string; avatar: string };

function initials(p: Profile) {
  return (p.fullName || p.username || "A").trim().charAt(0).toUpperCase();
}

export default function AccountSettingsPage() {
  const { t } = useT();
  const { user, loading: authLoading, setUser } = useAuth();
  const { loadDemoData, assets, isSupabase } = useStore();
  const { ask, confirmDialog } = useConfirmDialog();
  const [demoMsg, setDemoMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  // --- Profil ------------------------------------------------------------
  const [profile, setProfile] = useState<Profile>({
    username: user?.username || "",
    fullName: user?.fullName || "",
    avatar: user?.avatar || "",
  });
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const loading = authLoading;
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setProfile(user);
    setFullName(user.fullName);
    setUsername(user.username);
    setAvatar(user.avatar);
  }, [user]);

  const handlePickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileMsg(null);
    if (!file.type.startsWith("image/")) {
      setProfileMsg({ ok: false, text: "Hanya file gambar (jpg, png, webp)." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ ok: false, text: "Maksimal 5MB. Kompres dulu ya." });
      return;
    }
    setUploading(true);
    try {
      const res = await uploadImage(file);
      setAvatar(res.url);
      setProfileMsg({
        ok: true,
        text: "Foto dipilih — jangan lupa klik Simpan Perubahan.",
      });
    } catch {
      setProfileMsg({ ok: false, text: "Gagal memproses foto. Coba lagi." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, username, avatar }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileMsg({
          ok: false,
          text: j.error || "Gagal menyimpan profil.",
        });
        return;
      }
      setProfile(j.profile);
      setUser(j.profile);
      setProfileMsg({ ok: true, text: "Profil berhasil disimpan ✓" });
    } catch {
      setProfileMsg({ ok: false, text: "Gagal menyimpan profil. Coba lagi." });
    } finally {
      setSaving(false);
    }
  };

  // --- Password ----------------------------------------------------------
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [resetting, setResetting] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const resetPassword = async () => {
    setPwMsg(null);
    if (!curPw || !newPw || !confPw) {
      setPwMsg({ ok: false, text: "Semua kolom password wajib diisi." });
      return;
    }
    if (newPw !== confPw) {
      setPwMsg({
        ok: false,
        text: "Konfirmasi password baru tidak sama.",
      });
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwMsg({ ok: false, text: j.error || "Gagal mereset password." });
        return;
      }
      setPwMsg({
        ok: true,
        text: "Password berhasil direset — pakai password baru di login berikutnya ✓",
      });
      setCurPw("");
      setNewPw("");
      setConfPw("");
    } catch {
      setPwMsg({ ok: false, text: "Gagal mereset password. Coba lagi." });
    } finally {
      setResetting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <UserCog className="h-6 w-6 text-amber-300" />
            {t("accountSetting")}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Kelola identitas &amp; keamanan akun administrator.
          </p>
        </div>

        {/* ---------- Profil ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("profile")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Foto profil */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-2xl overflow-hidden bg-[#CBA12C] text-[#1a365d] flex items-center justify-center text-2xl font-extrabold shrink-0 border border-[#2a4a6b]">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={fullName || username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(profile)
                )}
              </div>
              <div className="space-y-1.5">
                <div className="text-sm font-medium">{t("profilePicture")}</div>
                <div className="text-xs text-muted-foreground">
                  JPG / PNG / WEBP, maks 5MB — otomatis dikompres.
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePickPhoto}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading || loading}
                    onClick={() => fileRef.current?.click()}
                    className="rounded-lg"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {uploading ? "Mengupload..." : "Pilih Foto"}
                  </Button>
                  {avatar && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={uploading}
                      onClick={() => setAvatar("")}
                      className="rounded-lg text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" /> Hapus
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("fullName")}</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Administrator"
                className="h-11 rounded-xl"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("username")}</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("username")}
                className="h-11 rounded-xl font-mono"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                3–32 karakter: huruf, angka, titik, strip, underscore. Dipakai
                saat login.
              </p>
            </div>

            {profileMsg && (
              <div
                className={`text-sm rounded-xl border px-3 py-2 ${
                  profileMsg.ok
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}
              >
                {profileMsg.text}
              </div>
            )}
            <Button
              onClick={saveProfile}
              disabled={saving || loading || !username.trim()}
              className="rounded-xl"
            >
              <Check className="h-4 w-4" />
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </CardContent>
        </Card>

        {/* ---------- Password ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Perbarui password di sini. Isi password saat ini untuk verifikasi,
              lalu masukkan password barunya.
            </p>
            <div className="space-y-2">
              <Label>Password Saat Ini</Label>
              <Input
                type="password"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                className="h-11 rounded-xl"
                autoComplete="current-password"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Password Baru</Label>
                <Input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="h-11 rounded-xl"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label>Konfirmasi Password Baru</Label>
                <Input
                  type="password"
                  value={confPw}
                  onChange={(e) => setConfPw(e.target.value)}
                  className="h-11 rounded-xl"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimal 8 karakter, harus berisi huruf dan angka. Sesi lain akan
              keluar; sesi ini tetap aktif.
            </p>
            {pwMsg && (
              <div
                className={`text-sm rounded-xl border px-3 py-2 ${
                  pwMsg.ok
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}
              >
                {pwMsg.text}
              </div>
            )}
            <Button
              variant="outline"
              onClick={resetPassword}
              disabled={resetting}
              className="rounded-xl"
            >
              <KeyRound className="h-4 w-4" />
              {resetting ? "Memproses..." : "Reset Password"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" /> Data contoh Garudafood
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Muat ulang dataset demo: 28 aset, pabrik Pati/Rembang, DC
              Cikarang, peminjaman, kit, dan audit. Data aset yang ada akan
              ditimpa.
            </p>
            <p className="text-xs text-slate-500">
              Saat ini ada {assets.length} aset di sistem.
            </p>
            {isSupabase && (
              /* Mode Supabase: loadDemoData hanya mengubah state di browser
                 ini dan tidak menulis ke database, jadi data asli kembali
                 begitu halaman dimuat ulang. Lebih jujur dimatikan daripada
                 menjanjikan sesuatu yang tidak terjadi. */
              <div className="text-xs rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 px-3 py-2">
                Database Supabase aktif — data contoh dimuat lewat SQL (
                <code>supabase/03-seed.sql</code>), bukan dari tombol ini.
              </div>
            )}
            {demoMsg && (
              <div
                className={`text-sm rounded-xl border px-3 py-2 ${
                  demoMsg.ok
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}
              >
                {demoMsg.text}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={isSupabase}
                onClick={() =>
                  ask({
                    title: "Muat data aset contoh?",
                    description:
                      "Seluruh aset, booking, dan master data saat ini akan diganti dengan data dummy Garudafood.",
                    confirmLabel: "Ya, muat demo aset",
                    variant: "primary",
                    action: () => {
                      loadDemoData();
                      setDemoMsg({
                        ok: true,
                        text: "Data aset contoh Garudafood berhasil dimuat.",
                      });
                    },
                  })
                }
              >
                <Database className="h-4 w-4" /> Demo aset
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  ask({
                    title: "Muat tiket contoh?",
                    description:
                      "Daftar tiket helpdesk akan diganti 18 tiket dummy (IT, pabrik, fasilitas).",
                    confirmLabel: "Ya, muat demo tiket",
                    variant: "primary",
                    action: async () => {
                      try {
                        const res = await fetch("/api/tickets/seed", {
                          method: "POST",
                        });
                        const j = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          setDemoMsg({
                            ok: false,
                            text: j.error || "Gagal memuat tiket demo.",
                          });
                          return;
                        }
                        setDemoMsg({
                          ok: true,
                          text: `${
                            j.count ?? 0
                          } tiket contoh Garudafood dimuat.`,
                        });
                      } catch {
                        setDemoMsg({
                          ok: false,
                          text: "Tidak bisa terhubung ke server.",
                        });
                      }
                    },
                  })
                }
              >
                <Database className="h-4 w-4" /> Demo tiket
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {confirmDialog}
    </AppShell>
  );
}
