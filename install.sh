#!/bin/bash
# Pinjamin - Install & Clear Cache (Mac/Linux)
# Untuk error: No space left on device / lockfile
set -e
echo "============================================================"
echo " PINJAMIN - Install & Clear Cache (Mac/Linux)"
echo "============================================================"
echo ""

# cek python
if ! command -v python3 &> /dev/null; then
  echo "[!] python3 tidak ditemukan!"
  exit 1
fi

echo "[*] Menjalankan scripts/clear_and_reinstall.py ..."
python3 scripts/clear_and_reinstall.py
