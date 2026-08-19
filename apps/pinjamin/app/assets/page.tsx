"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useStore } from "@/lib/store";
import type { Asset } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import {
  Search,
  Plus,
  Download,
  Upload,
  QrCode,
  MapPin,
  Tag as TagIcon,
  Filter,
  Trash2,
  Eye,
  Pencil,
  LayoutGrid,
  List,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { ImportDialog } from "@/components/import-dialog";
import { AssetImage } from "@/components/ui/asset-image";

export default function AssetsPage() {
  const {
    assets,
    categories,
    locations,
    tags,
    custodians,
    deleteAsset,
    importAssets,
    loadDemoData,
    isSupabase,
  } = useStore();
  const { t } = useT();
  const { ask, confirmDialog } = useConfirmDialog();
  const [importOpen, setImportOpen] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    msg: string;
  } | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [cat, setCat] = useState("ALL");
  const [loc, setLoc] = useState("ALL");
  const [tag, setTag] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<"list" | "card">("list");
  const [perPage, setPerPage] = useState(8);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let r = [...assets];
    if (q)
      r = r.filter(
        (a) =>
          a.name.toLowerCase().includes(q.toLowerCase()) ||
          a.qrCode.toLowerCase().includes(q.toLowerCase()) ||
          a.serialNumber?.toLowerCase().includes(q.toLowerCase())
      );
    if (status !== "ALL") r = r.filter((a) => a.status === status);
    if (cat !== "ALL") r = r.filter((a) => a.categoryId === cat);
    if (loc !== "ALL") r = r.filter((a) => a.locationId === loc);
    if (tag !== "ALL") r = r.filter((a) => a.tagIds.includes(tag));
    if (sort === "newest")
      r.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    if (sort === "name") r.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "value") r.sort((a, b) => (b.value || 0) - (a.value || 0));
    return r;
  }, [assets, q, status, cat, loc, tag, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const confirmDeleteAsset = (a: Asset) =>
    ask({
      title: "Hapus aset?",
      description: `"${a.name}" (${a.qrCode}) akan dihapus permanen dan tidak bisa dikembalikan.`,
      confirmLabel: "Ya, Hapus",
      action: () => deleteAsset(a.id),
    });

  const exportCSV = () => {
    if (filtered.length === 0) {
      setNotice({
        kind: "error",
        msg: "Tidak ada aset untuk diekspor — filter saat ini kosong.",
      });
      return;
    }
    const rows = filtered.map((a) => ({
      Nama: a.name,
      Status: a.status,
      Kategori: categories.find((c) => c.id === a.categoryId)?.name ?? "",
      Lokasi: locations.find((l) => l.id === a.locationId)?.name ?? "",
      "Kode QR": a.qrCode,
      Nilai: a.value ?? "",
      "No. Seri": a.serialNumber ?? "",
      Deskripsi: a.description ?? "",
      Peminjam: custodians.find((c) => c.id === a.custodianId)?.name ?? "",
      Tag: a.tagIds
        .map((id) => tags.find((tg) => tg.id === id)?.name)
        .filter(Boolean)
        .join(", "),
    }));
    const stamp = new Date().toISOString().slice(0, 10);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aset");
    XLSX.writeFile(wb, `pinjamin-aset-${stamp}.xlsx`);
    setNotice({
      kind: "success",
      msg: `${rows.length} aset diekspor ke Excel (.xlsx).`,
    });
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t("assets")}</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} aset • {assets.length} total
            </p>
          </div>
          <div className="flex gap-2">
            {/* Tombol Import: pakai Button outline agar identik dengan Export
                (label lama mewarisi teks putih di atas bg putih → terlihat blank) */}
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="rounded-xl"
            >
              <Upload className="h-4 w-4" /> Import Excel
            </Button>
            <Button
              variant="outline"
              onClick={exportCSV}
              className="rounded-xl"
            >
              <Download className="h-4 w-4" /> Export
            </Button>
            <Link href="/assets/new">
              <Button className="rounded-xl">
                <Plus className="h-4 w-4" /> New Asset
              </Button>
            </Link>
          </div>
        </div>

        {/* Notifikasi hasil import/export */}
        {notice && (
          <div
            className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
              notice.kind === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/30 bg-red-500/10 text-red-200"
            }`}
            role="status"
          >
            {notice.kind === "success" ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            )}
            <span className="flex-1">{notice.msg}</span>
            <button
              onClick={() => setNotice(null)}
              aria-label="Tutup notifikasi"
              className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Toolbar — Filter Rapi */}
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {/* Bar atas: Search + Status + Sort + View */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search assets, QR, serial..."
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10 h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-[#1a365d] focus:ring-2 focus:ring-[#1a365d]/10"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative">
                    <Select
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value);
                        setPage(1);
                      }}
                      className="w-[150px] h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 pr-8"
                    >
                      <option value="ALL">All Status</option>
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="CHECKED_OUT">CHECKED_OUT</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="RETIRED">RETIRED</option>
                    </Select>
                  </div>
                  <Select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-[150px] h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  >
                    <option value="newest">Date created</option>
                    <option value="name">Name A-Z</option>
                    <option value="value">Value</option>
                  </Select>
                  <div className="hidden sm:flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 p-1 gap-1">
                    <button
                      onClick={() => setView("list")}
                      className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all ${
                        view === "list"
                          ? "bg-[#1a365d] text-white shadow"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                      title="List view"
                    >
                      <List className="h-4 w-4" />
                      <span className="hidden lg:inline">List</span>
                    </button>
                    <button
                      onClick={() => setView("card")}
                      className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all ${
                        view === "card"
                          ? "bg-[#1a365d] text-white shadow"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                      title="Grid view"
                    >
                      <LayoutGrid className="h-4 w-4" />
                      <span className="hidden lg:inline">Grid</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bar bawah: Filter kategori/lokasi/tag/perpage + chips */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                <Filter className="h-3.5 w-3.5" />
                Filter
                {(cat !== "ALL" || loc !== "ALL" || tag !== "ALL") && (
                  <span className="ml-1 bg-[#1a365d] text-white text-[10px] px-2 py-0.5 rounded-full">
                    {
                      [cat !== "ALL", loc !== "ALL", tag !== "ALL"].filter(
                        Boolean
                      ).length
                    }{" "}
                    aktif
                  </span>
                )}
                {(cat !== "ALL" ||
                  loc !== "ALL" ||
                  tag !== "ALL" ||
                  status !== "ALL" ||
                  q) && (
                  <button
                    onClick={() => {
                      setCat("ALL");
                      setLoc("ALL");
                      setTag("ALL");
                      setStatus("ALL");
                      setQ("");
                      setPage(1);
                    }}
                    className="ml-auto text-xs normal-case tracking-normal font-medium text-[#1a365d] dark:text-amber-300 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Hapus filter
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <TagIcon className="h-3 w-3 text-slate-400" />
                    Category
                  </label>
                  <Select
                    value={cat}
                    onChange={(e) => {
                      setCat(e.target.value);
                      setPage(1);
                    }}
                    className="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    Location
                  </label>
                  <Select
                    value={loc}
                    onChange={(e) => {
                      setLoc(e.target.value);
                      setPage(1);
                    }}
                    className="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  >
                    <option value="ALL">All Locations</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <TagIcon className="h-3 w-3 text-slate-400" />
                    Tag
                  </label>
                  <Select
                    value={tag}
                    onChange={(e) => {
                      setTag(e.target.value);
                      setPage(1);
                    }}
                    className="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  >
                    <option value="ALL">All Tags</option>
                    {tags.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Per halaman
                  </label>
                  <Select
                    value={String(perPage)}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  >
                    <option value="8">8 / page</option>
                    <option value="20">20 / page</option>
                    <option value="50">50 / page</option>
                  </Select>
                </div>
              </div>

              {/* Active filter chips */}
              {(cat !== "ALL" ||
                loc !== "ALL" ||
                tag !== "ALL" ||
                status !== "ALL") && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {status !== "ALL" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1a365d] text-white text-xs font-medium">
                      Status: {status}
                      <button
                        onClick={() => setStatus("ALL")}
                        className="hover:bg-white/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {cat !== "ALL" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100 border border-amber-200 dark:border-amber-800 text-xs font-medium">
                      {categories.find((c) => c.id === cat)?.name}
                      <button
                        onClick={() => setCat("ALL")}
                        className="hover:bg-black/10 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {loc !== "ALL" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-800 text-xs font-medium">
                      {locations.find((l) => l.id === loc)?.name}
                      <button
                        onClick={() => setLoc("ALL")}
                        className="hover:bg-black/10 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {tag !== "ALL" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-medium">
                      {tags.find((t) => t.id === tag)?.name}
                      <button
                        onClick={() => setTag("ALL")}
                        className="hover:bg-black/10 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {paged.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center space-y-4">
              <div className="mx-auto h-20 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <PackageIcon />
              </div>
              <div>
                <div className="font-semibold">Belum ada aset</div>
                <div className="text-sm text-muted-foreground">
                  Buat manual, impor Excel apa adanya, atau muat data contoh
                  Garudafood.
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/assets/new">
                  <Button>Buat aset pertama</Button>
                </Link>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4" /> Impor Excel
                </Button>
                {/* Mode Supabase: data contoh dimuat lewat SQL seed, bukan
                    dari sini — loadDemoData tidak menulis ke database. */}
                {!isSupabase && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      loadDemoData();
                      setNotice({
                        kind: "success",
                        msg: "Data contoh Garudafood dimuat (aset, lokasi pabrik, peminjaman, audit).",
                      });
                    }}
                  >
                    Muat data demo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : view === "list" ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border bg-white dark:bg-slate-900">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 w-14">Foto</th>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Lokasi</th>
                    <th className="px-4 py-3">Custodian</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((a) => {
                    const catName =
                      categories.find((c) => c.id === a.categoryId)?.name ||
                      "-";
                    const locName =
                      locations.find((l) => l.id === a.locationId)?.name || "-";
                    const custName =
                      custodians.find((c) => c.id === a.custodianId)?.name ||
                      "-";
                    return (
                      <tr
                        key={a.id}
                        className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/assets/${a.id}`}
                            aria-label={`Lihat ${a.name}`}
                          >
                            <AssetImage
                              src={a.mainImage}
                              alt={a.name}
                              size="md"
                            />
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{a.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <QrCode className="h-3 w-3" /> {a.qrCode} •{" "}
                            {a.serialNumber}
                          </div>
                        </td>
                        <td className="px-4 py-3">{catName}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={a.status} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />{" "}
                            {locName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">{custName}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Link href={`/assets/${a.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/assets/${a.id}/edit`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              onClick={() => confirmDeleteAsset(a)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {paged.map((a) => (
                <Card key={a.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Link
                        href={`/assets/${a.id}`}
                        aria-label={`Lihat ${a.name}`}
                      >
                        <AssetImage src={a.mainImage} alt={a.name} size="md" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{a.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {a.qrCode} • {formatDate(a.createdAt)}
                        </div>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                        <div className="text-muted-foreground">Kategori</div>
                        <div className="font-medium">
                          {categories.find((c) => c.id === a.categoryId)
                            ?.name || "-"}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                        <div className="text-muted-foreground">Lokasi</div>
                        <div className="font-medium truncate">
                          {locations.find((l) => l.id === a.locationId)?.name ||
                            "-"}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/assets/${a.id}`} className="flex-1">
                        <Button
                          variant="outline"
                          className="w-full rounded-xl"
                          size="sm"
                        >
                          <Eye className="h-4 w-4" /> Detail
                        </Button>
                      </Link>
                      <Link href={`/assets/${a.id}/edit`} className="flex-1">
                        <Button className="w-full rounded-xl" size="sm">
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paged.map((a) => (
              <Card
                key={a.id}
                className="overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="h-32 bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-b border-slate-200/70 dark:border-slate-700/70">
                  {a.mainImage ? (
                    <img
                      src={a.mainImage}
                      alt={a.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <AssetImage src={null} alt={a.name} size="lg" />
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  <div className="font-semibold line-clamp-1">{a.name}</div>
                  <StatusBadge status={a.status} />
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {a.description}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Link href={`/assets/${a.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl"
                      >
                        Detail
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmDeleteAsset(a)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border bg-white dark:bg-slate-900 p-4">
          <div className="text-sm text-muted-foreground">
            Hal {page} dari {totalPages} • {filtered.length} hasil
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <span className="text-sm px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {confirmDialog}
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(rows) => {
          const r = importAssets(rows);
          setNotice({
            kind: r.imported > 0 ? "success" : "error",
            msg:
              r.imported > 0
                ? `${r.imported} aset diimpor dari spreadsheet.`
                : "Tidak ada baris yang masuk (mungkin semua duplikat).",
          });
          return r;
        }}
      />
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    AVAILABLE: "success",
    CHECKED_OUT: "info",
    MAINTENANCE: "warning",
    RETIRED: "secondary",
  };
  return <Badge variant={(map[status] as any) || "secondary"}>{status}</Badge>;
}
function PackageIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#94a3b8"
      strokeWidth="1.5"
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="M3.3 7 12 12l8.7-5M12 22V12" />
    </svg>
  );
}
