/**
 * Rate limiter in-memory per-proses.
 * Cukup untuk 1 instance / demo. Di serverless multi-instance, batas
 * berlaku per isolate — tetap menahan brute-force dari 1 IP ke 1 instance.
 *
 * Memorinya dibatasi (MAX_KEYS) dan biaya pembersihannya teramortisasi, jadi
 * banjir dari banyak IP tidak bisa menjadikan limiter ini bottleneck-nya
 * sendiri. Untuk batas yang berlaku lintas-isolate, penyimpanannya harus
 * dipindah ke Redis — antarmuka createRateLimiter() sengaja dibuat sempit
 * supaya penggantinya cukup menyentuh berkas ini.
 */

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: 0; retryAfter: number };

type Bucket = { count: number; firstAt: number };

/**
 * Batas atas jumlah kunci yang disimpan satu limiter, dan tinggi air yang
 * dituju saat membuangnya.
 *
 * DDOS-01: versi sebelumnya menyapu SELURUH Map pada setiap check() begitu
 * ukurannya melewati 500. Selama banjir dari banyak IP, entri di dalam window
 * belum kedaluwarsa — sapuan itu tidak menghapus apa pun, Map terus tumbuh,
 * dan tiap request membayar sapuan yang makin panjang. Pertahanannya melemah
 * justru ketika paling dibutuhkan, dan Map tanpa batas bisa menghabiskan
 * memori isolate.
 *
 * Jarak MAX ke TARGET-lah yang membuat biayanya teramortisasi: satu sapuan
 * menyediakan ruang untuk 2.000 kunci berikutnya, jadi biaya per request
 * kembali ~O(1). Membuang tepat sampai MAX (tanpa jarak) akan memicu sapuan
 * penuh lagi pada request berikutnya — persis bug yang diperbaiki di sini.
 */
const MAX_KEYS = 20_000;
const TARGET_KEYS = 18_000;

/** Sapuan terjadwal paling sering sekali per interval ini. */
const PRUNE_INTERVAL_MS = 30_000;

export function createRateLimiter(opts: {
  maxAttempts: number;
  windowMs: number;
}) {
  const attempts = new Map<string, Bucket>();
  let lastPrune = 0;

  /**
   * Buang entri kedaluwarsa, lalu — bila masih sesak — entri tertua sampai
   * TARGET_KEYS. Map JavaScript menjaga urutan penyisipan, dan setiap window
   * baru selalu di-set ulang, jadi kunci terdepan adalah window yang paling
   * dekat kedaluwarsa. Itu urutan pembuangan yang tepat: yang dikorbankan
   * adalah kuota yang memang hampir pulih dengan sendirinya.
   */
  function prune(now: number) {
    const terjadwal = now - lastPrune >= PRUNE_INTERVAL_MS;
    const sesak = attempts.size > MAX_KEYS;
    if (!terjadwal && !sesak) return;
    lastPrune = now;

    for (const [k, v] of attempts) {
      if (now - v.firstAt > opts.windowMs) attempts.delete(k);
    }

    // Semua entri masih di dalam window (tanda banjir dari banyak IP): buang
    // yang tertua. Kehilangan hitungan berarti IP itu dapat kuota baru —
    // konsekuensi yang disengaja. Limiter yang memakan memori sampai isolate
    // mati melindungi lebih sedikit daripada limiter yang sesekali lupa.
    if (attempts.size > TARGET_KEYS) {
      let sisa = attempts.size - TARGET_KEYS;
      for (const k of attempts.keys()) {
        attempts.delete(k);
        if (--sisa <= 0) break;
      }
    }
  }

  function check(key: string): RateLimitResult {
    const now = Date.now();
    prune(now);
    const entry = attempts.get(key);
    if (!entry) {
      attempts.set(key, { count: 1, firstAt: now });
      return { allowed: true, remaining: opts.maxAttempts - 1 };
    }
    if (now - entry.firstAt > opts.windowMs) {
      attempts.set(key, { count: 1, firstAt: now });
      return { allowed: true, remaining: opts.maxAttempts - 1 };
    }
    if (entry.count >= opts.maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((entry.firstAt + opts.windowMs - now) / 1000),
      };
    }
    entry.count += 1;
    return { allowed: true, remaining: opts.maxAttempts - entry.count };
  }

  function reset(key: string) {
    attempts.delete(key);
  }

  return { check, reset };
}

/** Login admin: 5 percobaan / 15 menit per IP. */
export const loginLimiter = createRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
});

