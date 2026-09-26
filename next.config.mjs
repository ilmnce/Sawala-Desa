/** @type {import('next').NextConfig} */
const supabaseHost = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig = {
  images: {
    // Foto dokumentasi disajikan dari Supabase Storage. Hostname diambil dari
    // env sehingga tidak ada domain yang di-hardcode; ditambah wildcard agar
    // build tetap lolos saat env belum diisi (dev/demo).
    remotePatterns: [
      ...(supabaseHost
        ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/**" }]
        : []),
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/**" },
    ],
  },
};

export default nextConfig;