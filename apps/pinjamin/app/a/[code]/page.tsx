"use client";
import { use, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  Loader2,
  MapPin,
  Tag,
  User,
  Calendar,
  Cpu,
  History,
} from "lucide-react";
import { STATUS_LABEL_ID, STATUS_CLS_ASET } from "@/lib/asset-labels-id";
import { formatDateTime } from "@/lib/utils";

interface AsetPublik {
  qrCode: string;
  name: string;
  description?: string | null;
  status: string;
  mainImage?: string | null;
  serialNumber?: string | null;
  owner?: string | null;
  spec?: string | null;
  createdAt: string;
  category?: string | null;
  categoryColor?: string | null;
  location?: string | null;
}

interface Pemakai {
  name: string;
  department?: string | null;
  fromDate: string;
  toDate?: string | null;
}

/**
 * Halaman hasil pindai QR — dibuka kamera HP, tanpa login.
 *
 * Sepenuhnya baca-saja: tidak ada satu pun tombol yang mengubah data, dan
 * endpoint di baliknya hanya punya handler GET. Halaman ini juga tidak
 * ditaut dari landing page maupun peta situs; jalan masuknya cuma stiker.
 */
export default function HalamanAsetPublik({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [aset, setAset] = useState<AsetPublik | null>(null);
  const [pemakai, setPemakai] = useState<Pemakai[]>([]);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  const muat = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/asset/${encodeURIComponent(code)}`, {
        cache: "no-store",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGalat(j.error || "Aset tidak ditemukan.");
        return;
      }
      setAset(j.asset);
      setPemakai(j.holders || []);
    } catch {
      setGalat("Gagal memuat data aset.");
    } finally {
      setMemuat(false);
    }
  }, [code]);

  useEffect(() => {
    void muat();
  }, [muat]);

  const sekarang = pemakai.find((p) => !p.toDate);
  const sebelumnya = pemakai.filter((p) => p.toDate);

  return (
    <div className="min-h-screen bg-[#0f1d33] text-white">
      <header className="border-b border-[#243a5e] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Image
            src="/sigap-logo.png"
            alt="SIGAP"
            width={32}
            height={32}
            priority
            className="h-8 w-8 object-contain"
          />
          <div className="leading-tight">
            <div className="text-sm font-bold">SIGAP</div>
            <div className="text-[10px] tracking-widest text-slate-400">
              GARUDAFOOD
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {memuat ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#243a5e] py-16 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat data aset…
          </div>
        ) : galat || !aset ? (
          <div className="rounded-2xl border border-[#243a5e] bg-[#12263f]/60 p-8 text-center">
            <div className="text-lg font-bold">Aset tidak ditemukan</div>
            <p className="mt-2 text-sm text-slate-400">{galat}</p>
            <p className="mt-4 font-mono text-xs text-slate-500">{code}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <section className="rounded-2xl border border-[#243a5e] bg-[#12263f]/60 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="relative mx-auto h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-[#243a5e] bg-[#0f1d33] sm:mx-0">
                  {aset.mainImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={aset.mainImage}
                      alt={aset.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-600">
                      <Tag className="h-10 w-10" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                      STATUS_CLS_ASET[aset.status]?.cls ||
                      "border-slate-500/30 bg-slate-500/15 text-slate-300"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        STATUS_CLS_ASET[aset.status]?.dot || "bg-slate-400"
                      }`}
                    />
                    {STATUS_LABEL_ID[aset.status] || aset.status}
                  </span>
                  <h1 className="text-xl font-extrabold tracking-tight">
                    {aset.name}
                  </h1>
                  <p className="text-sm text-slate-400">
                    {aset.description || "Tanpa deskripsi"}
                  </p>
                  <div className="font-mono text-xs font-bold text-amber-300">
                    {aset.qrCode}
                  </div>
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-[#243a5e] pt-4 text-sm sm:grid-cols-2">
                <Baris ikon={Tag} label="Kategori" nilai={aset.category} />
                <Baris ikon={MapPin} label="Lokasi" nilai={aset.location} />
                <Baris ikon={User} label="Pemilik" nilai={aset.owner} />
                <Baris
                  ikon={Calendar}
                  label="Terdaftar"
                  nilai={formatDateTime(aset.createdAt)}
                />
                <Baris ikon={Cpu} label="Spesifikasi" nilai={aset.spec} lebar />
                <Baris
                  ikon={Tag}
                  label="Nomor Seri"
                  nilai={aset.serialNumber}
                  mono
                />
              </dl>
            </section>

            <section className="rounded-2xl border border-[#243a5e] bg-[#12263f]/60 p-5">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <History className="h-4 w-4 text-amber-300" /> Riwayat Pemakai
              </h2>
              {pemakai.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Belum ada riwayat pemakai untuk aset ini.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {sekarang && (
                    <li className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                      <div className="text-sm font-semibold">
                        {sekarang.name}
                        {sekarang.department ? ` — ${sekarang.department}` : ""}
                      </div>
                      <div className="text-[11px] text-emerald-300">
                        Pemakai sekarang, sejak{" "}
                        {formatDateTime(sekarang.fromDate)}
                      </div>
                    </li>
                  )}
                  {sebelumnya.map((p, i) => (
                    <li
                      key={`${p.name}-${p.fromDate}-${i}`}
                      className="rounded-xl border border-[#243a5e] bg-[#0f1d33] px-3 py-2"
                    >
                      <div className="text-sm">
                        {p.name}
                        {p.department ? ` — ${p.department}` : ""}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {formatDateTime(p.fromDate)} →{" "}
                        {p.toDate ? formatDateTime(p.toDate) : "-"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="px-1 text-center text-[11px] leading-relaxed text-slate-500">
              Halaman ini hanya menampilkan data. Perubahan data aset dilakukan
              oleh admin SIGAP.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function Baris({
  ikon: Ikon,
  label,
  nilai,
  mono,
  lebar,
}: {
  ikon: typeof Tag;
  label: string;
  nilai?: string | null;
  mono?: boolean;
  lebar?: boolean;
}) {
  return (
    <div className={lebar ? "sm:col-span-2" : undefined}>
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500">
        <Ikon className="h-3.5 w-3.5" strokeWidth={1.5} /> {label}
      </dt>
      <dd className={`mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>
        {nilai || "-"}
      </dd>
    </div>
  );
}
