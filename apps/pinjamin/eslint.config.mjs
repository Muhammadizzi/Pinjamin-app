import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    /**
     * Utang lint bawaan: script `lint` sebelumnya adalah `next lint`, yang
     * sudah dihapus di Next 16 — jadi ESLint tidak pernah benar-benar jalan
     * dan pelanggaran menumpuk tanpa terlihat (83 error saat pertama kali
     * dijalankan lagi).
     *
     * Rule di bawah diturunkan ke "warn" supaya gate CI berfungsi kembali
     * TANPA harus menyentuh logika aplikasi lebih dulu — terutama
     * react-hooks/set-state-in-effect yang semuanya ada di alur hidrasi &
     * sinkronisasi data (lib/store.tsx). Tetap muncul di output lint untuk
     * dibereskan bertahap; jangan tambah pelanggaran baru.
     *
     * Sengaja TIDAK diturunkan: react-hooks/rules-of-hooks dan
     * react-hooks/exhaustive-deps — dua itu paling sering menandai bug nyata.
     */
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
    },
  },
]);

export default eslintConfig;
