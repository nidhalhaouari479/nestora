import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nestora",
    short_name: "Nestora",
    description: "Logements et parcours etudiant verifies.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f0e6",
    theme_color: "#103f54",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
