const BUCKET = "invoice-logos";

/** Public URL for an object stored at `path` in the invoice-logos bucket. */
export function getInvoiceLogoPublicUrl(
  path: string | null | undefined
): string | null {
  const p = String(path ?? "").trim();
  if (!p) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const encodedPath = p
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${encodedPath}`;
}
