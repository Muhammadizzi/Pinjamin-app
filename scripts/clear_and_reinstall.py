#!/usr/bin/env python3
"""
Pinjamin - Clear cache & reinstall
Untuk error: No space left on device / lockfile / turbo cache
Pakai: python scripts/clear_and_reinstall.py  atau  double-click install.bat (Windows)
"""
import os
import sys
import shutil
import subprocess
import platform

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run(cmd, shell=False):
    print(f"\n> {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    try:
        result = subprocess.run(cmd, shell=shell, cwd=ROOT)
        return result.returncode == 0
    except Exception as e:
        print(f"  skip: {e}")
        return False

def rm(path):
    full = os.path.join(ROOT, path)
    if os.path.exists(full):
        try:
            if os.path.isdir(full):
                shutil.rmtree(full)
                print(f"  removed dir: {path}")
            else:
                os.remove(full)
                print(f"  removed file: {path}")
        except Exception as e:
            print(f"  gagal hapus {path}: {e}")
    else:
        print(f"  skip (tidak ada): {path}")

def check_disk():
    print("\n=== Cek Disk ===")
    try:
        total, used, free = shutil.disk_usage(ROOT)
        free_gb = free / (1024**3)
        print(f"  Free: {free_gb:.2f} GB")
        if free_gb < 2:
            print("  ⚠️  Sisa < 2GB! Kosongkan Trash / Download / Docker dulu.")
            print("  Mac: Finder > Empty Trash, hapus ~/Library/Developer/Xcode/DerivedData")
            print("  Win: Disk Cleanup, hapus %TEMP%")
        else:
            print("  ✅ Disk masih cukup")
        return free_gb
    except:
        pass
    return 999

def main():
    print("="*60)
    print(" PINJAMIN - Clear Cache & Reinstall")
    print("="*60)
    print(f" Root: {ROOT}")
    print(f" OS: {platform.system()} {platform.release()}")

    check_disk()

    print("\n=== 1. Stop dev server (jika jalan) ===")
    print("  Pastikan tidak ada 'pnpm dev' yang jalan. Tutup manual jika ada.")

    print("\n=== 2. Hapus cache Next/Turbo ===")
    for p in [
        "apps/pinjamin/.next",
        "apps/webapp/.next",
        "apps/docs/.vite",
        ".turbo",
        "node_modules/.cache",
        "apps/pinjamin/node_modules/.cache",
        "apps/webapp/node_modules/.cache",
        ".next",
    ]:
        rm(p)

    # pnpm store cache (optional, but helps disk)
    print("\n=== 3. Bersihkan pnpm store ===")
    if shutil.which("pnpm"):
        run(["pnpm", "store", "prune"])
    else:
        print("  pnpm tidak ditemukan, skip store prune")

    # npm cache
    if shutil.which("npm"):
        run(["npm", "cache", "clean", "--force"])

    print("\n=== 4. Bersihkan OS cache (opsional) ===")
    home = os.path.expanduser("~")
    if platform.system() == "Darwin":
        # macOS caches
        for p in [
            os.path.join(home, "Library/Caches/pnpm"),
            os.path.join(home, "Library/Developer/Xcode/DerivedData"),
        ]:
            if os.path.exists(p):
                print(f"  Ditemukan: {p} -> kosongkan manual jika mau (besar)")
    elif platform.system() == "Windows":
        temp = os.environ.get("TEMP", "")
        if temp and os.path.exists(temp):
            print(f"  TEMP: {temp} (bisa hapus via Disk Cleanup)")

    print("\n=== 5. Install ulang dependencies ===")
    if not shutil.which("pnpm"):
        print("  ❌ pnpm tidak ditemukan!")
        print("  Install dulu: npm install -g pnpm@9.15.9  atau  corepack enable")
        print("  Lalu: corepack prepare pnpm@9.15.9 --activate")
        sys.exit(1)

    print("  Menjalankan: pnpm install (butuh ~1-2 menit, sabar)...")
    ok = run(["pnpm", "install"])
    if not ok:
        print("\n  ❌ pnpm install gagal. Coba:")
        print("     - pnpm install --force")
        print("     - hapus pnpm-lock.yaml lalu pnpm install")
        sys.exit(1)

    print("\n=== 6. Verifikasi build Pinjamin ===")
    ok = run(["pnpm", "pinjamin:build"])
    if ok:
        print("  ✅ Build berhasil!")
    else:
        print("  ⚠️ Build gagal, tapi install sudah selesai. Coba pnpm pinjamin:dev langsung.")

    print("\n" + "="*60)
    print(" SELESAI ✅")
    print("="*60)
    print(" Jalankan:")
    print("   pnpm dev            -> hanya Pinjamin (cepat, port 3000)")
    print("   pnpm dev:all        -> semua apps (lambat)")
    print("   cd apps/pinjamin && pnpm dev  -> langsung Next tanpa turbo")
    print("")
    print(" Login: adminsystem / admin123")
    print(" Jika masih 'No space left', kosongkan disk dulu (df -h / dir C:)")
    print("="*60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nDibatalkan user")
        sys.exit(1)
