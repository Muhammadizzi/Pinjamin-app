import { NextRequest, NextResponse } from "next/server";
import { gateAssetAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  MODEL_FIELDS,
  fromDbRow,
  isUuid,
  pickAllowed,
  salinanDariModel,
} from "@/lib/resource-config";
import { removeByPublicUrl } from "@/lib/storage";
import { gambarMasihDipakai } from "@/lib/asset-image-refs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PG_UNIQUE = "23505";

/**
 * PATCH /api/data/asset-models/:id — ubah model, lalu SEMUA unitnya.
 *
 * Unit menyimpan salinan nama/kategori/spesifikasi/foto modelnya supaya
 * halaman publik, laporan, dan pencarian cukup membaca satu baris. Karena itu
 * setiap perubahan model langsung disebarkan ke unit-unitnya di sini.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await gateAssetAdmin(req);
  if (!gate.ok) return gate.res;

  const { id } = await ctx.params;
  if (!isUuid(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const patch = pickAllowed(body, MODEL_FIELDS);
  if ("name" in patch) {
    if (typeof patch.name !== "string" || !patch.name.trim()) {
      return NextResponse.json(
        { error: "Nama model wajib diisi." },
        { status: 400 }
      );
    }
    patch.name = patch.name.trim();
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  const { data: sebelum } = await supa
    .from("asset_models")
    .select("image")
    .eq("id", id)
    .maybeSingle();

  const { data: model, error } = await supa
    .from("asset_models")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === PG_UNIQUE) {
      return NextResponse.json(
        { error: "Nama model sudah dipakai." },
        { status: 409 }
      );
    }
    console.error("[asset-models PATCH]", error.message);
    return NextResponse.json(
      { error: "Gagal memperbarui model aset." },
      { status: 500 }
    );
  }

  const { error: errUnit } = await supa
    .from("assets")
    .update(salinanDariModel(model))
    .eq("asset_model_id", id);
  if (errUnit) {
    console.error("[asset-models PATCH] salin ke unit", errUnit.message);
    return NextResponse.json(
      { error: "Model tersimpan, tetapi unitnya gagal diperbarui." },
      { status: 500 }
    );
  }

  // Foto lama dibuang hanya bila tidak dirujuk siapa pun lagi.
  const fotoLama = (sebelum as { image?: string } | null)?.image;
  if (fotoLama && fotoLama !== model.image) {
    if (!(await gambarMasihDipakai(supa, fotoLama))) {
      await removeByPublicUrl([fotoLama]);
    }
  }

  return NextResponse.json({ data: fromDbRow(model) });
}

/**
 * DELETE /api/data/asset-models/:id — hanya model TANPA unit.
 *
 * FK assets.asset_model_id memakai ON DELETE RESTRICT, jadi database sendiri
 * pun menolak; pemeriksaan di sini memberi pesan yang bisa dibaca admin.
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await gateAssetAdmin(req);
  if (!gate.ok) return gate.res;

  const { id } = await ctx.params;
  if (!isUuid(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const supa = getSupabaseAdmin();
  if (!supa)
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );

  const { count, error: errHitung } = await supa
    .from("assets")
    .select("id", { count: "exact", head: true })
    .eq("asset_model_id", id);
  if (errHitung) {
    console.error("[asset-models DELETE] hitung unit", errHitung.message);
    return NextResponse.json(
      { error: "Gagal menghapus model aset." },
      { status: 500 }
    );
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Model masih punya unit. Hapus atau pindahkan unitnya dulu." },
      { status: 409 }
    );
  }

  const { data: sebelum } = await supa
    .from("asset_models")
    .select("image")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supa.from("asset_models").delete().eq("id", id);
  if (error) {
    console.error("[asset-models DELETE]", error.message);
    return NextResponse.json(
      { error: "Gagal menghapus model aset." },
      { status: 500 }
    );
  }

  const foto = (sebelum as { image?: string } | null)?.image;
  if (foto && !(await gambarMasihDipakai(supa, foto))) {
    await removeByPublicUrl([foto]);
  }
  return NextResponse.json({ ok: true });
}
