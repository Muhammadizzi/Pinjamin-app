import crypto from "node:crypto";
import type { Ticket } from "./tickets";
import {
  slaDeadlines,
  isTicketDone,
  type MessageAuthor,
  type MessageKind,
  type TicketMessage,
  type TicketPriority,
  type TicketStatus,
} from "./ticket-shared";

function iso(days: number, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, Math.abs(days * 7) % 50, 0, 0);
  return d.toISOString();
}

/**
 * Bentuk seed: hanya bagian yang ditulis tangan. Prioritas boleh dikosongkan
 * (jatuh ke MEDIUM), dan semua turunan — token portal, deadline SLA, waktu
 * respons pertama — dihitung `lengkapi()` supaya 18 literal di bawah tidak
 * perlu mengulang hal yang bisa disimpulkan.
 */
type Seed = {
  id: string;
  number: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority?: TicketPriority;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Tiket helpdesk contoh — karyawan & isu khas operasional Garudafood.
 * Beberapa taut ke aset demo (gf-ast-*) supaya panel Ticketing langsung
 * nyambung ke modul aset SIGAP.
 */
const SEEDS: Seed[] = [
  {
    id: "tck_gf_001",
    number: "TKT-GF8K2A",
    name: "Budi Santoso",
    email: "budi.santoso@garudafood.co.id",
    phone: "081234567890",
    category: "Aset & IT",
    subject: "ThinkPad X1 sering blue screen saat cutover SAP",
    message:
      "Laptop IT 02 (ThinkPad X1) restart sendiri 3x sejak kemarin saat buka SAP GUI. Sudah restart & update Windows. Mohon dicek sebelum go-live MM hari Jumat.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    adminNote: "Sudah remote. Suspect RAM. Tunggu spare SODIMM dari vendor.",
    createdAt: iso(-2, 8),
    updatedAt: iso(-1, 16),
  },
  {
    id: "tck_gf_002",
    number: "TKT-GF3N7P",
    name: "Siti Aminah",
    email: "siti.aminah@garudafood.co.id",
    phone: "081298765432",
    category: "Aset & IT",
    subject: "Proyektor Ruang Garuda tidak nyala",
    message:
      "Mau rapat campaign Gery jam 14.00. Proyektor Epson di Ruang Meeting Garuda lampu oranye, tidak ada sinyal HDMI dari laptop agency.",
    status: "OPEN",
    priority: "HIGH",
    adminNote: "",
    createdAt: iso(0, 9),
    updatedAt: iso(0, 9),
  },
  {
    id: "tck_gf_003",
    number: "TKT-GF9Q4C",
    name: "Joko Prasetyo",
    email: "joko.prasetyo@garudafood.co.id",
    phone: "081233445566",
    category: "Aset & IT",
    subject: "Packing machine Line 1 error sealer temperature",
    message:
      "VFFS Gery Saluut Line 1 Pati alarm suhu sealer. Produksi tertahan sejak shift 1. Engineering sudah lihat, mohon tiket resmi + status aset di SIGAP.",
    status: "IN_PROGRESS",
    priority: "URGENT",
    adminNote: "Aset PIN-PCK011 sudah MAINTENANCE. Teknisi vendor datang sore.",
    createdAt: iso(-1, 6),
    updatedAt: iso(0, 7),
  },
  {
    id: "tck_gf_004",
    number: "TKT-GF2H8M",
    name: "Ahmad Fauzi",
    email: "ahmad.fauzi@garudafood.co.id",
    phone: "081276543210",
    category: "Aset & IT",
    subject: "Timbangan analitik Ohaus perlu kalibrasi ulang",
    message:
      "Hasil uji kadar air lot tepung Australia tidak konsisten vs lab Rembang. Mohon jadwalkan kalibrasi Ohaus PX224 di Lab QC Pati sebelum audit HACCP.",
    status: "OPEN",
    adminNote: "",
    createdAt: iso(-1, 11),
    updatedAt: iso(-1, 11),
  },
  {
    id: "tck_gf_005",
    number: "TKT-GF5R1D",
    name: "Hendra Wijaya",
    email: "hendra.wijaya@garudafood.co.id",
    phone: "081244556677",
    category: "Aset & IT",
    subject: "Printer Zebra gudang FG tidak cetak label pallet",
    message:
      "Zebra ZT411 di Gudang Finished Goods Pati error ribbon. Stok label masih ada. Butuh ganti ribbon + cek driver SAP EWM.",
    status: "RESOLVED",
    adminNote:
      "Ribbon diganti, print test 20 label OK. Tutup tiket setelah shift 2 konfirmasi.",
    createdAt: iso(-5, 7),
    updatedAt: iso(-3, 15),
  },
  {
    id: "tck_gf_006",
    number: "TKT-GF7W3B",
    name: "Maya Putri",
    email: "maya.putri@garudafood.co.id",
    phone: "081233221100",
    category: "Aset & IT",
    subject: "Tidak bisa akses folder share tender kemasan",
    message:
      "Folder \\\\gf-file\\procurement\\tender-bopp tidak bisa dibuka dari laptop EliteBook. Error access denied. Butuh akses read/write untuk tender film BOPP minggu ini.",
    status: "IN_PROGRESS",
    adminNote: "Request AD group PROC-TENDER sudah diajukan ke IT Security.",
    createdAt: iso(-3, 13),
    updatedAt: iso(-2, 9),
  },
  {
    id: "tck_gf_007",
    number: "TKT-GF4P6K",
    name: "Rina Kusuma",
    email: "rina.kusuma@garudafood.co.id",
    phone: "081255667788",
    category: "Fasilitas / Gedung",
    subject: "AC lantai 3 Marketing tidak dingin",
    message:
      "Ruang Marketing HQ Lt.3 panas sejak Senin. Suhu sekitar 29°C. Tim sudah 18 orang, meeting agency jadi tidak nyaman.",
    status: "OPEN",
    priority: "LOW",
    adminNote: "",
    createdAt: iso(-1, 8),
    updatedAt: iso(-1, 8),
  },
  {
    id: "tck_gf_008",
    number: "TKT-GF6T2F",
    name: "Dewi Lestari",
    email: "dewi.lestari@garudafood.co.id",
    phone: "081212345678",
    category: "Fasilitas / Gedung",
    subject: "Kartu akses basement mobil direksi error",
    message:
      "Kartu tap Innova B 88 GF tidak membuka palang basement HQ. Security minta tiket ke GA/IT akses.",
    status: "RESOLVED",
    adminNote: "Kartu di-reprogram di sistem C3. Tes tap 3x berhasil.",
    createdAt: iso(-6, 7),
    updatedAt: iso(-5, 11),
  },
  {
    id: "tck_gf_009",
    number: "TKT-GF1J9S",
    name: "Andi Saputra",
    email: "andi.saputra@garudafood.co.id",
    phone: "081288990011",
    category: "Fasilitas / Gedung",
    subject: "Lampu emergency Line 1 Pati beberapa titik mati",
    message:
      "Audit safety minggu depan. 4 titik emergency lamp di area oven tunnel tidak nyala saat tes. Mohon penggantian baterai/unit.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    adminNote: "PO baterai ke vendor safety. Estimasi datang 2 hari.",
    createdAt: iso(-4, 9),
    updatedAt: iso(-1, 14),
  },
  {
    id: "tck_gf_010",
    number: "TKT-GF8C5V",
    name: "Lina Hartati",
    email: "lina.hartati@garudafood.co.id",
    phone: "081277889900",
    category: "Aset & IT",
    subject: "L300 Surabaya servis — minta mobil pengganti",
    message:
      "Pickup L300 bunyi aneh di bagian kopling saat tour Indomaret Jatim. Bisa diservis di bengkel resmi? Sales butuh unit cadangan 3 hari.",
    status: "OPEN",
    adminNote: "",
    createdAt: iso(0, 7),
    updatedAt: iso(0, 7),
  },
  {
    id: "tck_gf_011",
    number: "TKT-GF2M8Y",
    name: "Budi Santoso",
    email: "budi.santoso@garudafood.co.id",
    phone: "081234567890",
    category: "Aset & IT",
    subject: "Meja standing desk IT macet — tidak naik",
    message:
      "Meja listrik ruang IT HQ tidak bisa dinaikkan. Motor bunyi klik. Mohon teknisi furniture / ganti unit.",
    status: "IN_PROGRESS",
    adminNote: "Aset PIN-MEJ006 sudah MAINTENANCE. Sparepart dipesan.",
    createdAt: iso(-4, 10),
    updatedAt: iso(-2, 15),
  },
  {
    id: "tck_gf_012",
    number: "TKT-GF9D3H",
    name: "Siti Aminah",
    email: "siti.aminah@garudafood.co.id",
    phone: "081298765432",
    category: "Umum",
    subject: "Request konsumsi rapat launching Chocolatos",
    message:
      "Rapat agency + internal marketing Kamis, 12 orang. Mohon snack Gery + air mineral di Ruang Garuda jam 13.30.",
    status: "RESOLVED",
    priority: "LOW",
    adminNote: "GA sudah siapkan. Tiket ditutup.",
    createdAt: iso(-8, 11),
    updatedAt: iso(-7, 9),
  },
  {
    id: "tck_gf_013",
    number: "TKT-GF4K7N",
    name: "Hendra Wijaya",
    email: "hendra.wijaya@garudafood.co.id",
    phone: "081244556677",
    category: "Fasilitas / Gedung",
    subject: "Atap kanopi loading dock Pati bocor",
    message:
      "Hujan semalam, area loading dock FG basah. Karton kemasan rawan lembap. Mohon perbaikan kanopi segera.",
    status: "OPEN",
    priority: "HIGH",
    adminNote: "",
    createdAt: iso(0, 6),
    updatedAt: iso(0, 6),
  },
  {
    id: "tck_gf_014",
    number: "TKT-GF6B2Q",
    name: "Ahmad Fauzi",
    email: "ahmad.fauzi@garudafood.co.id",
    phone: "081276543210",
    category: "Aset & IT",
    subject: "Metal detector Line 1 false reject tinggi",
    message:
      "Metal detector PIN-MTD026 reject 8% kemasan tanpa kontaminan. Produksi Gery terganggu. Mohon kalibrasi + cek coil.",
    status: "OPEN",
    priority: "URGENT",
    adminNote: "",
    createdAt: iso(-1, 15),
    updatedAt: iso(-1, 15),
  },
  {
    id: "tck_gf_015",
    number: "TKT-GF3F8W",
    name: "Rina Kusuma",
    email: "rina.kusuma@garudafood.co.id",
    phone: "081255667788",
    category: "Umum",
    subject: "Onboarding karyawan baru — akun email & VPN",
    message:
      "3 karyawan baru Produksi Pati mulai Senin. Mohon buatkan email @garudafood.co.id, akun SAP display, dan VPN. Nama sudah di email HRD kemarin.",
    status: "CLOSED",
    adminNote: "3 akun dibuat, password dikirim via WhatsApp HRD. Closed.",
    createdAt: iso(-12, 9),
    updatedAt: iso(-10, 16),
  },
  {
    id: "tck_gf_016",
    number: "TKT-GF8P5T",
    name: "Andi Saputra",
    email: "andi.saputra@garudafood.co.id",
    phone: "081288990011",
    category: "Lainnya",
    subject: "Radio HT shift malam beberapa unit tidak charge",
    message:
      "Dari set 12 HT safety Pati, 3 unit tidak mau ngecas di docking. Shift malam kesulitan komunikasi ke security.",
    status: "IN_PROGRESS",
    adminNote: "3 unit ditarik ke engineering. Docking bay dicek tegangan.",
    createdAt: iso(-2, 18),
    updatedAt: iso(-1, 8),
  },
  {
    id: "tck_gf_017",
    number: "TKT-GF1V4E",
    name: "Lina Hartati",
    email: "lina.hartati@garudafood.co.id",
    phone: "081277889900",
    category: "Umum",
    subject: "Request sample POSM untuk toko modern Surabaya",
    message:
      "Butuh 20 pack dummy Chocolatos + standing banner untuk display Indomaret Rungkut. Bisa diambil di DC atau dikirim ekspedisi?",
    status: "RESOLVED",
    priority: "LOW",
    adminNote: "Dikirim via L300. Diterima Lina 14.20.",
    createdAt: iso(-9, 10),
    updatedAt: iso(-7, 15),
  },
  {
    id: "tck_gf_018",
    number: "TKT-GF7N9A",
    name: "Dewi Lestari",
    email: "dewi.lestari@garudafood.co.id",
    phone: "081212345678",
    category: "Aset & IT",
    subject: "VPN putus saat approve pembayaran vendor",
    message:
      "VPN HQ sering disconnect sejak kemarin sore. Gagal approve Fiori. Mohon cek gateway.",
    status: "CLOSED",
    adminNote: "Restart concentrator VPN. Monitoring 24 jam stabil. Closed.",
    createdAt: iso(-11, 16),
    updatedAt: iso(-10, 9),
  },
];

/* ------------------------------------------------------------------ */
/* Thread contoh                                                       */
/* ------------------------------------------------------------------ */

type ThreadEntry = {
  author: MessageAuthor;
  body: string;
  /** Selisih hari & jam terhadap hari ini — sama seperti helper iso(). */
  at: [days: number, hour: number];
};

/**
 * Percakapan contoh untuk sebagian tiket. Tanpa ini panel admin memang berisi
 * 18 tiket, tapi semuanya tanpa satu balasan pun — persis tampilan sistem
 * lama, sehingga fitur thread-nya tidak terlihat sama sekali saat didemokan.
 *
 * Catatan internal (kind NOTE) TIDAK ditulis di sini: ia dihasilkan otomatis
 * dari `adminNote` tiap seed, mengikuti migrasi yang sama di
 * supabase/09-tickets-helpdesk.sql.
 */
const DEMO_THREADS: Record<string, ThreadEntry[]> = {
  tck_gf_001: [
    {
      author: "ADMIN",
      body: "Halo Pak Budi, sudah kami remote tadi pagi. Event viewer menunjukkan memory fault, kemungkinan besar RAM. Spare SODIMM 16GB sedang dipesan ke vendor. Sementara ini mohon hindari membuka SAP GUI bersamaan dengan Chrome banyak tab.",
      at: [-2, 13],
    },
    {
      author: "USER",
      body: "Baik Pak, sudah saya kurangi. Tapi tadi siang tetap restart 1x saat export laporan MM. Kira-kira RAM-nya datang kapan ya? Jumat sudah harus go-live.",
      at: [-1, 15],
    },
    {
      author: "ADMIN",
      body: "Vendor konfirmasi barang tiba Kamis pagi. Kalau sampai Kamis siang belum terpasang, kami siapkan unit pengganti sementara supaya cutover Jumat tidak terganggu.",
      at: [-1, 16],
    },
  ],
  tck_gf_003: [
    {
      author: "ADMIN",
      body: "Diterima. Aset PIN-PCK011 sudah kami set ke status Maintenance di SIGAP supaya tidak ikut dijadwalkan. Teknisi vendor dijadwalkan sore ini.",
      at: [-1, 8],
    },
    {
      author: "USER",
      body: "Noted Pak. Line 1 sementara kami alihkan ke Line 2. Mohon dikabari kalau sudah bisa jalan lagi.",
      at: [0, 7],
    },
  ],
  tck_gf_005: [
    {
      author: "ADMIN",
      body: "Ribbon sudah diganti dan print test 20 label pallet hasilnya bersih. Driver SAP EWM juga sudah di-reinstall. Mohon dicek dari sisi shift 2 ya.",
      at: [-3, 15],
    },
    {
      author: "USER",
      body: "Sudah dicoba shift 2, cetakan normal. Terima kasih.",
      at: [-3, 20],
    },
  ],
  tck_gf_006: [
    {
      author: "ADMIN",
      body: "Akses folder tender diatur lewat AD group PROC-TENDER. Permintaannya sudah kami ajukan ke IT Security, biasanya butuh 1x24 jam approval. Nanti Ibu perlu logout-login sekali agar group-nya terbaca.",
      at: [-2, 9],
    },
  ],
  tck_gf_009: [
    {
      author: "ADMIN",
      body: "4 titik sudah kami cek: 3 baterai drop, 1 unit modulnya rusak. PO baterai + 1 unit baru sudah masuk ke vendor safety, estimasi datang 2 hari kerja. Masih aman sebelum audit minggu depan.",
      at: [-1, 14],
    },
  ],
  tck_gf_015: [
    {
      author: "ADMIN",
      body: "3 akun email @garudafood.co.id sudah dibuat, SAP display sudah di-assign, VPN profile menyusul sore ini. Password awal kami kirim ke HRD, mohon diminta diganti saat login pertama.",
      at: [-11, 10],
    },
    {
      author: "USER",
      body: "Sudah diteruskan ke tiga-tiganya, semua berhasil login. Tiket boleh ditutup.",
      at: [-10, 16],
    },
  ],
  tck_gf_018: [
    {
      author: "ADMIN",
      body: "VPN concentrator sudah kami restart dan pantau 24 jam — tidak ada disconnect lagi. Kalau masih putus saat approve Fiori, mohon buat tiket baru dengan jam kejadiannya.",
      at: [-10, 9],
    },
  ],
};

/** Semua pesan demo: catatan internal dari adminNote + thread di atas. */
export function buildDemoMessages(): TicketMessage[] {
  const out: TicketMessage[] = [];

  for (const seed of SEEDS) {
    if (seed.adminNote) {
      out.push({
        id: `msg_demo_${seed.id}_note`,
        ticketId: seed.id,
        author: "ADMIN",
        kind: "NOTE" as MessageKind,
        body: seed.adminNote,
        attachments: [],
        createdAt: seed.updatedAt,
      });
    }
    (DEMO_THREADS[seed.id] || []).forEach((entry, i) => {
      out.push({
        id: `msg_demo_${seed.id}_${i}`,
        ticketId: seed.id,
        author: entry.author,
        kind: "REPLY" as MessageKind,
        body: entry.body,
        attachments: [],
        createdAt: iso(entry.at[0], entry.at[1]),
      });
    });
  }

  return out.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

/** Waktu balasan ADMIN pertama pada satu tiket — dasar SLA respons. */
function firstAdminReply(ticketId: string): string | null {
  const first = (DEMO_THREADS[ticketId] || []).find(
    (e) => e.author === "ADMIN"
  );
  return first ? iso(first.at[0], first.at[1]) : null;
}

/** Lengkapi seed menjadi Ticket utuh (token portal, deadline SLA, dsb.). */
function lengkapi(seed: Seed): Ticket {
  const priority = seed.priority ?? "MEDIUM";
  const due = slaDeadlines(seed.createdAt, priority);
  return {
    id: seed.id,
    number: seed.number,
    name: seed.name,
    email: seed.email,
    phone: seed.phone,
    category: seed.category,
    subject: seed.subject,
    message: seed.message,
    status: seed.status,
    priority,
    accessToken: crypto.randomBytes(32).toString("hex"),
    attachments: [],
    adminNote: seed.adminNote,
    responseDueAt: due.responseDueAt,
    resolutionDueAt: due.resolutionDueAt,
    firstResponseAt: firstAdminReply(seed.id),
    resolvedAt: isTicketDone(seed.status) ? seed.updatedAt : null,
    // Tidak ada tiket contoh yang berstatus REPLIED, jadi tak satu pun
    // sedang dijeda.
    slaPausedAt: null,
    slaPausedMs: 0,
    createdAt: seed.createdAt,
    updatedAt: seed.updatedAt,
  };
}

export function buildDemoTickets(): Ticket[] {
  return SEEDS.map(lengkapi);
}
