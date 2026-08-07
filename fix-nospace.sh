#!/bin/bash
# FIX cepat tanpa Python
set -e
echo "🧹 Hapus lock & .next"
rm -rf apps/pinjamin/.next/dev/lock apps/pinjamin/.next apps/webapp/.next .turbo .next node_modules/.cache
echo "🧹 pnpm prune"
pnpm store prune 2>&1 | tail -n 5
echo "🧹 npm cache"
npm cache clean --force 2>&1 | tail -n 5
echo "💾 df -h"
df -h | head -n 10
echo ""
echo "▶️ Coba pnpm dev lagi"
echo "Jika masih penuh: Finder > Empty Trash, hapus ~/Library/Developer/Xcode/DerivedData"
