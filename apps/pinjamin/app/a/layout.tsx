import type { Metadata } from "next";

/**
 * Halaman hasil pindai QR TIDAK boleh masuk mesin pencari.
 *
 * Ia publik karena stikernya, bukan karena isinya layak dicari orang. Tanpa
 * penanda ini, seluruh registri aset Garudafood bisa ditemukan lewat Google
 * tanpa seorang pun pernah memegang asetnya — dan itu persis kebalikan dari
 * "disembunyikan dari landing page".
 *
 * Ditaruh di layout, bukan di komponen halaman: halaman itu "use client" dan
 * tidak bisa mengekspor metadata, sementara <meta> yang disisipkan React
 * setelah hidrasi tidak dijamin terbaca perayap.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function LayoutAsetPublik({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