/**
 * Tiket publik: 60 kiriman / 15 menit per IP (terpisah dari login).
 *
 * Dulu 8. Angka itu hanya masuk akal kalau tiap pelapor punya IP sendiri,
 * padahal karyawan di pabrik keluar ke internet lewat satu IP kantor yang
 * sama — batasnya terbagi untuk seluruh kantor, dan pelapor kesembilan dalam
 * 15 menit ditolak walau baru mengirim sekali. Pembatas ini untuk menahan
 * banjir dari satu sumber, bukan menjatah tiap orang.
 */
export const ticketLimiter = createRateLimiter({
  maxAttempts: 60,
  windowMs: 15 * 60 * 1000,
});

/**
 * Lacak tiket publik: 30 pencarian / 5 menit per IP. Endpoint ini menerima
 * nomor tiket tanpa login, jadi tanpa batas ia bisa dipakai menebak nomor
 * tiket orang lain secara massal.
 */
export const trackLimiter = createRateLimiter({
  maxAttempts: 30,
  windowMs: 5 * 60 * 1000,
});

/**
 * Berapa proxy tepercaya yang berada TEPAT di depan aplikasi. Di Vercel = 1
 * (Vercel menimpa X-Forwarded-For kiriman klien, jadi hanya entri yang ia
 * tambahkan yang bisa dipercaya). Diubah lewat env bila di belakang reverse
 * proxy lain (mis. Cloudflare → Vercel = 2), supaya kunci rate-limit tetap
 * benar setelah pindah host — pertahanan tidak boleh bergantung pada satu
 * platform tertentu.
 */
const TRUSTED_PROXIES = Math.max(
  1,
  Number(process.env.RATE_LIMIT_TRUSTED_PROXIES) || 1
);

/**
 * IP klien untuk kunci rate-limit.
 *
 * SIGAP-01: JANGAN memakai entri paling KIRI X-Forwarded-For. XFF disusun
 * `klien, proxy1, proxy2, ...` dan tiap proxy MENAMBAH di sisi kanan, jadi
 * entri kiri adalah nilai yang ditulis pemanggil asli — bisa dipalsukan untuk
 * mereset kuota. Yang tepercaya adalah entri yang ditambahkan proxy tepercaya
 * terakhir, yaitu dihitung dari KANAN (TRUSTED_PROXIES entri dari belakang).
 *
 * Kalau header tidak ada atau lebih pendek dari yang diharapkan, jatuh ke
 * x-real-ip lalu "unknown" — semua klien berbagi satu keranjang, artinya
 * over-limit (aman), bukan bypass.
 */
export function clientIp(req: {
  headers: { get(name: string): string | null };
}): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) {
      const ip = parts[parts.length - TRUSTED_PROXIES];
      if (ip) return ip;
    }
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Portal pelapor: 40 pembukaan / 5 menit per IP.
 *
 * Endpoint portal dijaga token 256-bit, jadi menebaknya tidak realistis —
 * batas ini murni agar satu IP tidak bisa memakainya sebagai alat scraping
 * ketika sebuah token bocor (mis. link diteruskan ke grup WhatsApp).
 */
export const portalLimiter = createRateLimiter({
  maxAttempts: 40,
  windowMs: 5 * 60 * 1000,
});

/**
 * Balasan pelapor: 15 kiriman / 15 menit per IP per tiket.
 *
 * Kuncinya per tiket juga (lihat portal/reply) karena satu IP kantor dipakai
 * bersama seluruh karyawan — per IP saja membuat 15 balasan dibagi satu pabrik.
 */
export const replyLimiter = createRateLimiter({
  maxAttempts: 15,
  windowMs: 15 * 60 * 1000,
});

/**
 * Unggah lampiran publik: 12 berkas / 15 menit per IP.
 *
 * Ini satu-satunya jalan menulis ke Storage tanpa login, jadi batasnya lebih
 * ketat daripada endpoint publik lain: tiap panggilan yang lolos menaruh
 * objek permanen di bucket kita.
 */
export const publicUploadLimiter = createRateLimiter({
  maxAttempts: 12,
  windowMs: 15 * 60 * 1000,
});

/**
 * Konfirmasi email di halaman lacak: 8 percobaan / 15 menit per IP.
 *
 * Paling ketat di antara semua limiter publik. Endpoint ini menukar
 * "nomor tiket + email yang benar" dengan token portal — yaitu hak MEMBALAS
 * atas nama pelapor. Email karyawan mengikuti pola yang mudah ditebak
 * (nama.belakang@garudafood.co.id), jadi tanpa batas seketat ini, menebaknya
 * hanya soal waktu.
 */
export const verifyLimiter = createRateLimiter({
  maxAttempts: 8,
  windowMs: 15 * 60 * 1000,
});
