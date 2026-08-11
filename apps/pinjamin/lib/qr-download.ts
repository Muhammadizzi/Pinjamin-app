/**
 * Compose QR code (dari SVG yang sedang tampil di halaman) menjadi gambar PNG
 * siap cetak — desainnya mengikuti label referensi:
 *
 *   ┌──────────────────────┐
 *   │      Nama Aset       │   ← title (bold)
 *   │   ┌────────────┐     │
 *   │   │  QR  CODE  │     │
 *   │   └────────────┘     │
 *   │    PIN-XXXXXX        │   ← code (bold, mono)
 *   │    Garuda Food       │   ← org (bold)
 *   └──────────────────────┘
 *
 * Output `.png` resolusi tinggi (1080px) supaya hasil print tajam. Dipakai
 * tombol Download & Print di halaman detail aset & kit — keduanya memakai
 * renderer yang sama (print lewat iframe tersembunyi, bukan window.print(),
 * supaya yang tercetak hanya label QR-nya).
 */

export interface QrPngOptions {
  /** Selector CSS menuju `<svg>` QR, mis. "#asset-qr svg" */
  svgSelector: string;
  /** Teks kode QR, mis. "PIN-BRLY53ZS" */
  code: string;
  /** Nama aset / kit — tampil di atas QR */
  title?: string;
  /** Nama organisasi di bawah kode */
  org?: string;
  /** Nama file hasil download (default `${code}.png`) */
  filename?: string;
}

// --- Layout (px) ----------------------------------------------------------
const QR_PX = 720;
const PAD_X = 180; // margin samping sekaligus quiet zone QR
const W = QR_PX + PAD_X * 2; // 1080
const PAD_TOP = 64;

export async function downloadQrPng(opts: QrPngOptions): Promise<void> {
  const dataUrl = await renderQrPngDataUrl(opts);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = opts.filename || `${opts.code}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Print khusus label QR — pakai iframe tersembunyi agar popup blocker tak mengganggu. */
export async function printQrPng(opts: QrPngOptions): Promise<void> {
  const dataUrl = await renderQrPngDataUrl(opts);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) throw new Error("Tidak bisa membuat dokumen print");
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${
      opts.title || opts.code
    }</title><style>html,body{margin:0;padding:0}img{display:block;width:100%;max-width:560px;margin:0 auto}@page{margin:10mm}</style></head><body><img id="qr" src="${dataUrl}" alt="QR ${
      opts.code
    }" /></body></html>`
  );
  doc.close();

  const doPrint = () => {
    const win = iframe.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
    // Bersihkan iframe beberapa saat setelah dialog print selesai/ditutup
    win.onafterprint = () => setTimeout(() => iframe.remove(), 300);
    setTimeout(() => iframe.isConnected && iframe.remove(), 60_000);
  };

  const img = doc.getElementById("qr") as HTMLImageElement | null;
  if (img && !img.complete) {
    img.onload = () => setTimeout(doPrint, 50);
    img.onerror = () => setTimeout(doPrint, 50);
  } else {
    setTimeout(doPrint, 120);
  }
}

/** Render komposisi label QR ke data URL PNG. */
export async function renderQrPngDataUrl({
  svgSelector,
  code,
  title,
  org = "Garuda Food",
}: QrPngOptions): Promise<string> {
  if (typeof document === "undefined") throw new Error("Browser only");
  const svgEl = document.querySelector(svgSelector);
  if (!svgEl) throw new Error("Elemen QR tidak ditemukan di halaman");

  // SVG resolusi tinggi: set width/height eksplisit, viewBox menjaga ketajaman
  const clone = svgEl.cloneNode(true) as SVGElement;
  clone.setAttribute("width", String(QR_PX));
  clone.setAttribute("height", String(QR_PX));
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

  // Posisi vertikal: [title] QR code
  const hasTitle = !!title?.trim();
  const TITLE_Y = PAD_TOP + 40; // baseline title
  const qrY = hasTitle ? TITLE_Y + 46 : PAD_TOP;
  const CODE_Y = qrY + QR_PX + 64;
  const ORG_Y = CODE_Y + 58;
  const H = ORG_Y + 64;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D tidak tersedia di browser ini");

  // Kartu putih rounded + border tipis seperti referensi
  roundedRectPath(ctx, 0, 0, W, H, 40);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.save();
  roundedRectPath(ctx, 0, 0, W, H, 40);
  ctx.clip();

  ctx.drawImage(img, PAD_X, qrY, QR_PX, QR_PX);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const SANS =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

  if (hasTitle) {
    fitText(ctx, title!.trim(), W / 2, TITLE_Y, W - 2 * 96, 46, `${SANS}`, {
      weight: 600,
    });
  }
  ctx.fillStyle = "#0f172a";
  fitText(
    ctx,
    code,
    W / 2,
    CODE_Y,
    W - 2 * 80,
    54,
    `ui-monospace, Menlo, Monaco, Consolas, 'Courier New', monospace`,
    { weight: 700 }
  );
  fitText(ctx, org, W / 2, ORG_Y, W - 2 * 96, 44, SANS, { weight: 700 });
  ctx.restore();

  // Border tipis di tepi kartu
  roundedRectPath(ctx, 2, 2, W - 4, H - 4, 38);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3;
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar QR"));
    img.src = src;
  });
}

/** Tulis teks ter-center; kecilkan font bila kepanjangan, terakhir ellipsis. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  baseSize: number,
  family: string,
  { weight = 700, color = "#0f172a" }: { weight?: number; color?: string } = {}
) {
  let size = baseSize;
  ctx.fillStyle = color;
  const setFont = (s: number) => (ctx.font = `${weight} ${s}px ${family}`);
  setFont(size);
  while (ctx.measureText(text).width > maxWidth && size > 22) {
    size -= 2;
    setFont(size);
  }
  let out = text;
  while (ctx.measureText(out).width > maxWidth && out.length > 4) {
    out = out.slice(0, -2);
  }
  if (out !== text) out = out.replace(/\.+$/, "").trim() + "…";
  ctx.fillText(out, x, y);
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
