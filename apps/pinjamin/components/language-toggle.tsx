"use client";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const { lang, setLang } = useT();
  return (
    <div className="flex items-center rounded-full bg-white/10 backdrop-blur border border-white/15 p-1 gap-1">
      <button
        onClick={() => setLang("id")}
        className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${lang === "id" ? "bg-white dark:bg-amber-400 text-[#1a365d] dark:text-[#0a2240] shadow" : "text-white/70 hover:text-white"}`}
      >
        ID
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${lang === "en" ? "bg-white dark:bg-amber-400 text-[#1a365d] dark:text-[#0a2240] shadow" : "text-white/70 hover:text-white"}`}
      >
        EN
      </button>
    </div>
  );
}

// For light header (dashboard) variant
export function LanguageToggleLight() {
  const { lang, setLang } = useT();
  return (
    <div className="flex items-center rounded-full bg-slate-100 dark:bg-slate-800 border p-1 gap-1">
      <button onClick={() => setLang("id")} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === "id" ? "bg-[#1a365d] text-white shadow" : "text-slate-600 dark:text-slate-400"}`}>
        ID
      </button>
      <button onClick={() => setLang("en")} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === "en" ? "bg-[#1a365d] text-white shadow" : "text-slate-600 dark:text-slate-400"}`}>
        EN
      </button>
    </div>
  );
}
