"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

type Lang = "id" | "en";

const dict = {
  id: {
    // Nav
    home: "Home",
    assets: "Aset",
    kits: "Kit",
    categories: "Kategori",
    tags: "Tag",
    locations: "Lokasi",
    customFields: "Custom Field",
    assetModels: "Model Aset",
    custodians: "Peminjam",
    audits: "Audit",
    bookings: "Peminjaman",
    reports: "Laporan",
    scanner: "Pemindai QR",
    assetManagement: "Manajemen Aset",
    operations: "Operasional",
    // Common
    search: "Cari",
    create: "Buat",
    edit: "Ubah",
    delete: "Hapus",
    save: "Simpan",
    cancel: "Batal",
    update: "Perbarui",
    detail: "Detail",
    status: "Status",
    name: "Nama",
    description: "Deskripsi",
    category: "Kategori",
    location: "Lokasi",
    custodian: "Peminjam",
    value: "Nilai",
    serialNumber: "Serial Number",
    actions: "Aksi",
    totalAsset: "Total Aset",
    available: "Tersedia",
    checkedOut: "Dipinjam",
    overdue: "Terlambat",
    maintenance: "Perawatan",
    retired: "Pensiun",
    // Dashboard
    dashboard: "Dasbor",
    dashboardSub: "Ringkasan aset & peminjaman — glass modern, responsif",
    newAsset: "Aset Baru",
    scanQr: "Pindai QR",
    allAssetsTracked: "Semua aset terdata",
    percentOfTotal: "% dari total",
    currentlyBorrowed: "Sedang dipinjam",
    needFollowUp: "Perlu tindak lanjut",
    noDelay: "Tidak ada keterlambatan",
    recentBookings: "Peminjaman Terbaru",
    viewAll: "Lihat semua",
    noBookings: "Belum ada peminjaman",
    needAttention: "Perlu Perhatian",
    allSafe: "Semua peminjaman aman 🎉",
    due: "Jatuh tempo",
    lastActivity: "Aktivitas Terakhir",
    assetCreated: "Aset “MacBook Pro” dibuat",
    justNowBy: "Baru saja oleh adminsystem",
    bookingOngoing: "Peminjaman “Proyektor” berjalan",
    yesterday: "Kemarin",
    auditOpened: "Audit Q1 dibuka",
    twoDaysAgo: "2 hari lalu",
    // Assets
    assetsTitle: "Aset",
    searchAssets: "Cari aset, QR, serial...",
    allStatus: "Semua Status",
    allCategories: "Semua Kategori",
    allLocations: "Semua Lokasi",
    allTags: "Semua Tag",
    export: "Ekspor",
    import: "Impor",
    list: "Daftar",
    card: "Kartu",
    noAssetsYet: "Belum ada aset",
    createFirstAsset: "Buat aset pertama",
    // Login
    welcome: "Selamat Datang",
    loginToPinjamin: "Masuk ke Pinjamin",
    username: "Username",
    password: "Password",
    login: "Masuk",
    loginAdmin: "Masuk Admin",
    rememberMe: "Ingat saya",
    forgotPassword: "Lupa password? Hubungi admin",
    // Scanner etc
    scannerTitle: "Pemindai QR",
    scannerSub: "Pindai cepat dengan kamera, upload gambar, atau input manual",
    scanCamera: "Pindai Kamera",
    inputManual: "Input Manual",
    uploadQrImage: "Unggah Gambar QR",
    recentAssetsTap: "Aset Terbaru — ketuk untuk simulasi",
    found: "Ditemukan",
    notFound: "Tidak ditemukan",
  },
  en: {
    home: "Home",
    assets: "Assets",
    kits: "Kits",
    categories: "Categories",
    tags: "Tags",
    locations: "Locations",
    customFields: "Custom Fields",
    assetModels: "Asset Models",
    custodians: "Custodians",
    audits: "Audits",
    bookings: "Bookings",
    reports: "Reports",
    scanner: "QR Scanner",
    assetManagement: "Asset Management",
    operations: "Operations",
    search: "Search",
    create: "Create",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    update: "Update",
    detail: "Detail",
    status: "Status",
    name: "Name",
    description: "Description",
    category: "Category",
    location: "Location",
    custodian: "Custodian",
    value: "Value",
    serialNumber: "Serial Number",
    actions: "Actions",
    totalAsset: "Total Assets",
    available: "Available",
    checkedOut: "Checked Out",
    overdue: "Overdue",
    maintenance: "Maintenance",
    retired: "Retired",
    dashboard: "Dashboard",
    dashboardSub: "Asset & lending overview — glass modern, responsive",
    newAsset: "New Asset",
    scanQr: "Scan QR",
    allAssetsTracked: "All assets tracked",
    percentOfTotal: "% of total",
    currentlyBorrowed: "Currently borrowed",
    needFollowUp: "Need follow-up",
    noDelay: "No delays",
    recentBookings: "Recent Bookings",
    viewAll: "View all",
    noBookings: "No bookings yet",
    needAttention: "Needs Attention",
    allSafe: "All bookings safe 🎉",
    due: "Due",
    lastActivity: "Recent Activity",
    assetCreated: "Asset “MacBook Pro” created",
    justNowBy: "Just now by adminsystem",
    bookingOngoing: "Booking “Projector” ongoing",
    yesterday: "Yesterday",
    auditOpened: "Audit Q1 opened",
    twoDaysAgo: "2 days ago",
    assetsTitle: "Assets",
    searchAssets: "Search assets, QR, serial...",
    allStatus: "All Status",
    allCategories: "All Categories",
    allLocations: "All Locations",
    allTags: "All Tags",
    export: "Export",
    import: "Import",
    list: "List",
    card: "Card",
    noAssetsYet: "No assets yet",
    createFirstAsset: "Create first asset",
    welcome: "Welcome",
    loginToPinjamin: "Sign in to Pinjamin",
    username: "Username",
    password: "Password",
    login: "Sign In",
    loginAdmin: "Admin Sign In",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password? Contact admin",
    scannerTitle: "QR Scanner",
    scannerSub: "Quick scan via camera, upload image, or manual input",
    scanCamera: "Scan Camera",
    inputManual: "Manual Input",
    uploadQrImage: "Upload QR Image",
    recentAssetsTap: "Recent Assets — tap to simulate",
    found: "Found",
    notFound: "Not found",
  },
} as const;

type Dict = typeof dict.id;
type Key = keyof Dict;

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string } | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");
  useEffect(() => {
    const saved = localStorage.getItem("pinjamin_lang") as Lang | null;
    if (saved && (saved === "id" || saved === "en")) setLangState(saved);
    else {
      const browser = navigator.language.startsWith("en") ? "en" : "id";
      setLangState(browser as Lang);
    }
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("pinjamin_lang", l);
    // dispatch event for listeners
    window.dispatchEvent(new CustomEvent("pinjamin:lang", { detail: l }));
  };
  const t = (k: Key) => dict[lang][k] || dict.id[k] || k;
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be inside I18nProvider");
  return ctx;
}
