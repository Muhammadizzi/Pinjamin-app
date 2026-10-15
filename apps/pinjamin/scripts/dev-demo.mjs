/**
 * `pnpm sigap:demo` — dev server dengan data dummy modul aset.
 *
 * Variabel SIGAP_DEMO dipasang dari sini, bukan lewat `SIGAP_DEMO=1 next dev`
 * di package.json: penulisan itu tidak jalan di Command Prompt Windows.
 * Isi data dummy dan alasannya ada di lib/demo-aset.ts.
 */
import { spawn } from "node:child_process";

console.log(
  "\n[demo] Mode demo aset: data dummy dari lib/demo-aset.ts." +
    "\n[demo] Tambah/edit/hapus aset tidak disimpan ke database dan hilang saat server dimatikan." +
    "\n[demo] Login admin dan tiket helpdesk tetap memakai database asli.\n"
);

const anak = spawn("next", ["dev", "-H", "0.0.0.0", "-p", "5003"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, SIGAP_DEMO: "1" },
});
anak.on("exit", (kode) => process.exit(kode ?? 0));
