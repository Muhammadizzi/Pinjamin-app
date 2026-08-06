@echo off
chcp 65001 >nul
title Pinjamin - Install & Clear Cache
color 0A
echo ============================================================
echo  PINJAMIN - Install & Clear Cache (Windows)
echo  Untuk error: No space left on device / lockfile
echo ============================================================
echo.

REM Cek python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python tidak ditemukan!
    echo Install Python dari https://python.org lalu coba lagi
    pause
    exit /b 1
)

echo [*] Menjalankan scripts\clear_and_reinstall.py ...
python scripts\clear_and_reinstall.py
if %errorlevel% neq 0 (
    echo.
    echo [!] Gagal, coba manual:
    echo     pnpm store prune
    echo     rmdir /s /q apps\pinjamin\.next
    echo     rmdir /s /q .turbo
    echo     pnpm install
)

echo.
echo ============================================================
echo  Selesai. Tekan tombol untuk keluar...
pause >nul
