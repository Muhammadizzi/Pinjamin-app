"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { messages, type MessageKey } from "./messages";

export type Lang = "id" | "en";
export type { MessageKey };

const LANG_KEY = "pinjamin_lang";
const LOCALE: Record<Lang, string> = { id: "id-ID", en: "en-US" };

/** Isi placeholder `{nama}` pada teks kamus. */
function interpolate(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole
  );
}

export type Translate = (
  key: MessageKey,
  vars?: Record<string, string | number>
) => string;

type I18nValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translate;
  /** Tanggal singkat mengikuti bahasa aktif (id-ID / en-US). */
  formatDate: (date: string | Date) => string;
  /** Tanggal + jam mengikuti bahasa aktif. */
  formatDateTime: (date: string | Date) => string;
  /** Angka mengikuti bahasa aktif (pemisah ribuan). */
  formatNumber: (n: number, opts?: Intl.NumberFormatOptions) => string;
  /** Rupiah — mata uangnya tetap IDR, hanya format angkanya yang ikut bahasa. */
  formatCurrency: (n: number) => string;
  /** Label status aset (AVAILABLE, CHECKED_OUT, ...). */
  assetStatus: (status: string) => string;
  /** Label status peminjaman (DRAFT, RESERVED, ONGOING, ...). */
  bookingStatus: (status: string) => string;
  /** Label status tiket helpdesk (OPEN, IN_PROGRESS, ...). */
  ticketStatus: (status: string) => string;
  /** Label hasil audit (FOUND, MISSING, DAMAGED). */
  auditResult: (result: string) => string;
  /**
   * Terjemahkan bodi error dari API. Route mengirim `code` yang stabil
   * (lihat app/api/auth/**) plus `error` berbahasa Indonesia sebagai
   * cadangan bila kodenya belum dikenal di sini.
   */
  serverError: (payload: unknown, fallback?: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

const ASSET_STATUS_KEY: Record<string, MessageKey> = {
  AVAILABLE: "statusAvailable",
  CHECKED_OUT: "statusCheckedOut",
  MAINTENANCE: "statusMaintenance",
  RETIRED: "statusRetired",
};

const BOOKING_STATUS_KEY: Record<string, MessageKey> = {
  DRAFT: "bookingDraft",
  RESERVED: "bookingReserved",
  ONGOING: "bookingOngoingStatus",
  OVERDUE: "bookingOverdue",
  COMPLETE: "bookingComplete",
  CANCELLED: "bookingCancelled",
};

const TICKET_STATUS_KEY: Record<string, MessageKey> = {
  OPEN: "ticketOpen",
  IN_PROGRESS: "ticketInProgress",
  RESOLVED: "ticketResolved",
  CLOSED: "ticketClosed",
};

const AUDIT_RESULT_KEY: Record<string, MessageKey> = {
  FOUND: "auditFound",
  MISSING: "auditMissing",
  DAMAGED: "auditDamaged",
};

/** `code` dari route API -> kunci kamus. */
const SERVER_ERROR_KEY: Record<string, MessageKey> = {
  tooManyAttempts: "errTooManyAttempts",
  invalidBody: "errInvalidBody",
  adminNotConfigured: "errAdminNotConfigured",
  badCredentials: "errBadCredentials",
  serverMisconfigured: "errServerMisconfigured",
  wrongCurrentPassword: "errWrongCurrentPassword",
  samePassword: "errSamePassword",
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Selalu mulai dari "id" supaya markup server & client identik; preferensi
  // tersimpan dibaca setelah mount (lihat efek di bawah).
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "id" || saved === "en") {
      setLangState(saved);
      return;
    }
    if (navigator.language.toLowerCase().startsWith("en")) setLangState("en");
  }, []);

  // Bahasa juga bisa diubah dari tab/komponen lain — ikut mendengarkan.
  useEffect(() => {
    const onLang = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d === "id" || d === "en") setLangState(d);
    };
    window.addEventListener("pinjamin:lang", onLang);
    return () => window.removeEventListener("pinjamin:lang", onLang);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
    window.dispatchEvent(new CustomEvent("pinjamin:lang", { detail: l }));
  }, []);

  const value = useMemo<I18nValue>(() => {
    const idx = lang === "en" ? 1 : 0;
    const locale = LOCALE[lang];
    const t: Translate = (key, vars) => {
      const entry = messages[key];
      if (!entry) return key;
      return interpolate(entry[idx] || entry[0], vars);
    };
    const byKey =
      (map: Record<string, MessageKey>) =>
      (raw: string): string => {
        const key = map[raw];
        return key ? t(key) : raw;
      };
    return {
      lang,
      setLang,
      t,
      formatDate: (date) =>
        new Intl.DateTimeFormat(locale, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(typeof date === "string" ? new Date(date) : date),
      formatDateTime: (date) =>
        new Intl.DateTimeFormat(locale, {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(typeof date === "string" ? new Date(date) : date),
      formatNumber: (n, opts) => new Intl.NumberFormat(locale, opts).format(n),
      formatCurrency: (n) =>
        new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(n),
      serverError: (payload, fallback) => {
        const body = (payload ?? {}) as Record<string, unknown>;
        const key =
          typeof body.code === "string"
            ? SERVER_ERROR_KEY[body.code]
            : undefined;
        if (key) {
          return t(key, {
            retryAfter:
              typeof body.retryAfter === "number" ? body.retryAfter : 0,
          });
        }
        if (typeof body.error === "string" && body.error) return body.error;
        return fallback ?? t("genericFailed");
      },
      assetStatus: byKey(ASSET_STATUS_KEY),
      bookingStatus: byKey(BOOKING_STATUS_KEY),
      ticketStatus: byKey(TICKET_STATUS_KEY),
      auditResult: byKey(AUDIT_RESULT_KEY),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be inside I18nProvider");
  return ctx;
}
