"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  ACCEPTED_IMPORT,
  applyMapping,
  IMPORT_FIELDS,
  parseSpreadsheetFile,
  remapSpreadsheet,
  type ColumnMapping,
  type ImportFieldKey,
  type ParsedSpreadsheet,
} from "@/lib/import-file";
import type { ImportAssetsResult } from "@/lib/store";
import { useT } from "@/lib/i18n";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  X,
} from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onImport: (
    rows: ReturnType<typeof applyMapping>["rows"]
  ) => ImportAssetsResult;
};

export function ImportDialog({ open, onClose, onImport }: Props) {
  const { t, assetStatus } = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [parsed, setParsed] = useState<ParsedSpreadsheet | null>(null);
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const reset = () => {
    setBusy(false);
    setErr("");
    setParsed(null);
    setFileObj(null);
    setDone(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const loadFile = async (file: File, sheet?: string) => {
    setBusy(true);
    setErr("");
    setDone(null);
    try {
      const next = await parseSpreadsheetFile(file, sheet);
      setParsed(next);
      setFileObj(file);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("importReadFailed"));
      setParsed(null);
    } finally {
      setBusy(false);
    }
  };

  const changeSheet = async (sheet: string) => {
    if (!fileObj) return;
    await loadFile(fileObj, sheet);
  };

  const changeMapping = (col: number, field: ImportFieldKey) => {
    if (!parsed) return;
    const nextMap: ColumnMapping = { ...parsed.mapping, [col]: field };
    // Satu field hanya boleh dipakai sekali (kecuali skip)
    if (field !== "skip") {
      for (const [k, v] of Object.entries(nextMap)) {
        if (Number(k) !== col && v === field) nextMap[Number(k)] = "skip";
      }
    }
    setParsed(remapSpreadsheet(parsed, nextMap));
  };

  const nameMapped = useMemo(
    () => (parsed ? Object.values(parsed.mapping).includes("name") : false),
    [parsed]
  );

  const confirm = () => {
    if (!parsed || parsed.rows.length === 0) return;
    const r = onImport(parsed.rows);
    const parts = [t("importedSummary", { count: r.imported })];
    if (r.categoriesCreated)
      parts.push(t("createdCategories", { count: r.categoriesCreated }));
    if (r.locationsCreated)
      parts.push(t("createdLocations", { count: r.locationsCreated }));
    if (r.custodiansCreated)
      parts.push(t("createdCustodians", { count: r.custodiansCreated }));
    if (r.tagsCreated) parts.push(t("createdTags", { count: r.tagsCreated }));
    if (r.modelsCreated)
      parts.push(t("createdModels", { count: r.modelsCreated }));
    const extra = r.skipped ? t("skippedRows", { count: r.skipped }) : "";
    setDone(`${parts.join(", ")}.${extra}`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-[#0a1628]/70 backdrop-blur-sm"
        onClick={close}
      />
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-[#243a5e] bg-[#12263f] shadow-2xl flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#243a5e]">
          <FileSpreadsheet className="h-5 w-5 text-amber-300" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{t("importTitle")}</div>
            <div className="text-xs text-slate-400">{t("importSubtitle")}</div>
          </div>
          <button
            onClick={close}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400"
            aria-label={t("close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!parsed && !done && (
            <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#2a4a6b] bg-[#0f1d33] px-6 py-12 text-center cursor-pointer hover:border-amber-400/40 transition-colors">
              {busy ? (
                <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
              ) : (
                <FileSpreadsheet className="h-8 w-8 text-amber-300" />
              )}
              <div>
                <div className="font-medium">
                  {busy ? t("readingFile") : t("dropOrPickFile")}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {t("importFileHint")}
                </div>
              </div>
              <input
                type="file"
                accept={ACCEPTED_IMPORT}
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void loadFile(f);
                }}
              />
            </label>
          )}

          {err && (
            <div className="flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm px-3 py-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {err}
            </div>
          )}

          {done && (
            <div className="flex gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-sm px-3 py-3">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              {done}
            </div>
          )}

          {parsed && !done && (
            <>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-slate-300 truncate max-w-[220px]">
                  {parsed.fileName}
                </span>
                {parsed.sheetNames.length > 1 && (
                  <Select
                    value={parsed.sheetName}
                    onChange={(e) => void changeSheet(e.target.value)}
                    className="h-9 w-[180px] rounded-lg text-sm"
                  >
                    {parsed.sheetNames.map((s) => (
                      <option key={s} value={s}>
                        {t("sheetLabel", { name: s })}
                      </option>
                    ))}
                  </Select>
                )}
                <span className="text-xs text-slate-400">
                  {t("rowsReady", { count: parsed.rows.length })}
                  {parsed.invalid
                    ? t("rowsSkippedNoName", { count: parsed.invalid })
                    : ""}
                </span>
                <button
                  className="ml-auto text-xs text-amber-300 hover:underline"
                  onClick={reset}
                >
                  {t("changeFile")}
                </button>
              </div>

              {!nameMapped && (
                <div className="text-xs rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-100 px-3 py-2">
                  {t("nameNotMapped")}
                </div>
              )}

              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                  {t("columnMapping")}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {parsed.headers.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-xl border border-[#243a5e] bg-[#0f1d33] px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-500">
                          {t("columnN", { n: i + 1 })}
                        </div>
                        <div className="text-sm font-medium truncate" title={h}>
                          {h}
                        </div>
                      </div>
                      <Select
                        value={parsed.mapping[i] || "skip"}
                        onChange={(e) =>
                          changeMapping(i, e.target.value as ImportFieldKey)
                        }
                        className="h-9 w-[170px] rounded-lg text-xs"
                      >
                        {IMPORT_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {t(f.labelKey)}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {parsed.preview.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                    {t("previewCount", {
                      shown: Math.min(8, parsed.rows.length),
                      total: parsed.rows.length,
                    })}
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-[#243a5e]">
                    <table className="w-full text-xs">
                      <thead className="bg-[#0f1d33] text-slate-400">
                        <tr>
                          <th className="px-3 py-2 text-left">{t("name")}</th>
                          <th className="px-3 py-2 text-left">
                            {t("category")}
                          </th>
                          <th className="px-3 py-2 text-left">
                            {t("location")}
                          </th>
                          <th className="px-3 py-2 text-left">{t("status")}</th>
                          <th className="px-3 py-2 text-left">{t("colPic")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.preview.map((r, i) => (
                          <tr key={i} className="border-t border-[#243a5e]">
                            <td className="px-3 py-2 font-medium">{r.name}</td>
                            <td className="px-3 py-2 text-slate-400">
                              {r.categoryName || "—"}
                            </td>
                            <td className="px-3 py-2 text-slate-400">
                              {r.locationName || "—"}
                            </td>
                            <td className="px-3 py-2 text-slate-400">
                              {assetStatus(r.status || "AVAILABLE")}
                            </td>
                            <td className="px-3 py-2 text-slate-400">
                              {r.custodianName || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#243a5e] bg-[#0f1d33]">
          <Button variant="outline" className="rounded-xl" onClick={close}>
            {done ? t("close") : t("cancel")}
          </Button>
          {parsed && !done && (
            <Button
              className="rounded-xl"
              disabled={!nameMapped || parsed.rows.length === 0 || busy}
              onClick={confirm}
            >
              {t("importNRows", { count: parsed.rows.length })}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
