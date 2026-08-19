/**
 * Export Local Dummy Data (from seed.ts)
 * Run: npx tsx apps/pinjamin/scripts/export-local-data.ts
 * 
 * This generates a clean JSON you can:
 * - Save as backup
 * - Import later into Supabase (via custom script or manual)
 * - Use as reference before running full-setup.sql
 */

import { seedData } from "../lib/seed";
import fs from "fs";
import path from "path";

const outputDir = path.join(process.cwd(), "apps/pinjamin/data");
const outputFile = path.join(outputDir, "pinjamin-local-export.json");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const exportPayload = {
  _meta: {
    app: "Pinjamin",
    version: "1.0",
    exportedAt: new Date().toISOString(),
    source: "lib/seed.ts (local dummy data)",
    note: "This is the full local seed data. Use this if you want to preserve your local dummy data instead of (or in addition to) the Supabase seed in full-setup.sql"
  },
  data: seedData,
};

fs.writeFileSync(outputFile, JSON.stringify(exportPayload, null, 2));

console.log("✅ Local data exported successfully!");
console.log(`📁 File: ${outputFile}`);
console.log(`📊 Summary:`);
console.log(`   - Categories: ${seedData.categories.length}`);
console.log(`   - Assets: ${seedData.assets.length}`);
console.log(`   - Bookings: ${seedData.bookings.length}`);
console.log(`   - Custodians: ${seedData.custodians.length}`);
console.log(`   - Kits: ${seedData.kits.length}`);
console.log(`   - Audits: ${seedData.audits.length}`);
console.log("");
console.log("Next steps:");
console.log("1. The file is ready at apps/pinjamin/data/pinjamin-local-export.json");
console.log("2. You can now decide:");
console.log("   - Use the SQL seed (full-setup.sql) → faster for Supabase");
console.log("   - Or import this JSON later using a custom import script");
