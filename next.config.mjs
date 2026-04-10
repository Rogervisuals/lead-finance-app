/** @type {import('next').NextConfig} */

/**
 * Allow next/image for Supabase Storage public URLs (e.g. invoice logos).
 * Hostname is derived from NEXT_PUBLIC_SUPABASE_URL so it matches each environment.
 */
function supabaseImageRemotePatterns() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return [];
  try {
    const u = new URL(supabaseUrl);
    const protocol = u.protocol.replace(":", "") === "http" ? "http" : "https";
    const pattern = {
      protocol,
      hostname: u.hostname,
      pathname: "/storage/v1/object/public/**",
    };
    if (u.port) {
      pattern.port = u.port;
    }
    return [pattern];
  } catch {
    return [];
  }
}

const nextConfig = {
  images: {
    remotePatterns: supabaseImageRemotePatterns(),
  },
};

export default nextConfig;
