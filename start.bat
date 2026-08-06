@echo off
chcp 65001 >nul
title Pinjamin - Start Dev Server
color 0B
echo ============================================================
echo  PINJAMIN - Start Dev Server
echo  Garuda Food - Smart Asset Lending
echo ============================================================
echo.

REM Cek pnpm
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] pnpm tidak ditemukan!
    echo Install dengan: npm install -g pnpm@9.15.9
    echo atau: corepack enable ^& corepack prepare pnpm@9.15.9 --activate
    pause
    exit /b 1
)

echo [*] Menjalankan Pinjamin di http://localhost:3000
echo     Login: adminsystem / admin123
echo     Stop: Ctrl + C
echo.
echo     Tips: jika 'No space left', jalankan install.bat dulu
echo ============================================================
echo.

REM Pakai pinjamin:dev (cepat, hanya 1 package)
pnpm pinjamin:dev

if %errorlevel% neq 0 (
    echo.
    echo [!] pnpm pinjamin:dev gagal, coba alternatif:
    echo     cd apps\pinjamin ^& pnpm dev
    echo     atau: pnpm dev:all  (semua apps, lebih lambat)
    pause
)
