/**
 * `pnpm sigap:dev` — dev server dengan data aset lokal (bukan database asli).
 *
 * `.env.local` menunjuk ke database production, jadi data yang diinput saat
 * latihan atau seminar disimpan di laptop saja (lib/demo-aset.ts). Untuk
 * sesekali bekerja dengan data asli dari laptop:
 * `pnpm --filter @pinjamin/web dev:asli`.
 *
 * Variabel SIGAP_DEMO dipasang dari sini, bukan lewat `SIGAP_DEMO=1 next dev`
 * di package.json: penulisan itu tidak jalan di Command Prompt Windows.
 * Isi data dummy dan alasannya ada di lib/demo-aset.ts.
 */
import { spawn } from "node:child_process";

console.log(
  "\n[demo] Mode lokal aset: data disimpan di apps/pinjamin/data/demo-aset.json, bukan di database asli." +
    "\n[demo] Data tetap ada walau server dimatikan. Untuk mulai dari nol, hapus berkas itu." +
    "\n[demo] Login admin dan tiket helpdesk tetap memakai database asli.\n"
);

const anak = spawn("next", ["dev", "-H", "0.0.0.0", "-p", "5003"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, SIGAP_DEMO: "1" },
});
anak.on("exit", (kode) => process.exit(kode ?? 0));
