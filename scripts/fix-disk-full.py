#!/usr/bin/env python3
"""
Pinjamin - FIX No space left on device (28)
Jalankan: python3 scripts/fix-disk-full.py
Atau: ./scripts/fix-disk-full.py
"""
import os, shutil, subprocess, platform, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]

def run(cmd):
    print(f"> {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    try:
        subprocess.run(cmd, shell=isinstance(cmd, str), cwd=str(ROOT))
        return True
    except Exception as e:
        print(f"  skip {e}")
        return False

def rm(p):
    path = ROOT / p if not os.path.isabs(p) else pathlib.Path(p)
    if path.exists():
        try:
            if path.is_dir():
                shutil.rmtree(path)
                print(f"  ✓ hapus dir {path}")
            else:
                path.unlink()
                print(f"  ✓ hapus file {path}")
        except Exception as e:
            print(f"  x gagal {path}: {e}")
    # else: silent

def disk():
    try:
        t,u,f = shutil.disk_usage(str(ROOT))
        print(f"\n💾 Disk free: {f/1024**3:.2f} GB / total {t/1024**3:.0f} GB")
        if f/1024**3 < 2:
            print("  ⚠️  <2GB! Harus kosongkan lagi")
        return f
    except: return 0

print("="*60)
print(" PINJAMIN - FIX No space left (28)")
print("="*60)
print(f"Root: {ROOT}")
disk()

print("\n[1] Hapus lockfile Next yang error")
for p in ["apps/pinjamin/.next/dev/lock", "apps/pinjamin/.next", "apps/webapp/.next", ".turbo", ".next", "node_modules/.cache"]:
    rm(p)

print("\n[2] Hapus cache pnpm/npm/yarn/turbo")
if shutil.which("pnpm"):
    run(["pnpm","store","prune"])
    rm(pathlib.Path.home() / ".pnpm-store")
if shutil.which("npm"):
    run(["npm","cache","clean","--force"])
if shutil.which("yarn"):
    run(["yarn","cache","clean"])

# pnpm cache folder
rm(pathlib.Path.home() / ".local/share/pnpm/store")
rm(pathlib.Path.home() / "Library/Caches/pnpm")
rm(pathlib.Path.home() / ".cache/pnpm")

print("\n[3] Hapus Xcode & iOS cache (MAC - besar!)")
home = pathlib.Path.home()
candidates = [
    home/"Library/Developer/Xcode/DerivedData",
    home/"Library/Developer/CoreSimulator/Caches",
    home/"Library/Caches",
    home/"Library/Application Support/Code/CachedData",
    home/"Library/Application Support/Code/Cache",
]
for c in candidates:
    if c.exists():
        try:
            size = sum(f.stat().st_size for f in c.rglob("*") if f.is_file())
            print(f"  - {c} : {size/1024**3:.2f} GB")
        except: pass

# Only auto-delete DerivedData (safe)
rm(home/"Library/Developer/Xcode/DerivedData")
rm(home/"Library/Caches/pnpm")
# Don't auto delete whole Library/Caches, just show

print("\n[4] Cek Trash")
trash = home/"Library/Mobile Documents/com~apple~CloudDocs/.Trash" if platform.system()=="Darwin" else None
print("  → Finder > Empty Trash manual (paling ampuh)")

print("\n[5] Cek folder besar di home")
try:
    out = subprocess.run(["du","-sh", str(home/"Library"), str(ROOT/"node_modules")], capture_output=True, text=True)
    print(out.stdout[:800])
except: pass

disk()

print("\n[6] Install ulang (tanpa download ulang jika sudah ada)")
if shutil.which("pnpm"):
    run(["pnpm","install", "--prefer-offline"])

print("\n[7] Coba build ringan")
run(["pnpm","--filter","@pinjamin/web","exec","next","--version"])

disk()
print("\n" + "="*60)
print("SELESAI — coba sekarang:")
print("  pnpm dev          # atau pnpm pinjamin:dev")
print("  Jika masih error, jalankan: df -h  dan kosongkan Download/Docker/Trash sampai Avail >5GB")
print("  Mac: About This Mac > Storage > Manage > hapus iOS Files, GarageBand, Cache")
print("="*60)
