/**
 * Client-side image compression / resize.
 * - Decodes the image, draws to canvas at a max dimension,
 *   re-encodes as JPEG (or WebP if supported) at the given quality.
 * - Returns a new File with a sensible name & type.
 */
export async function compressImage(
  file: File,
  opts: { maxDimension?: number; quality?: number; mimeType?: string } = {},
): Promise<File> {
  const { maxDimension = 1280, quality = 0.78, mimeType = "image/jpeg" } = opts;
  if (!file.type.startsWith("image/")) return file;

  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  let { width, height } = img;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), mimeType, quality),
  );
  if (!blob) return file;

  // If compression made it bigger, return original
  if (blob.size >= file.size) return file;

  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.${ext}`, { type: mimeType });
}