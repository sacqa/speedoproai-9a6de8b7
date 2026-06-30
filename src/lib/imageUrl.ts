/**
 * Transform a Supabase Storage public URL into the render endpoint with
 * width / quality params. Returns the original URL for non-Supabase sources.
 * Reduces payload dramatically for grid tiles and category icons.
 */
export function thumb(url?: string | null, width = 240, quality = 70): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith(".supabase.co")) return url;
    // /storage/v1/object/public/... -> /storage/v1/render/image/public/...
    if (u.pathname.includes("/storage/v1/object/public/")) {
      u.pathname = u.pathname.replace(
        "/storage/v1/object/public/",
        "/storage/v1/render/image/public/"
      );
      u.searchParams.set("width", String(width));
      u.searchParams.set("quality", String(quality));
      u.searchParams.set("resize", "contain");
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}