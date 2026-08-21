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
  const { t, serverError } = useT();
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
      setProfileMsg({ ok: false, text: t("onlyImageFilesShort") });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ ok: false, text: t("maxFileSize") });
      return;
    }
    setUploading(true);
    try {
      const res = await uploadImage(file, "avatar");
      setAvatar(res.url);
      setProfileMsg({ ok: true, text: t("photoPickedReminder") });
    } catch {
      setProfileMsg({ ok: false, text: t("photoProcessFailed") });
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
          text: serverError(j, t("profileSaveFailed")),
        });
        return;
      }
      setProfile(j.profile);
      setUser(j.profile);
      setProfileMsg({ ok: true, text: t("profileSaved") });
    } catch {
      setProfileMsg({ ok: false, text: t("profileSaveFailedRetry") });
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
      setPwMsg({ ok: false, text: t("allPasswordFieldsRequired") });
      return;
    }
    if (newPw !== confPw) {
      setPwMsg({ ok: false, text: t("passwordMismatch") });
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
        setPwMsg({ ok: false, text: serverError(j, t("passwordResetFailed")) });
        return;
      }
      setPwMsg({ ok: true, text: t("passwordResetOk") });
      setCurPw("");
      setNewPw("");
      setConfPw("");
    } catch {
      setPwMsg({ ok: false, text: t("passwordResetFailedRetry") });
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
            {t("accountSettingsSub")}
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
                  {t("avatarHint")}
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
                    {uploading ? t("uploading") : t("pickPhoto")}
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
                      <Trash2 className="h-4 w-4" /> {t("delete")}
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
                {t("usernameHint")}
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
              {saving ? t("saving") : t("saveChanges")}
            </Button>
          </CardContent>
        </Card>

        {/* ---------- Password ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> {t("password")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("passwordSectionHint")}
            </p>
            <div className="space-y-2">
              <Label>{t("currentPassword")}</Label>
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
                <Label>{t("newPassword")}</Label>
                <Input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="h-11 rounded-xl"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("confirmNewPassword")}</Label>
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
              {t("passwordRulesHint")}
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
              {resetting ? t("processing") : t("resetPassword")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" /> {t("demoDataSection")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("demoDataSectionHint")}
            </p>
            <p className="text-xs text-slate-500">
              {t("currentAssetCount", { count: assets.length })}
            </p>
            {isSupabase && (
              /* Mode Supabase: loadDemoData hanya mengubah state di browser
                 ini dan tidak menulis ke database, jadi data asli kembali
                 begitu halaman dimuat ulang. Lebih jujur dimatikan daripada
                 menjanjikan sesuatu yang tidak terjadi. */
              <div className="text-xs rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 px-3 py-2">
                {t("supabaseSeedNote")}
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
                    title: t("confirmLoadDemoAssets"),
                    description: t("confirmLoadDemoAssetsBody"),
                    confirmLabel: t("yesLoadDemoAssets"),
                    variant: "primary",
                    action: () => {
                      loadDemoData();
                      setDemoMsg({ ok: true, text: t("demoAssetsLoaded") });
                    },
                  })
                }
              >
                <Database className="h-4 w-4" /> {t("demoAssetsBtn")}
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  ask({
                    title: t("confirmLoadDemoTickets"),
                    description: t("confirmLoadDemoTicketsShortBody"),
                    confirmLabel: t("yesLoadDemoTickets"),
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
                            text: j.error || t("demoTicketsFailed"),
                          });
                          return;
                        }
                        setDemoMsg({
                          ok: true,
                          text: t("demoTicketsLoadedSettings", {
                            count: j.count ?? 0,
                          }),
                        });
                      } catch {
                        setDemoMsg({ ok: false, text: t("serverUnreachable") });
                      }
                    },
                  })
                }
              >
                <Database className="h-4 w-4" /> {t("demoTicketsBtn")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {confirmDialog}
    </AppShell>
  );
}
