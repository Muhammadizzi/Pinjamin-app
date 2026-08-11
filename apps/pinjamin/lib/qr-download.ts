/**
 * Compose QR code (dari SVG yang sedang tampil di halaman) menjadi gambar PNG
 * siap cetak — tampilannya meniru kartu QR di aplikasi: kotak putih rounded,
 * QR besar di tengah, kode QR di bawahnya, lalu caption kecil.
 *
 * Dipakai halaman detail aset & kit. Output `.png` (bukan `.svg`) dengan
 * resolusi tinggi (1240px) supaya hasil print tetap tajam.
 */

export interface QrPngOptions {
  /** Selector CSS menuju `<svg>` QR, mis. "#asset-qr svg" */
  svgSelector: string;
  /** Teks kode QR, mis. "PIN-BRLY53ZS" */
  code: string;
  /** Caption kecil di bawah kode */
  caption?: string;
  /** Nama file hasil download (default `${code}.png`) */
  filename?: string;
}

export async function downloadQrPng({
  svgSelector,
  code,
  caption = "Scan untuk aksi cepat",
  filename,
}: QrPngOptions): Promise<void> {
  if (typeof document === "undefined") return;
  const svgEl = document.querySelector(svgSelector);
  if (!svgEl) throw new Error("Elemen QR tidak ditemukan di halaman");

  // --- Siapkan SVG resolusi tinggi -------------------------------------
  const QR_PX = 900;
  const clone = svgEl.cloneNode(true) as SVGElement;
  clone.setAttribute("width", String(QR_PX));
  clone.setAttribute("height", String(QR_PX));
  // qrcode.react selalu menyertakan viewBox; tambahkan kalau sumber lain
  // tidak punya supaya bisa di-scale ke QR_PX tanpa pecah.
  if (!clone.getAttribute("viewBox")) {
    const sz =
      Number(svgEl.getAttribute("width")) ||
      Number(svgEl.getAttribute("height")) ||
      160;
    clone.setAttribute("viewBox", `0 0 ${sz} ${sz}`);
  }
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  const markup = new XMLSerializer().serializeToString(clone);
  const img = await loadImage(
    "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(markup)))
  );

  // --- Layout kanvas ----------------------------------------------------
  const PAD_X = 170; // margin samping = quiet zone QR (penting utk scanner)
  const PAD_TOP = 160;
  const W = QR_PX + PAD_X * 2; // 1240
  const CODE_Y = PAD_TOP + QR_PX + 100;
  const CAPTION_Y = CODE_Y + 64;
  const H = CAPTION_Y + 110;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D tidak tersedia di browser ini");

  // Kartu putih dengan sudut rounded (sudut transparan di PNG)
  roundedRectPath(ctx, 0, 0, W, H, 56);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.save();
  roundedRectPath(ctx, 0, 0, W, H, 56);
  ctx.clip();

  ctx.drawImage(img, PAD_X, PAD_TOP, QR_PX, QR_PX);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#0f172a";
  ctx.font =
    "700 58px ui-monospace, Menlo, Monaco, Consolas, 'Courier New', monospace";
  ctx.fillText(code, W / 2, CODE_Y);
  if (caption) {
    ctx.fillStyle = "#64748b";
    ctx.font =
      "400 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.fillText(caption, W / 2, CAPTION_Y);
  }
  ctx.restore();

  // --- Download ---------------------------------------------------------
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png")
  );
  if (!blob) throw new Error("Gagal membuat PNG dari canvas");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `${code}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Beri waktu browser memulai download sebelum URL dicabut
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar QR"));
    img.src = src;
  });
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
