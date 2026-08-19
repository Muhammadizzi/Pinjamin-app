import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Origin Supabase (kalau di-set) perlu masuk connect-src & img-src: client
 * mengambil foto aset dari Storage, dan upload anon memakai fetch ke origin
 * tersebut. Tanpa ini CSP memblokir keduanya.
 */
const supabaseOrigin = (() => {
  const raw =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  try {
    return raw ? new URL(raw).origin : "";
  } catch {
    return "";
  }
})();

/**
 * CSP pragmatis untuk Next.js App Router tanpa nonce:
 * - script-src butuh 'unsafe-inline' (bootstrap & flight data inline Next),
 *   dan 'unsafe-eval' HANYA di dev (react-refresh).
 * - style-src butuh 'unsafe-inline' (style injection Tailwind/next-themes).
 * - blob: dipakai html5-qrcode (scanner) & jspdf (export laporan).
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // 'wasm-unsafe-eval': decoder html5-qrcode memakai WebAssembly; tanpa ini
  // Chrome memblokir kompilasi WASM dan scanner QR mati.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${
    isProd ? "" : " 'unsafe-eval'"
  } blob:`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
  "manifest-src 'self'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // camera=self → scanner QR. Sisanya dimatikan.
    value:
      "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // HSTS hanya di production (di dev app bisa jalan via http://localhost).
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Respons API tidak boleh di-cache CDN/browser: semuanya
        // per-sesi (cookie admin) atau data yang berubah terus.
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
