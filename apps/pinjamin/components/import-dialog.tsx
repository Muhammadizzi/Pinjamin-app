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
      setErr(e instanceof Error ? e.message : "Gagal membaca file.");
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
    const parts = [`${r.imported} aset masuk`];
    if (r.categoriesCreated) parts.push(`${r.categoriesCreated} kategori baru`);
    if (r.locationsCreated) parts.push(`${r.locationsCreated} lokasi baru`);
    if (r.custodiansCreated) parts.push(`${r.custodiansCreated} peminjam baru`);
    if (r.tagsCreated) parts.push(`${r.tagsCreated} tag baru`);
    if (r.modelsCreated) parts.push(`${r.modelsCreated} model baru`);
    const extra = r.skipped
      ? ` ${r.skipped} baris dilewati (duplikat QR / nama kosong).`
      : "";
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
            <div className="font-semibold">Impor dari Excel / CSV</div>
            <div className="text-xs text-slate-400">
              Tidak perlu template — kolom dideteksi otomatis, bisa Anda
              sesuaikan.
            </div>
          </div>
          <button
            onClick={close}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400"
            aria-label="Tutup"
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
                  {busy ? "Membaca file…" : "Jatuhkan atau pilih file"}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  .xlsx · .xls · .csv · .ods — header bebas (Nama / Barang /
                  Asset, Lokasi, Kategori, …)
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
                        Sheet: {s}
                      </option>
                    ))}
                  </Select>
                )}
                <span className="text-xs text-slate-400">
                  {parsed.rows.length} baris siap impor
                  {parsed.invalid
                    ? ` · ${parsed.invalid} tanpa nama dilewati`
                    : ""}
                </span>
                <button
                  className="ml-auto text-xs text-amber-300 hover:underline"
                  onClick={reset}
                >
                  Ganti file
                </button>
              </div>

              {!nameMapped && (
                <div className="text-xs rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-100 px-3 py-2">
                  Kolom <strong>Nama aset</strong> belum terpetakan. Pilih kolom
                  yang berisi nama barang di bawah.
                </div>
              )}

              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                  Pemetaan kolom
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {parsed.headers.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-xl border border-[#243a5e] bg-[#0f1d33] px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-500">
                          Kolom {i + 1}
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
                            {f.label}
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
                    Pratinjau ({Math.min(8, parsed.rows.length)} dari{" "}
                    {parsed.rows.length})
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-[#243a5e]">
                    <table className="w-full text-xs">
                      <thead className="bg-[#0f1d33] text-slate-400">
                        <tr>
                          <th className="px-3 py-2 text-left">Nama</th>
                          <th className="px-3 py-2 text-left">Kategori</th>
                          <th className="px-3 py-2 text-left">Lokasi</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">PIC</th>
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
                              {r.status || "AVAILABLE"}
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
            {done ? "Tutup" : "Batal"}
          </Button>
          {parsed && !done && (
            <Button
              className="rounded-xl"
              disabled={!nameMapped || parsed.rows.length === 0 || busy}
              onClick={confirm}
            >
              Impor {parsed.rows.length} baris
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
