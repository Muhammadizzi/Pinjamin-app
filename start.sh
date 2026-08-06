#!/bin/bash
# Pinjamin - Start Dev Server (Mac/Linux)
set -e
echo "============================================================"
echo " PINJAMIN - Start Dev Server"
echo " Garuda Food - Smart Asset Lending"
echo "============================================================"
echo ""

if ! command -v pnpm &> /dev/null; then
  echo "[!] pnpm tidak ditemukan!"
  echo "Install: npm install -g pnpm@9.15.9"
  echo "atau: corepack enable && corepack prepare pnpm@9.15.9 --activate"
  exit 1
fi

echo "[*] Menjalankan Pinjamin di http://localhost:3000"
echo "    Login: adminsystem / admin123"
echo "    Stop: Ctrl + C"
echo ""
echo "    Tips: jika 'No space left', jalankan ./install.sh atau python3 scripts/clear_and_reinstall.py"
echo "============================================================"
echo ""

pnpm pinjamin:dev
