"use client";
import { Image as ImageIcon } from "lucide-react";

const sizeMap = {
  xs: "h-9 w-9 rounded-lg",
  sm: "h-11 w-11 rounded-xl",
  md: "h-14 w-14 rounded-xl",
  lg: "h-20 w-20 rounded-2xl",
  xl: "h-28 w-28 rounded-2xl",
} as const;

const iconSizeMap = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-10 w-10",
} as const;

type Props = {
  src?: string | null;
  alt?: string;
  size?: keyof typeof sizeMap;
  className?: string;
};

/**
 * Thumbnail kotak (rounded square) untuk foto aset — persis gaya referensi:
 * kotak abu-abu dengan ikon gambar di tengah saat belum ada foto,
 * dan menampilkan foto (object-cover) jika sudah ada.
 */
export function AssetImage({
  src,
  alt = "Foto aset",
  size = "md",
  className = "",
}: Props) {
  const sizeCls = sizeMap[size];
  const iconCls = iconSizeMap[size];
  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-center ${sizeCls} ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <ImageIcon
          className={`${iconCls} text-slate-400 dark:text-slate-500`}
          strokeWidth={1.75}
        />
      )}
    </div>
  );
}
