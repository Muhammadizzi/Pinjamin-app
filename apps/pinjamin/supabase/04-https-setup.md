# HTTPS untuk Scanner (Kamera)

Browser **wajib HTTPS** untuk akses kamera (`getUserMedia`), kecuali `localhost`.

Kamu buka `http://0.0.0.0:5003/scanner` → Chrome/Safari blokir → error:
> `Camera streaming not supported by the browser — bukan HTTPS`

Pinjamin sudah di-fix agar **otomatis fallback** ke `Upload Gambar QR` + `Input Manual` jika tidak HTTPS, tapi untuk pakai **Scan Kamera** langsung, pakai salah satu cara:

## Opsi A — Paling Gampang (localhost)
Buka via `localhost`, bukan `0.0.0.0`:
```
http://localhost:5003/scanner
```
`localhost` dianggap *secure context* oleh browser → kamera jalan tanpa HTTPS.

## Opsi B — HTTPS Lokal (Next.js experimental-https)
Next 16 bisa generate cert self-signed otomatis:

```bash
# di root Pinjamin-app
pnpm --filter @pinjamin/web dev --experimental-https
# atau
cd apps/pinjamin && pnpm dlx next dev --experimental-https -H 0.0.0.0 -p 5003
```
Chrome akan warning `Your connection is not private` → klik **Advanced → Proceed to localhost**.

Kita sudah sediakan script:
```bash
pnpm pinjamin:dev:https   # akan kita tambahkan di package.json
```

## Opsi C — Preview Vercel / e2b (Sudah HTTPS)
Jika deploy ke Vercel atau buka preview e2b:
```
https://5003-xxxxx.e2b.app/scanner
```
Sudah HTTPS → kamera langsung jalan.

## Tambahan: Upload Gambar QR tetap jalan di http
Jika tetap di `http://0.0.0.0`, pakai **Upload Gambar QR** (foto QR dari galeri) → pakai `Html5Qrcode.scanFile` → tidak butuh kamera streaming.

## Verifikasi
Di scanner, ada badge:
- `Kamera aktif — arahkan ke QR` = berhasil
- `Butuh HTTPS` = buka via localhost/https atau pakai upload

## Update package.json (akan kami push)
```json
"pinjamin:dev:https": "next dev --experimental-https -H 0.0.0.0 -p 5003"
```
